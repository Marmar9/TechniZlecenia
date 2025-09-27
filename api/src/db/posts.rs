// Functions for interacting with the posts table

use crate::{error::Result, server::post::Post};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn get_posts(
    db: &PgPool,
    page: Option<i32>,
    per_page: Option<i32>,
) -> Result<Vec<Post>> {
    let page = page.unwrap_or(0);
    let per_page = per_page.unwrap_or(10).min(100); // Cap at 100 posts per page
    let offset = page * per_page;

    // First get posts
    let posts = sqlx::query!(
        r#"
        SELECT p.id, p.title, p.description, p.type, p.subject, p.price, p.deadline, p.urgent,
               p.status, p.created_at, p.updated_at, p.owner_id, p.view_count, p.response_count,
               p.location, p.preferred_contact_method, p.academic_level, p.difficulty
        FROM posts p
        ORDER BY p.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        per_page as i64,
        offset as i64
    )
        .fetch_all(db)
        .await?;

    // Get owner information for each post
    let mut full_posts = Vec::new();
    for post in posts {
        let owner_info = sqlx::query!(
            "SELECT username, email, avatar FROM users WHERE id = $1",
            post.owner_id
        )
        .fetch_one(db)
        .await?;

        let full_post = Post {
            id: post.id,
            title: post.title,
            description: post.description,
            r#type: post.r#type,
            subject: post.subject,
            price: post.price,
            deadline: post.deadline,
            urgent: post.urgent,
            status: post.status,
            created_at: post.created_at,
            updated_at: post.updated_at,
            owner_id: post.owner_id,
            owner_name: owner_info.username.clone(),
            owner_username: owner_info.username,
            owner_email: owner_info.email,
            owner_avatar: owner_info.avatar,
            owner_rating: rust_decimal::Decimal::new(0, 0), // Default rating
            view_count: post.view_count,
            response_count: post.response_count,
            location: post.location,
            preferred_contact_method: post.preferred_contact_method,
            academic_level: post.academic_level,
            difficulty: post.difficulty,
        };
        full_posts.push(full_post);
    }

    Ok(full_posts)
}

pub async fn get_post_by_id(db: &PgPool, post_id: Uuid) -> Result<Option<Post>> {
    let post = sqlx::query!(
        r#"
        SELECT p.id, p.title, p.description, p.type, p.subject, p.price, p.deadline, p.urgent,
               p.status, p.created_at, p.updated_at, p.owner_id, p.view_count, p.response_count,
               p.location, p.preferred_contact_method, p.academic_level, p.difficulty
        FROM posts p
        WHERE p.id = $1
        "#,
        post_id
    )
        .fetch_optional(db)
        .await?;

    if let Some(post) = post {
        let owner_info = sqlx::query!(
            "SELECT username, email, avatar FROM users WHERE id = $1",
            post.owner_id
        )
        .fetch_one(db)
        .await?;

        let full_post = Post {
            id: post.id,
            title: post.title,
            description: post.description,
            r#type: post.r#type,
            subject: post.subject,
            price: post.price,
            deadline: post.deadline,
            urgent: post.urgent,
            status: post.status,
            created_at: post.created_at,
            updated_at: post.updated_at,
            owner_id: post.owner_id,
            owner_name: owner_info.username.clone(),
            owner_username: owner_info.username,
            owner_email: owner_info.email,
            owner_avatar: owner_info.avatar,
            owner_rating: rust_decimal::Decimal::new(0, 0), // Default rating
            view_count: post.view_count,
            response_count: post.response_count,
            location: post.location,
            preferred_contact_method: post.preferred_contact_method,
            academic_level: post.academic_level,
            difficulty: post.difficulty,
        };
        Ok(Some(full_post))
    } else {
        Ok(None)
    }
}

