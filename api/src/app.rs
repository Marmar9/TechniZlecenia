use crate::common::env;
use crate::error::Result;
use axum::response::IntoResponse;
use sqlx::migrate::Migrator;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

impl AppState {
    pub async fn init() -> Result<Self> {
    
    let url = env("DATABASE_URL");
    println!("Db url: {}", url);
    let db = PgPool::connect(&url).await?;

    MIGRATOR.run(&db).await?;
    
    Ok(Self { db })

    }
}
