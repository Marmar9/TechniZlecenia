// Removed unused imports
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{api::app::init_router, app::AppState};

mod api;
mod app;
mod common;
mod db;
mod error;
mod server;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                "info,techni-zlecenia-api=debug,tower_http=debug,axum=debug".into()
            }),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_target(true)
                .pretty()
                .compact(),
        )
        .init();

    let app_state = AppState::init()
        .await
        .map_err(|e| tracing::error!("App state initalization failed: {:?}", e))
        .unwrap();

    let app = init_router().with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Server up on 0.0.0.0:3000");

    axum::serve(listener, app).await.unwrap();
}
