// Database functions for chat threads and messages

use crate::{
    error::Result,
    server::chat::{Message, MessageThread, MessageInfo, ThreadInfo},
};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Create a new chat thread between two users about a post
pub async fn create_thread(
    db: &PgPool,
    post_id: Uuid,
    user1: Uuid,
    user2: Uuid,
) -> Result<MessageThread> {
    // Ensure user_a < user_b for consistent ordering
    let (user_a, user_b) = if user1 < user2 {
        (user1, user2)
    } else {
        (user2, user1)
    };

    let thread = sqlx::query_as!(
        MessageThread,
        r#"
        INSERT INTO msg_threads (post_id, user_a, user_b)
        VALUES ($1, $2, $3)
        ON CONFLICT (post_id, user_a, user_b) DO UPDATE SET
            updated_at = NOW()
        RETURNING id, post_id, user_a, user_b, created_at, updated_at
        "#,
        post_id,
        user_a,
        user_b
    )
    .fetch_one(db)
    .await?;

    Ok(thread)
}

/// Get all threads for a user with post and other user info
pub async fn get_user_threads(db: &PgPool, user_id: Uuid) -> Result<Vec<ThreadInfo>> {
    struct ThreadQuery {
        id: Uuid,
        post_id: Uuid,
        post_title: String,
        other_user_id: Option<Uuid>,
        other_user_name: Option<String>,
        last_message: Option<String>,
        last_message_at: Option<DateTime<Utc>>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    }

    let threads = sqlx::query_as!(
        ThreadQuery,
        r#"
        SELECT 
            t.id,
            t.post_id,
            p.title as post_title,
            CASE 
                WHEN t.user_a = $1 THEN t.user_b 
                ELSE t.user_a 
            END as other_user_id,
            CASE 
                WHEN t.user_a = $1 THEN u_b.username 
                ELSE u_a.username 
            END as other_user_name,
            last_msg.content as last_message,
            last_msg.sent_at as last_message_at,
            t.created_at,
            t.updated_at
        FROM msg_threads t
        JOIN posts p ON t.post_id = p.id
        JOIN users u_a ON t.user_a = u_a.id
        JOIN users u_b ON t.user_b = u_b.id
        LEFT JOIN LATERAL (
            SELECT content, sent_at 
            FROM messages m 
            WHERE m.thread_id = t.id 
            ORDER BY m.sent_at DESC 
            LIMIT 1
        ) last_msg ON true
        WHERE t.user_a = $1 OR t.user_b = $1
        ORDER BY t.updated_at DESC
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    let thread_infos = threads
        .into_iter()
        .filter_map(|t| {
            // Skip threads where we couldn't determine the other user
            let other_user_id = t.other_user_id?;
            let other_user_name = t.other_user_name?;
            
            Some(ThreadInfo {
                id: t.id,
                post_id: t.post_id,
                post_title: t.post_title,
                other_user_id,
                other_user_name,
                last_message: t.last_message,
                last_message_at: t.last_message_at,
                created_at: t.created_at,
                updated_at: t.updated_at,
            })
        })
        .collect();

    Ok(thread_infos)
}

/// Get a specific thread by ID if user has access
pub async fn get_thread_by_id(db: &PgPool, thread_id: Uuid, user_id: Uuid) -> Result<Option<MessageThread>> {
    let thread = sqlx::query_as!(
        MessageThread,
        r#"
        SELECT id, post_id, user_a, user_b, created_at, updated_at
        FROM msg_threads
        WHERE id = $1 AND (user_a = $2 OR user_b = $2)
        "#,
        thread_id,
        user_id
    )
    .fetch_optional(db)
    .await?;

    Ok(thread)
}

/// Send a message in a thread
pub async fn send_message(
    db: &PgPool,
    thread_id: Uuid,
    sender_id: Uuid,
    content: String,
) -> Result<Message> {
    // Verify sender has access to this thread
    let thread_exists = sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
            SELECT 1 FROM msg_threads 
            WHERE id = $1 AND (user_a = $2 OR user_b = $2)
        )
        "#,
        thread_id,
        sender_id
    )
    .fetch_one(db)
    .await?
    .unwrap_or(false);

    if !thread_exists {
        return Err(crate::error::AppError::BadRequest("Thread not found or access denied".to_string()));
    }

    let message = sqlx::query_as!(
        Message,
        r#"
        INSERT INTO messages (thread_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, thread_id, sender_id, content, sent_at
        "#,
        thread_id,
        sender_id,
        content
    )
    .fetch_one(db)
    .await?;

    Ok(message)
}

/// Get messages for a thread with pagination
pub async fn get_thread_messages(
    db: &PgPool,
    thread_id: Uuid,
    user_id: Uuid,
    limit: i32,
    offset: i32,
) -> Result<Vec<MessageInfo>> {
    // Verify user has access to this thread
    let thread_exists = sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
            SELECT 1 FROM msg_threads 
            WHERE id = $1 AND (user_a = $2 OR user_b = $2)
        )
        "#,
        thread_id,
        user_id
    )
    .fetch_one(db)
    .await?
    .unwrap_or(false);

    if !thread_exists {
        return Err(crate::error::AppError::BadRequest("Thread not found or access denied".to_string()));
    }

    struct MessageQuery {
        id: Uuid,
        thread_id: Uuid,
        sender_id: Uuid,
        sender_name: String,
        content: String,
        sent_at: DateTime<Utc>,
    }

    let messages = sqlx::query_as!(
        MessageQuery,
        r#"
        SELECT 
            m.id,
            m.thread_id,
            m.sender_id,
            u.username as sender_name,
            m.content,
            m.sent_at
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.thread_id = $1
        ORDER BY m.sent_at DESC
        LIMIT $2 OFFSET $3
        "#,
        thread_id,
        limit as i64,
        offset as i64
    )
    .fetch_all(db)
    .await?;

    let message_infos = messages
        .into_iter()
        .map(|m| MessageInfo {
            id: m.id,
            thread_id: m.thread_id,
            sender_id: m.sender_id,
            sender_name: m.sender_name,
            content: m.content,
            sent_at: m.sent_at,
        })
        .collect();

    Ok(message_infos)
}

/// Get all thread IDs for a user (for setting up PostgreSQL LISTEN channels)
pub async fn get_user_thread_ids(db: &PgPool, user_id: Uuid) -> Result<Vec<Uuid>> {
    let thread_ids = sqlx::query_scalar!(
        r#"
        SELECT id FROM msg_threads
        WHERE user_a = $1 OR user_b = $1
        "#,
        user_id
    )
    .fetch_all(db)
    .await?;

    Ok(thread_ids)
}
