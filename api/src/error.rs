use thiserror::Error;

use crate::server::credentials::CredentialError;

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("A generic error has occured {0}")]
    GenericError(#[from] Box<dyn std::error::Error + Send + Sync>),
    #[error("Sqlx Error: {0}")]
    SqlxError(#[from] sqlx::error::Error),
    #[error(transparent)]
    CredentialError(#[from] CredentialError),
    #[error("Migration Error: {0}")]
    MigrationError(#[from] sqlx::migrate::MigrateError),
    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("UUID parsing error: {0}")]
    UuidError(#[from] uuid::Error),
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Internal server error: {0}")]
    InternalServerError(String),
}
