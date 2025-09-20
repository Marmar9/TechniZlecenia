// Post related endpoints

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    app::AppState,
    db,
    server::{auth::AccessToken, post::Post},
};

#[derive(Debug, Deserialize)]
pub struct GetPostsQuery {
    pub page: Option<i32>,
    pub per_page: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostRequest {
    pub id: Uuid,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PostResponse {
    pub success: bool,
    pub message: Option<String>,
    pub post: Option<Post>,
    pub posts: Option<Vec<Post>>,
}

impl PostResponse {
    pub fn success_with_post(post: Post) -> Self {
        Self {
            success: true,
            message: None,
            post: Some(post),
            posts: None,
        }
    }

    pub fn success_with_posts(posts: Vec<Post>) -> Self {
        Self {
            success: true,
            message: None,
            post: None,
            posts: Some(posts),
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            message: Some(message),
            post: None,
            posts: None,
        }
    }

    pub fn not_found() -> Self {
        Self {
            success: false,
            message: Some("Post not found".to_string()),
            post: None,
            posts: None,
        }
    }
}

// GET /posts - Get all posts with pagination
pub async fn get_posts(
    State(app): State<AppState>,
    Query(query): Query<GetPostsQuery>,
) -> impl IntoResponse {
    let db = &app.db;

    match db::posts::get_posts(db, query.page, query.per_page).await {
        Ok(posts) => (StatusCode::OK, Json(PostResponse::success_with_posts(posts))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PostResponse::error(format!("Failed to fetch posts: {}", e))),
        ),
    }
}

// GET /posts/:id - Get a specific post by ID
pub async fn get_post_by_id(
    State(app): State<AppState>,
    Path(post_id): Path<Uuid>,
) -> impl IntoResponse {
    let db = &app.db;

    match db::posts::get_post_by_id(db, post_id).await {
        Ok(Some(post)) => (StatusCode::OK, Json(PostResponse::success_with_post(post))),
        Ok(None) => (StatusCode::NOT_FOUND, Json(PostResponse::not_found())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PostResponse::error(format!("Failed to fetch post: {}", e))),
        ),
    }
}

// POST /posts/create - Create a new post
pub async fn create_post(
    State(app): State<AppState>,
    token: AccessToken,
    Json(request): Json<CreatePostRequest>,
) -> impl IntoResponse {
    let db = &app.db;
    let user_id = token.sub;

    if request.title.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(PostResponse::error("Title cannot be empty".to_string())),
        );
    }

    if request.description.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(PostResponse::error("Description cannot be empty".to_string())),
        );
    }

    match db::posts::create_post(db, request.title, request.description, user_id).await {
        Ok(post) => (
            StatusCode::CREATED,
            Json(PostResponse::success_with_post(post)),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PostResponse::error(format!("Failed to create post: {}", e))),
        ),
    }
}

// POST /posts/update - Update an existing post
pub async fn update_post(
    State(app): State<AppState>,
    token: AccessToken,
    Json(request): Json<UpdatePostRequest>,
) -> impl IntoResponse {
    let db = &app.db;
    let user_id = token.sub;

    // Validate that at least one field is being updated
    if request.title.is_none() && request.description.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(PostResponse::error(
                "At least one field (title or description) must be provided for update".to_string(),
            )),
        );
    }

    // Validate non-empty strings if provided
    if let Some(ref title) = request.title {
        if title.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(PostResponse::error("Title cannot be empty".to_string())),
            );
        }
    }

    if let Some(ref description) = request.description {
        if description.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(PostResponse::error("Description cannot be empty".to_string())),
            );
        }
    }

    match db::posts::update_post(db, request.id, request.title, request.description, user_id).await {
        Ok(Some(post)) => (StatusCode::OK, Json(PostResponse::success_with_post(post))),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(PostResponse::error(
                "Post not found or you don't have permission to update it".to_string(),
            )),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PostResponse::error(format!("Failed to update post: {}", e))),
        ),
    }
}

// DELETE /posts/:id - Delete a post
pub async fn delete_post(
    State(app): State<AppState>,
    token: AccessToken,
    Path(post_id): Path<Uuid>,
) -> impl IntoResponse {
    let db = &app.db;
    let user_id = token.sub;

    match db::posts::delete_post(db, post_id, user_id).await {
        Ok(true) => (
            StatusCode::OK,
            Json(PostResponse {
                success: true,
                message: Some("Post deleted successfully".to_string()),
                post: None,
                posts: None,
            }),
        ),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(PostResponse::error(
                "Post not found or you don't have permission to delete it".to_string(),
            )),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PostResponse::error(format!("Failed to delete post: {}", e))),
        ),
    }
}
