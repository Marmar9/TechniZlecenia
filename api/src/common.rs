
use std::env;
use crate::error::AppError;

pub fn env_var(var: &str) -> crate::error::Result<String> {
    // Try to get from environment first, then from .env file
    env::var(var)
        .or_else(|_| dotenv::var(var))
        .map_err(|_| AppError::InternalServerError(format!("Required environment variable '{}' is not set", var)))
}

pub fn env(var: &str) -> String {
    env_var(var).unwrap_or_else(|_| {
        tracing::error!("Missing required environment variable: {}", var);
        std::process::exit(1);
    })
}
