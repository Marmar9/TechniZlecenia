use crate::{
    error::Result,
    server::{
        auth::{PasswordHash, Salt},
        credentials::{CredentialError, Credentials, StoredCredentials, Valid},
    },
};

use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;
pub async fn get_stored_credentials(db: &PgPool, user_id: Uuid) -> Result<StoredCredentials> {
    struct Query {
        id: Uuid,
        password_hash: PasswordHash,
        salt: Salt,
    }

    let query = sqlx::query_as!(
        Query,
        r#"
        select id, password_hash, salt from users where id = $1 limit 1;
        "#,
        user_id
    )
    .fetch_one(db)
    .await?;

    Ok(StoredCredentials::new(
        query.id,
        query.password_hash,
        query.salt,
    ))
}

/// Updates the token version and returns it for the given user_id
pub async fn update_token_ver(db: &PgPool, user_id: Uuid) -> Result<Uuid> {
    let new_ver = Uuid::new_v4();
    sqlx::query!(
        r#"
        UPDATE users SET token_ver = $1 WHERE id = $2;
        "#,
        new_ver,
        user_id
    )
    .execute(db)
    .await?;
    Ok(new_ver)
}

/// Returns the token version for the provided user
pub async fn get_token_version(db: &PgPool, user_id: Uuid) -> Result<Uuid> {
    Ok(sqlx::query_scalar!(
        r#"
        SELECT token_ver FROM users WHERE id = $1
        "#,
        user_id
    )
    .fetch_one(db)
    .await?)
}

pub async fn is_username_taken(db: &PgPool, username: &String) -> bool {
    sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
            SELECT 1 
            FROM users 
            WHERE username = $1
        )
        "#,
        username
    )
    .fetch_one(db)
    .await
    .map(|result| result.unwrap_or(false))
    .unwrap_or_else(|err| {
        tracing::error!("Database error checking username availability: {}", err);
        false
    })
}

pub async fn is_email_taken(db: &PgPool, email: String) -> bool {
    sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
            SELECT 1  
            FROM users 
            WHERE email = $1
        )
        "#,
        email
    )
    .fetch_one(db)
    .await
    .map(|result| result.unwrap_or(false))
    .unwrap_or_else(|err| {
        tracing::error!("Database error checking email availability: {}", err);
        false 
    })
}

pub async fn add_user(
    db: &PgPool,
    credentials: Credentials<Valid>,
    username: String,
) -> Result<()> {
    #[derive(Debug)]
    struct Query {
        id: Uuid,
        username: String,
        email: String,
        token_ver: Uuid,
        created_at: DateTime<Utc>,
    }

    let (email, password, salt) = credentials.prepare();

    let query = sqlx::query_as!(
        Query,
        r#"
        insert into users (email, username, salt, password_hash, avatar)
        values ($1, $2, $3, $4, null)
        RETURNING id, username, email, token_ver, created_at
        "#,
        email,
        username,
        &salt,
        &password,
    )
    .fetch_one(db)
    .await?;

    tracing::info!("Created a user: {:?}", &query);

    Ok(())
}

pub async fn get_user_id_by_email(db: &PgPool, email: String) -> Result<Uuid> {
    Ok(sqlx::query_scalar!(
        r#"
        select id from users where email = $1;
        "#,
        email
    )
    .fetch_optional(db)
    .await?
    .ok_or(CredentialError::InvalidEmail)?)
}

use crate::api::user::UserInfo;

// Get user by ID for API responses (public information)
pub async fn get_user_by_id_public(db: &PgPool, user_id: Uuid) -> Result<Option<UserInfo>> {
    #[derive(Debug)]
    struct UserQuery {
        id: Uuid,
        username: String,
        email: String,
        created_at: DateTime<Utc>,
    }

    let user_query = sqlx::query_as!(
        UserQuery,
        r#"
        SELECT id, username, email, created_at
        FROM users
        WHERE id = $1
        "#,
        user_id
    )
    .fetch_optional(db)
    .await?;

    if let Some(user) = user_query {
        Ok(Some(UserInfo {
            id: user.id.to_string(),
            username: user.username.clone(),
            name: Some(user.username.clone()), // Use username as name
            email: user.email,
            subjects: Some(vec![]), // Default empty subjects
        }))
    } else {
        Ok(None)
    }
}

// Update user information
pub async fn update_user(
    db: &PgPool,
    user_id: Uuid,
    name: Option<String>,
    subjects: Option<Vec<String>>,
) -> Result<()> {
    // For now, we'll store name in the username field since we don't have a separate name column
    // and subjects as a JSON array in a subjects column (if it exists)
    
    if let Some(name) = name {
        sqlx::query!(
            r#"
            UPDATE users SET username = $1 WHERE id = $2
            "#,
            name,
            user_id
        )
        .execute(db)
        .await?;
    }

    // Note: For subjects, we would need to add a subjects column to the database
    // For now, we'll ignore subjects updates until the database schema is updated
    // TODO: Add subjects column to users table and implement subjects update
    let _ = subjects; // Suppress unused variable warning

    Ok(())
}

// Get all users (public information only)
pub async fn get_all_users_public(db: &PgPool) -> Result<Vec<crate::api::user::UserInfo>> {
    struct UserQuery {
        id: Uuid,
        username: String,
        email: String,
        created_at: DateTime<Utc>,
    }

    let users = sqlx::query_as!(
        UserQuery,
        r#"
        SELECT id, username, email, created_at
        FROM users
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(db)
    .await?;

    let user_infos = users
        .into_iter()
        .map(|user| crate::api::user::UserInfo {
            id: user.id.to_string(),
            username: user.username.clone(),
            name: Some(user.username.clone()), // Use username as name
            email: user.email,
            subjects: Some(vec![]), // Default empty subjects
        })
        .collect();

    Ok(user_infos)
}
