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
    .unwrap()
    .unwrap()
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
    .unwrap()
    .unwrap()
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
            name: Some(user.username), // Use username as name for now
            email: user.email,
            rating: Some(4.5), // Default rating for now
            total_earnings: Some(0.0), // Default earnings
            completed_jobs: Some(0), // Default completed jobs
            join_date: Some(user.created_at.format("%B %Y").to_string()),
            subjects: Some(vec![]), // Default empty subjects
        }))
    } else {
        Ok(None)
    }
}
