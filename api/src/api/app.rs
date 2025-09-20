// Entire app router

use crate::{
    api::{app, auth::register, post},
    error::Result,
    server::auth::AccessToken,
};
use axum::{
    Router,
    extract::State,
    http::StatusCode,
    routing::{delete, get, post},
};
use tower_http::trace::TraceLayer;

use crate::app::AppState;

pub fn init_router() -> Router<AppState> {
    let router =
        Router::new()
            .nest("/auth", Router::new().route("/register", post(register)))
            .nest(
                "/posts", 
                Router::new()
                    .route("/", get(post::get_posts))
                    .route("/{id}", get(post::get_post_by_id))
                    .route("/create", post(post::create_post))
                    .route("/update", post(post::update_post))
                    .route("/{id}", delete(post::delete_post))
            )
            .route(
                "/login",
                get(|| async { (StatusCode::NO_CONTENT, "Login is not yet implemented") }),
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
