// Entire app router

use crate::{
    api::{
        app,
        auth::{login, refresh, register},
        post,
        user,
    },
    error::Result,
    server::auth::AccessToken,
};
use axum::{
    Router,
    extract::State,
    http::{StatusCode, HeaderValue, Method},
    routing::{delete, get, post as post_method},
};
use tower_http::{trace::TraceLayer, cors::CorsLayer};

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
            .nest(
                "/user",
                Router::new()
                    .route("/me", get(user::get_current_user)),
            )
            .route(
                "/test",
                get(
                    |State(app): State<AppState>, token: AccessToken| async move {
                        token.sub.to_string()
                    },
                ),
            )
            .layer(
                CorsLayer::new()
                    .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
                    .allow_origin("http://localhost:3001".parse::<HeaderValue>().unwrap())
                    .allow_origin("https://oxylize.com".parse::<HeaderValue>().unwrap())
                    .allow_origin("https://www.oxylize.com".parse::<HeaderValue>().unwrap())
                    .allow_origin("https://api.oxylize.com".parse::<HeaderValue>().unwrap())
                    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
                    .allow_headers([
                        axum::http::header::CONTENT_TYPE,
                        axum::http::header::AUTHORIZATION,
                    ])
                    .allow_credentials(false)
            )
            .layer(TraceLayer::new_for_http());

    router
}
