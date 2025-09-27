// Post related endpoints

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::{
    app::AppState,
    db,
    server::{auth::AccessToken, post::Post},
};

#[derive(Debug, Deserialize)]
pub struct GetPostsQuery {
    pub page: Option<i32>,
    pub per_page: Option<i32>,
    pub owner_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePostRequest {
    pub title: String,
    pub description: String,
    pub r#type: String,
    pub subject: String,
    pub price: f64,
    pub deadline: Option<DateTime<Utc>>,
    pub urgent: bool,
    pub location: Option<String>,
    #[serde(rename = "preferredContactMethod")]
    pub preferred_contact_method: Option<String>,
    #[serde(rename = "academicLevel")]
    pub academic_level: Option<String>,
    pub difficulty: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub subject: Option<String>,
    pub price: Option<f64>,
    pub deadline: Option<DateTime<Utc>>,
    pub urgent: Option<bool>,
    pub location: Option<String>,
    #[serde(rename = "preferredContactMethod")]
    pub preferred_contact_method: Option<String>,
    #[serde(rename = "academicLevel")]
    pub academic_level: Option<String>,
    pub difficulty: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GetPostsResponse {
    pub posts: Vec<PostResponse>,
}

#[derive(Debug, Serialize)]
pub struct GetPostResponse {
    pub post: PostResponse,
}

#[derive(Debug, Serialize)]
pub struct CreatePostResponse {
    pub post: PostResponse,
}

#[derive(Debug, Serialize)]
pub struct UpdatePostResponse {
    pub post: PostResponse,
}

#[derive(Debug, Serialize)]
pub struct DeletePostResponse {
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub message: String,
}

// Response format that matches frontend expectations
#[derive(Debug, Serialize)]
pub struct PostResponse {
    pub id: String,
    pub title: String,
    pub description: String,
    pub r#type: String,
    pub subject: String,
    pub price: f64,
    pub deadline: Option<String>,
    pub urgent: bool,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    
    // Owner information
    pub owner_id: String,
    pub owner_name: String,
    pub owner_username: String,
    pub owner_avatar: Option<String>,
    pub owner_rating: f64,
    
    // Post metadata
    #[serde(rename = "viewCount")]
    pub view_count: i32,
    #[serde(rename = "responseCount")]
    pub response_count: i32,
    
    // Optional fields
    pub location: Option<String>,
    #[serde(rename = "preferredContactMethod")]
    pub preferred_contact_method: Option<String>,
    #[serde(rename = "academicLevel")]
    pub academic_level: Option<String>,
    pub difficulty: Option<String>,
}

impl From<Post> for PostResponse {
    fn from(post: Post) -> Self {
        Self {
            id: post.id.to_string(),
            title: post.title,
            description: post.description,
            r#type: post.r#type,
            subject: post.subject,
            price: post.price.to_string().parse().unwrap_or(0.0),
            deadline: post.deadline.map(|d| d.to_rfc3339()),
            urgent: post.urgent,
            status: post.status,
            created_at: post.created_at.to_rfc3339(),
            updated_at: post.updated_at.to_rfc3339(),
            owner_id: post.owner_id.to_string(),
            owner_name: post.owner_name,
            owner_username: post.owner_username,
            owner_avatar: None, // TODO: Convert bytea to base64 if needed
            owner_rating: post.owner_rating.to_string().parse().unwrap_or(4.5),
            view_count: post.view_count,
            response_count: post.response_count,
            location: post.location,
            preferred_contact_method: post.preferred_contact_method,
            academic_level: post.academic_level,
            difficulty: post.difficulty,
        }
    }
}

impl GetPostsResponse {
    pub fn new(posts: Vec<Post>) -> Self {
        Self { 
            posts: posts.into_iter().map(PostResponse::from).collect() 
        }
    }
}

impl GetPostResponse {
    pub fn new(post: Post) -> Self {
        Self { post: PostResponse::from(post) }
    }
}

impl CreatePostResponse {
    pub fn new(post: Post) -> Self {
        Self { post: PostResponse::from(post) }
    }
}

impl UpdatePostResponse {
    pub fn new(post: Post) -> Self {
        Self { post: PostResponse::from(post) }
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

    // Parse owner_id if provided
    let owner_uuid = if let Some(ref owner_id) = query.owner_id {
        match Uuid::parse_str(owner_id) {
            Ok(uuid) => Some(uuid),
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse::new("Invalid owner ID format".to_string())),
                )
                .into_response()
            }
        }
    } else {
        None
    };

