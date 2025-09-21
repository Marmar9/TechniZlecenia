// User related endpoints

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    app::AppState,
    db,
    server::auth::AccessToken,
};

#[derive(Debug, Serialize)]
pub struct GetUserResponse {
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: Uuid,
    pub username: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub message: String,
}

impl GetUserResponse {
    pub fn new(user: UserInfo) -> Self {
        Self { user }
    }
}

impl ErrorResponse {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

// GET /user/me - Get current user information
pub async fn get_current_user(
    State(app): State<AppState>,
    token: AccessToken,
) -> impl IntoResponse {
    let db = &app.db;
    let user_id = token.sub;

    match db::users::get_user_by_id(db, user_id).await {
        Ok(Some(user)) => (StatusCode::OK, Json(GetUserResponse::new(user))).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("User not found".to_string())),
        )
        .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to fetch user".to_string())),
        )
        .into_response(),
    }
}


