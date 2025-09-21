// Entire app router

use crate::{
    api::{
        app,
        auth::{login, refresh, register},
        post,
    },
    error::Result,
    server::auth::AccessToken,
};
use axum::{
    Router,
    extract::State,
    http::StatusCode,
    routing::{delete, get, post as post_method},
};
use tower_http::trace::TraceLayer;

use crate::app::AppState;

pub fn init_router() -> Router<AppState> {
    let router =
        Router::new()
            .nest(
                "/auth",
                Router::new()
                    .route("/register", post_method(register))
                    .route("/login", post_method(login))
                    .route("/refresh", post_method(refresh)),
            )
            .nest(
                "/posts",
                Router::new()
                    .route("/", get(post::get_posts))
                    .route("/{id}", get(post::get_post_by_id))
                    .route("/create", post_method(post::create_post))
                    .route("/update", post_method(post::update_post))
                    .route("/{id}", delete(post::delete_post)),
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
