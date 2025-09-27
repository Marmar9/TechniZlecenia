use crate::db;
use crate::server::credentials::CredentialError;
use crate::{
    common::env,
    error::{AppError, Result},
    server::credentials::{Credentials, Valid},
};
use argon2::{
    Argon2,
    password_hash::rand_core::{OsRng, RngCore},
};
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use jsonwebtoken::{DecodingKey, Validation};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sqlx::{PgPool, Postgres, Type, postgres::PgTypeInfo};
use std::{ops::Deref, sync::LazyLock};
use uuid::Uuid;

const HASH_LEN: usize = 32;

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
    pub sub: Uuid,
}

impl<'a> JwtToken<'a> for RefreshToken {}

impl RefreshToken {
    pub fn is_valid(&self) -> bool {
        self.exp > jsonwebtoken::get_current_timestamp() as usize
    }

    fn new(ver: Uuid, sub: Uuid) -> Self {
        Self {
            exp: jsonwebtoken::get_current_timestamp() as usize + 60 * 60 * 24 * 14, // 14 days
            ver,
            sub,
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
}

impl Auth {
    /// Takes in a refresh token and tries to mind a new access token from it.
    pub async fn mint_access_token(
        refresh_token: &RefreshToken,
        db: &PgPool,
    ) -> Result<AccessToken> {
        let token_ver = crate::db::users::get_token_version(db, refresh_token.sub).await?;
        if token_ver == refresh_token.ver && refresh_token.is_valid() {
            Ok(AccessToken::new(refresh_token.sub.clone()))
        } else {
            Err(AppError::GenericError(
                "Invalid token version or refresh token is expired".into(),
            ))
        }
    }

    /// Takes in credentials and attempts to create a refresh token for them
    /// invalidates refresh all refresh tokens
    pub async fn mint_refresh_token(
        credentials: Credentials<Valid>,
        db: &PgPool,
    ) -> Result<RefreshToken> {
        let user_id = db::users::get_user_id_by_email(db, credentials.get_email())
            .await
            .ok()
            .ok_or(CredentialError::InvalidEmail)?;

        let stored_credentials = db::users::get_stored_credentials(db, user_id).await?;

        let token_ver = db::users::update_token_ver(db, user_id).await?;

        stored_credentials.check_credentials(credentials)?;

        Ok(RefreshToken::new(token_ver, user_id))
    }
}
