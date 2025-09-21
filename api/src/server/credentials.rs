use std::marker::PhantomData;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use crate::server::auth::{Auth, PasswordHash, Salt};

#[derive(Debug, Error, Serialize)]
pub enum CredentialError {
    #[error("Invalid email")]
    InvalidEmail,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Email taken")]
    EmailTaken,
    #[error("Username taken")]
    UsernameTaken,
}

/// Valid credentials means that they have the right form, to see if credentials are matching get [`StoredCredentials`]
#[derive(Deserialize, Debug)]
pub struct Credentials<T = Invalid> {
    password: String,
    email: String,
    #[serde(skip)]
    phantom: PhantomData<T>,
}
#[derive(Debug, Deserialize)]
pub struct Invalid;

#[derive(Debug, Deserialize)]
pub struct Valid;

impl Credentials<Invalid> {
    pub fn validate(self) -> Result<Credentials<Valid>, CredentialError> {
        let (local, domain) = self
            .email
            .split_once('@')
            .ok_or(CredentialError::InvalidEmail)?;

        if local.is_empty() || !domain.eq_ignore_ascii_case("technischools.com") {
            return Err(CredentialError::InvalidEmail);
        }

        if self.password.is_empty() {
            return Err(CredentialError::InvalidPassword);
        }

        Ok(Credentials {
            phantom: PhantomData::<Valid>,
            password: self.password,
            email: self.email,
        })
    }
}

impl Credentials<Valid> {
    pub fn prepare(self) -> (String, PasswordHash, Salt) {
        let (hash, salt) = Auth::hash_password(self.password.into(), None);
        (self.email, hash, salt)
    }

    pub fn get_email(&self) -> String {
        self.email.clone()
    }
}

pub struct StoredCredentials {
    user_id: Uuid,
    password_hash: PasswordHash,
    salt: Salt,
}

impl StoredCredentials {
    pub fn new(user_id: Uuid, password_hash: PasswordHash, salt: Salt) -> Self {
        Self {
            user_id,
            password_hash,
            salt,
        }
    }

    pub fn check_credentials(self, credentials: Credentials<Valid>) -> Result<(), CredentialError> {
        let (password_hash, _) = Auth::hash_password(credentials.password.into(), Some(self.salt));

        if self.password_hash != password_hash {
            return Err(CredentialError::InvalidPassword);
        }

        Ok(())
    }
}