    match db::posts::get_posts_filtered(db, query.page.unwrap_or(0), query.per_page.unwrap_or(10), owner_uuid).await {
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

    // Validation
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

    if !["request", "offer"].contains(&request.r#type.as_str()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Type must be 'request' or 'offer'".to_string())),
        )
            .into_response();
    }

    if request.subject.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Subject cannot be empty".to_string())),
        )
            .into_response();
    }

    if request.price < 0.0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new("Price cannot be negative".to_string())),
        )
            .into_response();
    }

    let price_decimal = rust_decimal::Decimal::from_f64_retain(request.price)
        .unwrap_or_else(|| rust_decimal::Decimal::new(0, 0));

    match db::posts::create_post(
        db,
        request.title,
        request.description,
        request.r#type,
        request.subject,
        price_decimal,
        request.deadline,
        request.urgent,
        user_id,
        request.location,
        request.preferred_contact_method,
        request.academic_level,
        request.difficulty,
    ).await {
        Ok(post) => (StatusCode::CREATED, Json(CreatePostResponse::new(post))).into_response(),
        Err(e) => {
            tracing::error!("Failed to create post: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to create post".to_string())),
            )
                .into_response()
        }
    }
}

// PUT /posts/:id - Update an existing post
pub async fn update_post(
    State(app): State<AppState>,
    token: AccessToken,
    Path(post_id): Path<Uuid>,
    Json(request): Json<UpdatePostRequest>,
) -> impl IntoResponse {
    let db = &app.db;
    let user_id = token.sub;

    // Validate that at least one field is being updated
    if request.title.is_none() 
        && request.description.is_none() 
        && request.r#type.is_none()
        && request.subject.is_none()
        && request.price.is_none()
        && request.deadline.is_none()
        && request.urgent.is_none()
        && request.location.is_none()
        && request.preferred_contact_method.is_none()
        && request.academic_level.is_none()
        && request.difficulty.is_none() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse::new(
                "At least one field must be provided for update".to_string(),
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

    if let Some(ref r#type) = request.r#type {
        if !["request", "offer"].contains(&r#type.as_str()) {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new("Type must be 'request' or 'offer'".to_string())),
            )
                .into_response();
        }
    }

    if let Some(ref subject) = request.subject {
        if subject.trim().is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new("Subject cannot be empty".to_string())),
            )
                .into_response();
        }
    }

    if let Some(price) = request.price {
        if price < 0.0 {
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse::new("Price cannot be negative".to_string())),
            )
                .into_response();
        }
    }

    let price_decimal = request.price.map(|p| {
        rust_decimal::Decimal::from_f64_retain(p)
            .unwrap_or_else(|| rust_decimal::Decimal::new(0, 0))
    });

    match db::posts::update_post(
        db, 
        post_id, 
        request.title, 
        request.description,
        request.r#type,
        request.subject,
        price_decimal,
        request.deadline,
        request.urgent,
        request.location,
        request.preferred_contact_method,
        request.academic_level,
        request.difficulty,
        user_id
    ).await {
        Ok(Some(post)) => (StatusCode::OK, Json(UpdatePostResponse::new(post))).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::new(
                "Post not found or you don't have permission to update it".to_string(),
            )),
        )
            .into_response(),
        Err(e) => {
            tracing::error!("Failed to update post: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse::new("Failed to update post".to_string())),
            )
                .into_response()
        }
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