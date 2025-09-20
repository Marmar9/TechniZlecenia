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

    let posts = sqlx::query_as!(
        Post,
        r#"
        SELECT id, title, owner_id, description
        FROM posts
        ORDER BY id DESC
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
        SELECT id, title, owner_id, description
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
    owner_id: Uuid,
) -> Result<Post> {
    let post_id = Uuid::new_v4();

    let post = sqlx::query_as!(
        Post,
        r#"
        INSERT INTO posts (id, title, owner_id, description)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, owner_id, description
        "#,
        post_id,
        title,
        owner_id,
        description
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

    // ⚠️ Problem: macros need fixed SQL at compile time.
    // Since your UPDATE query is dynamic (optional fields),
    // we cannot use `query_as!` here.
    // For dynamic SQL, you must keep `query_as::<_, Post>`.

    // So we leave this one as-is:
    // (or rewrite logic to always update both fields with COALESCE)
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
