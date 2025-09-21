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
pub struct GetPostsResponse {
    pub posts: Vec<Post>,
}

#[derive(Debug, Serialize)]
pub struct GetPostResponse {
    pub post: Post,
}

#[derive(Debug, Serialize)]
pub struct CreatePostResponse {
    pub post: Post,
}

#[derive(Debug, Serialize)]
pub struct UpdatePostResponse {
    pub post: Post,
}

#[derive(Debug, Serialize)]
pub struct DeletePostResponse {
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub message: String,
}

impl GetPostsResponse {
    pub fn new(posts: Vec<Post>) -> Self {
        Self { posts }
    }
}

impl GetPostResponse {
    pub fn new(post: Post) -> Self {
        Self { post }
    }
}

impl CreatePostResponse {
    pub fn new(post: Post) -> Self {
        Self { post }
    }
}

impl UpdatePostResponse {
    pub fn new(post: Post) -> Self {
        Self { post }
    }
}

impl DeletePostResponse {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

impl ErrorResponse {
    pub fn new(message: String) -> Self {
        Self { message }
    }
}

// GET /posts - Get all posts with pagination
pub async fn get_posts(
    State(app): State<AppState>,
    Query(query): Query<GetPostsQuery>,
) -> impl IntoResponse {
    let db = &app.db;

    match db::posts::get_posts(db, query.page, query.per_page).await {
        Ok(posts) => (StatusCode::OK, Json(GetPostsResponse::new(posts))).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to fetch posts".to_string())),
        )
            .into_response(),
    }
}

// GET /posts/:id - Get a specific post by ID
pub async fn get_post_by_id(
    State(app): State<AppState>,
    Path(post_id): Path<Uuid>,
) -> impl IntoResponse {
    let db = &app.db;

    match db::posts::get_post_by_id(db, post_id).await {
        Ok(Some(post)) => (StatusCode::OK, Json(GetPostResponse::new(post))).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new("Post not found".to_string())),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to fetch post".to_string())),
        )
            .into_response(),
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
            Json(ErrorResponse::new("Title cannot be empty".to_string())),
        )
            .into_response();
    }

    if request.description.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Description cannot be empty".to_string())),
        )
            .into_response();
    }

    if let Ok(post) = db::posts::create_post(db, request.title, request.description, user_id).await
    {
        (StatusCode::CREATED, Json(CreatePostResponse::new(post))).into_response()
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to create post".to_string())),
        )
            .into_response()
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
            Json(ErrorResponse::new(
                "At least one field (title or description) must be provided for update".to_string(),
            )),
        )
            .into_response();
    }

    // Validate non-empty strings if provided
    if let Some(ref title) = request.title {
        if title.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new("Title cannot be empty".to_string())),
            )
                .into_response();
        }
    }

    if let Some(ref description) = request.description {
        if description.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new("Description cannot be empty".to_string())),
            )
                .into_response();
        }
    }

    match db::posts::update_post(db, request.id, request.title, request.description, user_id).await
    {
        Ok(Some(post)) => (StatusCode::OK, Json(UpdatePostResponse::new(post))).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new(
                "Post not found or you don't have permission to update it".to_string(),
            )),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to update post".to_string())),
        )
            .into_response(),
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
            Json(DeletePostResponse::new(
                "Post deleted successfully".to_string(),
            )),
        )
            .into_response(),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new(
                "Post not found or you don't have permission to delete it".to_string(),
            )),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::new("Failed to delete post".to_string())),
        )
            .into_response(),
    }
}