pub async fn create_post(
    db: &PgPool,
    title: String,
    description: String,
    r#type: String,
    subject: String,
    price: rust_decimal::Decimal,
    deadline: Option<chrono::DateTime<chrono::Utc>>,
    urgent: bool,
    owner_id: Uuid,
    location: Option<String>,
    preferred_contact_method: Option<String>,
    academic_level: Option<String>,
    difficulty: Option<String>,
) -> Result<Post> {
    let post_id = Uuid::new_v4();

    // First, get owner information
    let owner_info = sqlx::query!(
        "SELECT username, email, avatar FROM users WHERE id = $1",
        owner_id
    )
    .fetch_one(db)
    .await?;

    let post = sqlx::query!(
        r#"
        INSERT INTO posts (
            id, title, description, type, subject, price, deadline, urgent, 
            owner_id, owner_name, owner_username, owner_email, owner_avatar,
            location, preferred_contact_method, academic_level, difficulty
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id, title, description, type, subject, price, deadline, urgent, 
                  status, created_at, updated_at, owner_id, view_count, response_count,
                  location, preferred_contact_method, academic_level, difficulty
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
        owner_info.username, // owner_name
        owner_info.username, // owner_username
        owner_info.email,    // owner_email
        owner_info.avatar,   // owner_avatar
        location,
        preferred_contact_method,
        academic_level,
        difficulty
    )
        .fetch_one(db)
        .await?;

    // Create the full Post struct with owner information
    let full_post = Post {
        id: post.id,
        title: post.title,
        description: post.description,
        r#type: post.r#type,
        subject: post.subject,
        price: post.price,
        deadline: post.deadline,
        urgent: post.urgent,
        status: post.status,
        created_at: post.created_at,
        updated_at: post.updated_at,
        owner_id: post.owner_id,
        owner_name: owner_info.username.clone(),
        owner_username: owner_info.username,
        owner_email: owner_info.email,
        owner_avatar: owner_info.avatar,
        owner_rating: rust_decimal::Decimal::new(0, 0), // Default rating
        view_count: post.view_count,
        response_count: post.response_count,
        location: post.location,
        preferred_contact_method: post.preferred_contact_method,
        academic_level: post.academic_level,
        difficulty: post.difficulty,
    };

    Ok(full_post)
}

pub async fn update_post(
    db: &PgPool,
    post_id: Uuid,
    title: Option<String>,
    description: Option<String>,
    r#type: Option<String>,
    subject: Option<String>,
    price: Option<rust_decimal::Decimal>,
    deadline: Option<chrono::DateTime<chrono::Utc>>,
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

    // Update the post with provided fields
    sqlx::query!(
        r#"
        UPDATE posts SET 
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            type = COALESCE($3, type),
            subject = COALESCE($4, subject),
            price = COALESCE($5, price),
            deadline = COALESCE($6, deadline),
            urgent = COALESCE($7, urgent),
            location = COALESCE($8, location),
            preferred_contact_method = COALESCE($9, preferred_contact_method),
            academic_level = COALESCE($10, academic_level),
            difficulty = COALESCE($11, difficulty),
            updated_at = NOW()
        WHERE id = $12 AND owner_id = $13
        "#,
        title,
        description,
        r#type,
        subject,
        price,
        deadline,
        urgent,
        location,
        preferred_contact_method,
        academic_level,
        difficulty,
        post_id,
        owner_id
    )
        .execute(db)
        .await?;

    // Return the updated post
    Ok(get_post_by_id(db, post_id).await?)
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

pub async fn get_posts_filtered(
    db: &PgPool,
    page: i32,
    per_page: i32,
    owner_id: Option<Uuid>,
) -> Result<Vec<Post>> {
    let offset = page * per_page;

    let posts = sqlx::query!(
        r#"
        SELECT p.id, p.title, p.description, p.type, p.subject, p.price, p.deadline, p.urgent,
               p.status, p.created_at, p.updated_at, p.owner_id, p.view_count, p.response_count,
               p.location, p.preferred_contact_method, p.academic_level, p.difficulty
        FROM posts p
        WHERE ($1::uuid IS NULL OR p.owner_id = $1)
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        owner_id,
        per_page as i64,
        offset as i64
    )
    .fetch_all(db)
    .await?;

    // Get owner information for each post and convert to full Post structs
    let mut full_posts = Vec::new();
    for post in posts {
        let owner_info = sqlx::query!(
            "SELECT username, email, avatar FROM users WHERE id = $1",
            post.owner_id
        )
        .fetch_one(db)
        .await?;

        let full_post = Post {
            id: post.id,
            title: post.title,
            description: post.description,
            r#type: post.r#type,
            subject: post.subject,
            price: post.price,
            deadline: post.deadline,
            urgent: post.urgent,
            status: post.status,
            created_at: post.created_at,
            updated_at: post.updated_at,
            owner_id: post.owner_id,
            owner_name: owner_info.username.clone(),
            owner_username: owner_info.username,
            owner_email: owner_info.email,
            owner_avatar: owner_info.avatar,
            owner_rating: rust_decimal::Decimal::new(0, 0), // Default rating
            view_count: post.view_count,
            response_count: post.response_count,
            location: post.location,
            preferred_contact_method: post.preferred_contact_method,
            academic_level: post.academic_level,
            difficulty: post.difficulty,
        };
        full_posts.push(full_post);
    }

    Ok(full_posts)
}
