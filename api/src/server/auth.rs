use crate::{
    common::env,
    db::users::get_credentials,
    error::{AppError, Result},
};
use argon2::{
    Argon2,
    password_hash::rand_core::{OsRng, RngCore},
};
use async_trait::async_trait;
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use chrono::Utc;
use core::error;
use jsonwebtoken::{DecodingKey, Validation};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sqlx::{PgPool, Pool, Postgres, Type, postgres::PgTypeInfo};
use std::{ops::Deref, os::linux::raw, sync::LazyLock};
use thiserror::Error;
use uuid::Uuid;

const HASH_LEN: usize = 32;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Blocked domain: {0}")]
    EmailDomainError(String),
    #[error("{0} Expired")]
    ExpiredToken(#[from] TokenKind),
    #[error("Invalid Credentials")]
    InvalidCredentials {},
}

#[derive(Debug, Error)]
pub enum TokenKind {
    #[error("Access Token")]
    Access,
    #[error("Refresh Token")]
    Refresh,
}

#[derive(Clone, sqlx::Decode, sqlx::Encode, Debug, PartialEq, Eq)]
pub struct PasswordHash(Vec<u8>);

impl Deref for PasswordHash {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<Vec<u8>> for PasswordHash {
    fn from(value: Vec<u8>) -> Self {
        Self(value)
    }
}

impl Type<Postgres> for PasswordHash {
    fn type_info() -> <Postgres as sqlx::Database>::TypeInfo {
        PgTypeInfo::with_name("bytea")
    }
}

#[derive(Clone, sqlx::Decode, sqlx::Encode, Debug)]
pub struct Salt(Vec<u8>);

impl Deref for Salt {
    type Target = [u8];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Type<Postgres> for Salt {
    fn type_info() -> <Postgres as sqlx::Database>::TypeInfo {
        PgTypeInfo::with_name("bytea")
    }
}

impl From<Vec<u8>> for Salt {
    fn from(value: Vec<u8>) -> Self {
        Self(value)
    }
}

pub static HASH: LazyLock<Argon2> = LazyLock::new(|| Argon2::default());

// Helper trait for JWT's
pub trait JwtToken<'a>: Serialize + DeserializeOwned {
    fn header() -> jsonwebtoken::Header {
        jsonwebtoken::Header::default()
    }

    fn try_encode(&self, secret: String) -> Option<String> {
        jsonwebtoken::encode(
            &Self::header(),
            &self,
            &jsonwebtoken::EncodingKey::from_base64_secret(&secret).expect("oj bombo"),
        )
        .ok()
    }

    fn try_decode(token: &str, secret: String) -> Option<Self> {
        let validation = Validation::default();
        jsonwebtoken::decode::<Self>(
            token,
            &DecodingKey::from_base64_secret(&secret).expect("oj bombo"),
            &validation,
        )
        .ok()
        .map(|data| data.claims)
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccessToken {
    exp: usize,    // Epoch expirationa
    pub sub: Uuid, // user_id
}

impl<'a> JwtToken<'a> for AccessToken {}

impl AccessToken {
    pub fn is_valid(&self) -> bool {
        self.exp > jsonwebtoken::get_current_timestamp() as usize
    }

    fn new(user_id: Uuid) -> Self {
        Self {
            sub: user_id,
            exp: jsonwebtoken::get_current_timestamp() as usize + 60 * 15, // 15m
        }
    }
}

impl<S> FromRequestParts<S> for AccessToken
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> std::result::Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|hv| hv.to_str().ok());

        if let Some(header) = auth_header {
            if let Some(token) = header.strip_prefix("Bearer ") {
                let secret = env("ACCESS_TOKEN_SECRET");
                if let Some(token) = AccessToken::try_decode(token, secret) {
                    if token.is_valid() {
                        return Ok(token);
                    } else {
                        return Err((StatusCode::UNAUTHORIZED, "Token invalid"));
                    };
                };
            };
        };

