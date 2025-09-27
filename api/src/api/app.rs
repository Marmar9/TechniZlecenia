// Entire app router

use crate::{
    api::{
        auth::{login, refresh, register},
        post,
        review,
        user,
    },
    server::auth::AccessToken,
};
use axum::{
    Router,
    extract::State,
    http::{HeaderValue, Method},
    routing::{delete, get, post as post_method, put},
};
use tower_http::{trace::TraceLayer, cors::{CorsLayer, AllowOrigin}};

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
                    .route("/{id}", put(post::update_post))
                    .route("/{id}", delete(post::delete_post)),
            )
            .nest(
                "/user",
                Router::new()
                    .route("/me", get(user::get_current_user)),
            )
            .nest(
                "/users",
                Router::new()
                    .route("/", get(user::get_all_users))
                    .route("/{id}", get(user::get_user_by_id))
                    .route("/{id}", put(user::update_user)),
            )
            .nest(
                "/reviews",
                Router::new()
                    .route("/", get(review::get_reviews))
                    .route("/", post_method(review::create_review))
                    .route("/stats/{id}", get(review::get_review_stats))
                    .route("/{id}", delete(review::delete_review)),
            )
            .route(
                "/test",
                get(
                    |State(_app): State<AppState>, token: AccessToken| async move {
                        token.sub.to_string()
                    },
                ),
            )
            .layer(
                CorsLayer::new()
                    .allow_origin(AllowOrigin::list(vec![
                        "https://oxylize.com".parse::<HeaderValue>().unwrap(),
                        "https://www.oxylize.com".parse::<HeaderValue>().unwrap(),
                        "http://localhost:3000".parse::<HeaderValue>().unwrap(),
                    ]))
                    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
                    .allow_headers([
                        axum::http::header::CONTENT_TYPE,
                        axum::http::header::AUTHORIZATION,
                        axum::http::header::HeaderName::from_static("x-requested-with"),
                    ])
                    .allow_credentials(true)
            )
            .layer(TraceLayer::new_for_http());

    router
}
