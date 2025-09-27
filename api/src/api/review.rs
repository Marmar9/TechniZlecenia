use crate::{
    app::AppState,
    server::auth::AccessToken,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Review {
    pub id: Uuid,
    pub review_sender_id: Uuid,
    pub review_receiver_id: Uuid,
    pub score: i32,
    pub comment: Option<String>,
    pub review_type: String,
    pub post_id: Option<Uuid>,
    pub profile_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub sender_name: Option<String>,
    pub sender_username: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReviewRequest {
    pub review_receiver_id: Uuid,
    pub score: i32,
    pub comment: Option<String>,
    pub review_type: String,
    pub post_id: Option<Uuid>,
    pub profile_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct GetReviewsQuery {
    pub review_type: Option<String>,
    pub post_id: Option<Uuid>,
    pub profile_id: Option<Uuid>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn create_review(
    State(app_state): State<AppState>,
    AccessToken { sub: user_id, .. }: AccessToken,
    Json(payload): Json<CreateReviewRequest>,
) -> Result<Json<Review>, (StatusCode, String)> {
    // Validate score
    if payload.score < 1 || payload.score > 5 {
        return Err((StatusCode::BAD_REQUEST, "Score must be between 1 and 5".to_string()));
    }

    // Validate review type and corresponding ID
    match payload.review_type.as_str() {
        "post" => {
            if payload.post_id.is_none() {
                return Err((StatusCode::BAD_REQUEST, "post_id is required for post reviews".to_string()));
            }
            if payload.profile_id.is_some() {
                return Err((StatusCode::BAD_REQUEST, "profile_id should not be set for post reviews".to_string()));
            }
        }
        "profile" => {
            if payload.profile_id.is_none() {
                return Err((StatusCode::BAD_REQUEST, "profile_id is required for profile reviews".to_string()));
            }
            if payload.post_id.is_some() {
                return Err((StatusCode::BAD_REQUEST, "post_id should not be set for profile reviews".to_string()));
            }
        }
        _ => {
            return Err((StatusCode::BAD_REQUEST, "review_type must be 'post' or 'profile'".to_string()));
        }
    }

    // Prevent self-reviews
    if user_id == payload.review_receiver_id {
        return Err((StatusCode::BAD_REQUEST, "Cannot review yourself".to_string()));
    }

    // Check if review already exists using a single query
    let existing_review = sqlx::query!(
        "SELECT id FROM reviews WHERE review_sender_id = $1 AND review_receiver_id = $2 AND (($3::text = 'post' AND post_id = $4) OR ($3::text = 'profile' AND profile_id = $5))",
        user_id,
        payload.review_receiver_id,
        payload.review_type,
        payload.post_id,
        payload.profile_id
    )
    .fetch_optional(&app_state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing_review.is_some() {
        return Err((StatusCode::CONFLICT, "Review already exists".to_string()));
    }

    // Create the review
    let review = sqlx::query!(
        r#"
        INSERT INTO reviews (review_sender_id, review_receiver_id, score, comment, type, post_id, profile_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, review_sender_id, review_receiver_id, score, comment, type, post_id, profile_id, created_at, updated_at
        "#,
        user_id,
        payload.review_receiver_id,
        payload.score,
        payload.comment,
        payload.review_type,
        payload.post_id,
        payload.profile_id
    )
    .fetch_one(&app_state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get sender information
    let sender_info = sqlx::query!(
        "SELECT name, username FROM users WHERE id = $1",
        user_id
    )
    .fetch_optional(&app_state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let review_response = Review {
        id: review.id,
        review_sender_id: review.review_sender_id,
        review_receiver_id: review.review_receiver_id,
        score: review.score,
        comment: review.comment,
        review_type: review.r#type,
        post_id: review.post_id,
        profile_id: review.profile_id,
        created_at: review.created_at.unwrap_or_else(|| chrono::Utc::now()),
        updated_at: review.updated_at.unwrap_or_else(|| chrono::Utc::now()),
        sender_name: sender_info.as_ref().and_then(|s| s.name.clone()),
        sender_username: sender_info.as_ref().map(|s| s.username.clone()),
    };

    Ok(Json(review_response))
}

pub async fn get_reviews(
    State(app_state): State<AppState>,
    Query(params): Query<GetReviewsQuery>,
) -> Result<Json<Vec<Review>>, (StatusCode, String)> {
    let page = params.page.unwrap_or(0);
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = page * limit;

    let mut query_builder = sqlx::QueryBuilder::new(
        r#"
        SELECT r.id, r.review_sender_id, r.review_receiver_id, r.score, r.comment, 
               r.type, r.post_id, r.profile_id, r.created_at, r.updated_at,
               u.name as sender_name, u.username as sender_username
        FROM reviews r
        JOIN users u ON r.review_sender_id = u.id
        WHERE 1=1
        "#
    );

    if let Some(review_type) = &params.review_type {
        query_builder.push(" AND r.type = ");
        query_builder.push_bind(review_type);
    }

    if let Some(post_id) = &params.post_id {
        query_builder.push(" AND r.post_id = ");
        query_builder.push_bind(post_id);
    }

    if let Some(profile_id) = &params.profile_id {
        query_builder.push(" AND r.profile_id = ");
        query_builder.push_bind(profile_id);
    }

    query_builder.push(" ORDER BY r.created_at DESC");
    query_builder.push(" LIMIT ");
    query_builder.push_bind(limit);
    query_builder.push(" OFFSET ");
    query_builder.push_bind(offset);

    let rows = query_builder
        .build()
        .fetch_all(&app_state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let reviews: Vec<Review> = rows
        .into_iter()
        .map(|row| Review {
            id: row.get("id"),
            review_sender_id: row.get("review_sender_id"),
            review_receiver_id: row.get("review_receiver_id"),
            score: row.get("score"),
            comment: row.get("comment"),
            review_type: row.get("type"),
            post_id: row.get("post_id"),
            profile_id: row.get("profile_id"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            sender_name: row.get("sender_name"),
            sender_username: row.get("sender_username"),
        })
        .collect();

    Ok(Json(reviews))
}

pub async fn delete_review(
    State(app_state): State<AppState>,
    AccessToken { sub: user_id, .. }: AccessToken,
    Path(review_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // Check if review exists and belongs to the current user
    let review = sqlx::query!(
        "SELECT id FROM reviews WHERE id = $1 AND review_sender_id = $2",
        review_id,
        user_id
    )
    .fetch_optional(&app_state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if review.is_none() {
        return Err((StatusCode::NOT_FOUND, "Review not found or you don't have permission to delete it".to_string()));
    }

    // Delete the review
    sqlx::query!(
        "DELETE FROM reviews WHERE id = $1",
        review_id
    )
    .execute(&app_state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "message": "Review deleted successfully" })))
}

pub async fn get_review_stats(
    State(app_state): State<AppState>,
    Path(target_id): Path<Uuid>,
    Query(params): Query<GetReviewsQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let review_type = params.review_type.as_deref().unwrap_or("profile");
    
    let stats = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total_reviews,
            AVG(score) as average_score,
            COUNT(CASE WHEN score = 5 THEN 1 END) as five_stars,
            COUNT(CASE WHEN score = 4 THEN 1 END) as four_stars,
            COUNT(CASE WHEN score = 3 THEN 1 END) as three_stars,
            COUNT(CASE WHEN score = 2 THEN 1 END) as two_stars,
            COUNT(CASE WHEN score = 1 THEN 1 END) as one_star
        FROM reviews 
        WHERE (($1::text = 'post' AND post_id = $2) OR ($1::text = 'profile' AND profile_id = $2))
        "#,
        review_type,
        target_id
    )
    .fetch_one(&app_state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let response = serde_json::json!({
        "total_reviews": stats.total_reviews.unwrap_or(0),
        "average_score": stats.average_score.unwrap_or(rust_decimal::Decimal::new(0, 0)),
        "rating_breakdown": {
            "five_stars": stats.five_stars.unwrap_or(0),
            "four_stars": stats.four_stars.unwrap_or(0),
            "three_stars": stats.three_stars.unwrap_or(0),
            "two_stars": stats.two_stars.unwrap_or(0),
            "one_star": stats.one_star.unwrap_or(0)
        }
    });

    Ok(Json(response))
}
