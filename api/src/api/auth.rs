use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use axum_extra::extract::{cookie::Cookie, CookieJar};
use serde::{Deserialize, Serialize};

use crate::{app::AppState, common::ValidatedEmail, db, server::auth::{Auth, RawCredentials}};


const REFRESH_COOKIE_IDENT: &str = "refresh_token";

fn build_refresh_cookie(token: String) -> Cookie<'static> {
    Cookie::build((REFRESH_COOKIE_IDENT, token))
    .http_only(true)
    .secure(true)
    .same_site(axum_extra::extract::cookie::SameSite::Strict)
    .path("/auth/refresh")
    .build()
}


#[derive(Debug, Deserialize)]
pub struct RegisterData {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Serialize, Debug, Default)]
pub struct RegisterResp {
    email_taken: bool,
    username_taken: bool,
    bad_email: bool,
    msg: Option<String>,
}

pub async fn register(
    State(app): State<AppState>,
    Json(data): Json<RegisterData>,
) -> impl IntoResponse {
    let db = &app.db;

    let email = match ValidatedEmail::new(&data.email) {
        Ok(email) => email,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(RegisterResp {
                    bad_email: true,
                    ..Default::default()
                }),
            );
        }
    };

    let (email_taken, username_taken) = tokio::join!(
        db::users::is_email_taken(db, &email),
        db::users::is_username_taken(db, &data.username)
    );

    if email_taken || username_taken {
        return (
            StatusCode::BAD_REQUEST,
            Json(RegisterResp {
                email_taken,
                username_taken,
                ..Default::default()
            }),
        );
    }

    let (password_hash, salt) = Auth::hash_password(data.password.into_bytes(), None);

    match db::users::add_user(db, email, password_hash, salt, data.username).await {
        Ok(_) => (
            StatusCode::CREATED,
            Json(RegisterResp {
                msg: Some("User created successfully".into()),
                ..Default::default()
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(RegisterResp {
                msg: Some(e.to_string()),
                ..Default::default()
            }),
        ),
    }
}

#[derive(Deserialize)]
struct LoginData {
    email: String,
    password: String
}

#[derive(Serialize)]
#[serde(untagged)]
enum LoginResponse {
    Failed {
        password: bool,
        email: bool,
    },
    Success {
        access_token: String,
    }
}

pub async fn login(
    State(app): State<AppState>,
    Json(data): Json<LoginData>,
    jar: CookieJar,
) -> impl IntoResponse {
    let db = &app.db;

    let raw = RawCredentials::new(data.email.clone(), data.password.clone());

    let refresh = match Auth::mint_refresh_token(raw, db).await {
        Ok(token) => token,
        Err(_)
    }
}




pub async fn refresh(
    State(app): State<AppState>,
)