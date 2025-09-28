use crate::common::env;
use crate::error::Result;
use crate::api::chat::ConnectionManager;
use sqlx::migrate::Migrator;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub connection_manager: ConnectionManager,
}

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

impl AppState {
    pub async fn init() -> Result<Self> {
        let url = env("DATABASE_URL");
        println!("Db url: {}", url);
        let db = PgPool::connect(&url).await?;

        MIGRATOR.run(&db).await?;
        
        // Initialize connection manager
        let connection_manager = crate::api::chat::create_connection_manager();
        
        Ok(Self { 
            db,
            connection_manager,
        })
    }
}
