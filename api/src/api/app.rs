// Entire app router

use crate::{
    api::{
        app,
        auth::{login, refresh, register},
    },
    error::Result,
    server::auth::AccessToken,
};
use axum::{
    Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use tower_http::trace::TraceLayer;

use crate::app::AppState;

pub fn init_router() -> Router<AppState> {
    let router =
        Router::new()
            .nest(
                "/auth",
                Router::new()
                    .route("/register", post(register))
                    .route("/login", post(login))
                    .route("/refresh", post(refresh)),
            )
            .route(
                "/test",
                get(
                    |State(app): State<AppState>, token: AccessToken| async move {
                        token.sub.to_string()
                    },
                ),
            )
            .layer(TraceLayer::new_for_http());

    router
}
