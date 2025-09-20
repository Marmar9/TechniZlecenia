use crate::{
    common::ValidatedEmail,
    error::Result,
    server::{
        auth::{PasswordHash, RawCredentials, Salt},
        user::User,
    },
};

use axum::{extract::Query, routing::trace_service};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::server::auth::Credentials;

pub async fn get_credentials(db: &PgPool, raw_credentials: RawCredentials) -> Result<Credentials> {
    struct Query {
        id: Uuid,
        password_hash: PasswordHash,
        salt: Salt,
    }

    let query = sqlx::query_as!(
        Query,
        r#"
        select id, password_hash, salt from users where email = $1 limit 1;
        "#,
        raw_credentials.email
    )
    .fetch_one(db)
    .await?;

    Ok(Credentials::new(
        raw_credentials,
        query.password_hash,
        query.salt,
        query.id,
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

pub async fn is_email_taken(db: &PgPool, email: &ValidatedEmail) -> bool {
    sqlx::query_scalar!(
        r#"
        SELECT EXISTS (
            SELECT 1 
            FROM users 
            WHERE email = $1
        )
        "#,
        email.0
    )
    .fetch_one(db)
    .await
    .unwrap()
    .unwrap()
}

pub async fn add_user(
    db: &PgPool,
    email: ValidatedEmail,
    password_hash: PasswordHash,
    salt: Salt,
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

    let query = sqlx::query_as!(
        Query,
        r#"
        insert into users (email, username, salt, password_hash, avatar)
        values ($1, $2, $3, $4, null)
        RETURNING id, username, email, token_ver, created_at
        "#,
        email.0,
        username,
        &salt,
        &password_hash,
    )
    .fetch_one(db)
    .await?;

    tracing::info!("Created a user: {:?}", &query);

    Ok(())
}

// pub async fn insert_user() -> Result<Uuid> {}

// pub async fn get_user() -> Result<User> {}
