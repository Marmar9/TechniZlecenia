use crate::common::env;
use crate::error::Result;
use axum::response::IntoResponse;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

impl AppState {
    pub async fn init() -> Result<Self> {
        let db = PgPool::connect(&env("DATABASE_URL")).await?;
        Ok(Self { db })
    }
}
