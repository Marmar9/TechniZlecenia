// Functions for interacting with the posts table

use crate::{error::Result, server::post::Post};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub async fn get_posts(
    db: &PgPool,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Vec<Post>> {
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(10).min(100); // Cap at 100 posts per page
    let offset = page * per_page;

    let posts = sqlx::query_as!(
        Post,
        r#"
        SELECT 
            id, title, description, type, subject, 
            price, deadline, urgent, status,
            created_at, updated_at,
            owner_id, owner_name, owner_username, owner_email, 
            owner_avatar, owner_rating,
            view_count, response_count,
            location, preferred_contact_method, 
            academic_level, difficulty
        FROM posts
        WHERE status = 'active'
        ORDER BY urgent DESC, created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        per_page as i64,
        offset as i64
    )
        .fetch_all(db)
        .await?;

    Ok(posts)
}

pub async fn get_post_by_id(db: &PgPool, post_id: Uuid) -> Result<Option<Post>> {
    let post = sqlx::query_as!(
        Post,
        r#"
        SELECT 
            id, title, description, type, subject, 
            price, deadline, urgent, status,
            created_at, updated_at,
            owner_id, owner_name, owner_username, owner_email, 
            owner_avatar, owner_rating,
            view_count, response_count,
            location, preferred_contact_method, 
            academic_level, difficulty
        FROM posts
        WHERE id = $1
        "#,
        post_id
    )
        .fetch_optional(db)
        .await?;

    Ok(post)
}

pub async fn create_post(
    db: &PgPool,
    title: String,
    description: String,
    r#type: String,
    subject: String,
    price: rust_decimal::Decimal,
    deadline: Option<DateTime<Utc>>,
    urgent: bool,
    owner_id: Uuid,
    location: Option<String>,
    preferred_contact_method: Option<String>,
    academic_level: Option<String>,
    difficulty: Option<String>,
) -> Result<Post> {
    let post_id = Uuid::new_v4();

    // First get the user info to populate owner fields
    let user_info = sqlx::query!(
        "SELECT username, email, avatar FROM users WHERE id = $1",
        owner_id
    )
        .fetch_one(db)
        .await?;

    let post = sqlx::query_as!(
        Post,
        r#"
        INSERT INTO posts (
            id, title, description, type, subject, 
            price, deadline, urgent, owner_id,
            owner_name, owner_username, owner_email, owner_avatar,
            location, preferred_contact_method, academic_level, difficulty
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING 
            id, title, description, type, subject, 
            price, deadline, urgent, status,
            created_at, updated_at,
            owner_id, owner_name, owner_username, owner_email, 
            owner_avatar, owner_rating,
            view_count, response_count,
            location, preferred_contact_method, 
            academic_level, difficulty
        "#,
        post_id,
        title,
        description,
        r#type,
        subject,
        price,
        deadline,
        urgent,
        owner_id,
        user_info.username, // owner_name
        user_info.username, // owner_username
        user_info.email,    // owner_email
        user_info.avatar,   // owner_avatar
        location,
        preferred_contact_method,
        academic_level,
        difficulty
    )
        .fetch_one(db)
        .await?;

    Ok(post)
}

pub async fn update_post(
    db: &PgPool,
    post_id: Uuid,
    title: Option<String>,
    description: Option<String>,
    r#type: Option<String>,
    subject: Option<String>,
    price: Option<rust_decimal::Decimal>,
    deadline: Option<DateTime<Utc>>,
    urgent: Option<bool>,
    location: Option<String>,
    preferred_contact_method: Option<String>,
    academic_level: Option<String>,
    difficulty: Option<String>,
    owner_id: Uuid,
) -> Result<Option<Post>> {
    // Check if the post exists and belongs to the user
    let existing_post = sqlx::query!(
        "SELECT id FROM posts WHERE id = $1 AND owner_id = $2",
        post_id,
        owner_id
    )
        .fetch_optional(db)
        .await?;

    if existing_post.is_none() {
        return Ok(None);
    }

    // Build the update query dynamically
    let mut query_parts = Vec::new();
    let mut param_count = 3; // Starting after post_id and owner_id
    
    if title.is_some() {
        query_parts.push(format!("title = ${}", param_count));
        param_count += 1;
    }
    
    if description.is_some() {
        query_parts.push(format!("description = ${}", param_count));
        param_count += 1;
    }

    if r#type.is_some() {
        query_parts.push(format!("type = ${}", param_count));
        param_count += 1;
    }

    if subject.is_some() {
        query_parts.push(format!("subject = ${}", param_count));
        param_count += 1;
    }

    if price.is_some() {
        query_parts.push(format!("price = ${}", param_count));
        param_count += 1;
    }

    if deadline.is_some() {
        query_parts.push(format!("deadline = ${}", param_count));
        param_count += 1;
    }

    if urgent.is_some() {
        query_parts.push(format!("urgent = ${}", param_count));
        param_count += 1;
    }

    if location.is_some() {
        query_parts.push(format!("location = ${}", param_count));
        param_count += 1;
    }

    if preferred_contact_method.is_some() {
        query_parts.push(format!("preferred_contact_method = ${}", param_count));
        param_count += 1;
    }

    if academic_level.is_some() {
        query_parts.push(format!("academic_level = ${}", param_count));
        param_count += 1;
    }

    if difficulty.is_some() {
        query_parts.push(format!("difficulty = ${}", param_count));
        param_count += 1;
    }
    
    if query_parts.is_empty() {
        return Ok(get_post_by_id(db, post_id).await?);
    }
    
    let query_str = format!(
        r#"UPDATE posts SET {} 
           WHERE id = $1 AND owner_id = $2 
           RETURNING 
               id, title, description, type, subject, 
               price, deadline, urgent, status,
               created_at, updated_at,
               owner_id, owner_name, owner_username, owner_email, 
               owner_avatar, owner_rating,
               view_count, response_count,
               location, preferred_contact_method, 
               academic_level, difficulty"#,
        query_parts.join(", ")
    );
    
    let mut query = sqlx::query_as::<_, Post>(&query_str)
        .bind(post_id)
        .bind(owner_id);
    
    if let Some(title_val) = title {
        query = query.bind(title_val);
    }
    
    if let Some(description_val) = description {
        query = query.bind(description_val);
    }

    if let Some(type_val) = r#type {
        query = query.bind(type_val);
    }

    if let Some(subject_val) = subject {
        query = query.bind(subject_val);
    }

    if let Some(price_val) = price {
        query = query.bind(price_val);
    }

    if let Some(deadline_val) = deadline {
        query = query.bind(deadline_val);
    }

    if let Some(urgent_val) = urgent {
        query = query.bind(urgent_val);
    }

    if let Some(location_val) = location {
        query = query.bind(location_val);
    }

    if let Some(contact_val) = preferred_contact_method {
        query = query.bind(contact_val);
    }

    if let Some(level_val) = academic_level {
        query = query.bind(level_val);
    }

    if let Some(difficulty_val) = difficulty {
        query = query.bind(difficulty_val);
    }
    
    let updated_post = query.fetch_optional(db).await?;
    Ok(updated_post)
}

pub async fn delete_post(db: &PgPool, post_id: Uuid, owner_id: Uuid) -> Result<bool> {
    let result = sqlx::query!(
        "DELETE FROM posts WHERE id = $1 AND owner_id = $2",
        post_id,
        owner_id
    )
        .execute(db)
        .await?;

    Ok(result.rows_affected() > 0)
}

pub async fn get_posts_by_owner(db: &PgPool, owner_id: Uuid) -> Result<Vec<Post>> {
    let posts = sqlx::query_as!(
        Post,
        r#"
        SELECT 
            id, title, description, type, subject, 
            price, deadline, urgent, status,
            created_at, updated_at,
            owner_id, owner_name, owner_username, owner_email, 
            owner_avatar, owner_rating,
            view_count, response_count,
            location, preferred_contact_method, 
            academic_level, difficulty
        FROM posts
        WHERE owner_id = $1
        ORDER BY created_at DESC
        "#,
        owner_id
    )
        .fetch_all(db)
        .await?;

    Ok(posts)
}