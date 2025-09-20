use thiserror::Error;

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("A generic error has occured {0}")]
    GenericError(#[from] Box<dyn std::error::Error>),
    #[error("Sqlx Error: {0}")]
    SqlxError(#[from] sqlx::error::Error),
    #[error("Auth Error: {0}")]
    AuthError([#from] AuthError),
}
