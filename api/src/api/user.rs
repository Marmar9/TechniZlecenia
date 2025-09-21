// User related endpoints

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;
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
    pub id: String,
    pub username: String,
    pub name: Option<String>,
    pub email: String,
    pub rating: Option<f64>,
    #[serde(rename = "totalEarnings")]
    pub total_earnings: Option<f64>,
    #[serde(rename = "completedJobs")]
    pub completed_jobs: Option<i32>,
    #[serde(rename = "joinDate")]
    pub join_date: Option<String>,
    pub subjects: Option<Vec<String>>,
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

    match db::users::get_user_by_id_public(db, user_id).await {
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

// GET /users/{id} - Get user information by ID (public information only)
pub async fn get_user_by_id(
    State(app): State<AppState>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let db = &app.db;
    
    // Parse UUID from string
    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new("Invalid user ID format".to_string())),
            )
            .into_response()
        }
    };

    match db::users::get_user_by_id_public(db, user_uuid).await {
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