        Err((StatusCode::UNAUTHORIZED, "Missing or invalid auth header"))
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RefreshToken {
    pub exp: usize, // Epoch expiration
    pub ver: Uuid,  // token verison
}

impl<'a> JwtToken<'a> for RefreshToken {}

impl RefreshToken {
    pub fn is_valid(&self) -> bool {
        self.exp > jsonwebtoken::get_current_timestamp() as usize
    }

    fn new(ver: Uuid) -> Self {
        Self {
            exp: jsonwebtoken::get_current_timestamp() as usize + 60 * 24 * 14, // 14 days
            ver,
        }
    }
}

/// wrapper for user credentials
/// does not guarantee that the credentials inside are valid ones
/// this is returned when you query the db for credentials
pub struct Credentials {
    user_id: Uuid,               // users id
    password_hash: PasswordHash, // the password in the db
    password_raw: Vec<u8>,       // raw password from the request
    salt: Salt,                  // salt from the db
}

impl Credentials {
    pub fn new(
        raw_creds: RawCredentials,
        password_hash: PasswordHash,
        salt: Salt,
        user_id: Uuid,
    ) -> Self {
        Self {
            user_id,
            salt,
            password_hash,
            password_raw: raw_creds.password,
        }
    }
}

/// wrapper for raw unidentified credentials, no checks or anything
/// use `RawCredentials::process()` to verify the email, hash
/// the password using the user data from the verfied email
/// and return it as Credentials
pub struct RawCredentials {
    password: Vec<u8>,
    pub email: String,
}

impl RawCredentials {
    pub async fn process(self, db: &PgPool) -> Result<Credentials> {
        get_credentials(db, self).await
    }
    pub fn new(email: String, password: String) -> Self {
        Self {
            email,
            password: password.into_bytes(),
        }
    }
}

pub struct Auth;

impl Auth {
    /// Takes a password and hashes it
    /// using the server pepper
    /// and a salt that is either provided or generated
    /// returns the HashedPassword and the Salt that was used.
    pub fn hash_password(password: Vec<u8>, salt: Option<Salt>) -> (PasswordHash, Salt) {
        let prepared_password = {
            let pepper_env = env("SERVER_PEPPER");
            let pepper = pepper_env.into_bytes();
            let mut password = password.clone();
            password.extend(pepper.into_iter());

            password
        };

        let salt = {
            if let Some(salt) = salt {
                salt
            } else {
                let mut buf = [0u8; argon2::RECOMMENDED_SALT_LEN];
                OsRng.fill_bytes(&mut buf);
                Salt(buf.to_vec())
            }
        };

        let password_hash = {
            let mut buf = [0u8; HASH_LEN];
            HASH.hash_password_into(&prepared_password, &*salt, &mut buf);
            PasswordHash(buf.to_vec())
        };

        (password_hash, salt)
    }

    /// Validates the raw password from credentials
    pub fn validate_password(creds: Credentials) -> bool {
        let (hash, _) = Self::hash_password(creds.password_raw, Some(creds.salt));
        *hash == *creds.password_hash
    }
}

impl Auth {
    /// Takes in a refresh token and tries to mind a new access token from it.
    pub async fn mint_access_token(
        refresh_token: RefreshToken,
        user_id: Uuid,
        db: &PgPool,
    ) -> Result<AccessToken> {
        let token_ver = crate::db::users::get_token_version(db, user_id).await?;
        if token_ver == refresh_token.ver && refresh_token.is_valid() {
            Ok(AccessToken::new(user_id))
        } else {
            Err(AppError::GenericError(
                "Invalid token version or refresh token is expired".into(),
            ))
        }
    }

    /// Takes in credentials and attempts to create a refresh token for them
    /// invalidates refresh all refresh tokens
    pub async fn mint_refresh_token(
        raw_creds: RawCredentials,
        db: &PgPool,
    ) -> Result<RefreshToken> {
        let creds = raw_creds.process(db).await?;
        let token_ver = crate::db::users::update_token_ver(db, creds.user_id).await?;
        let (password_hash, _) = Auth::hash_password(creds.password_raw, Some(creds.salt));
        if creds.password_hash == password_hash {
            Ok(RefreshToken::new(token_ver))
        } else {
            Err(AppError::GenericError("Passwords do not match".into()))
        }
    }
}
