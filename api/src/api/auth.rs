use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use axum_extra::extract::{CookieJar, cookie::Cookie, cookie::SameSite};
use serde::{Deserialize, Serialize};

use crate::{
    app::AppState,
    common::env,
    db,
    error::AppError,
    server::{
        auth::{Auth, JwtToken, RefreshToken},
        credentials::{CredentialError, Credentials},
    },
};

const REFRESH_COOKIE_IDENT: &str = "refresh_token";

fn build_refresh_cookie(token: String) -> Cookie<'static> {
    let cookie = Cookie::build((REFRESH_COOKIE_IDENT, token))
        .http_only(true)
        .same_site(SameSite::Strict)
        .path("/auth/refresh");

    #[cfg(not(debug_assertions))]
    {
        cookie = cookie.secure(true);
    }

    cookie.build()
}

#[derive(Debug, Deserialize)]
pub struct RegisterData {
    pub username: String,
    pub credentials: Credentials,
}

pub async fn register(
    State(app): State<AppState>,
    Json(RegisterData {
        username,
        credentials,
    }): Json<RegisterData>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    let db = &app.db;

    let credentials = credentials
        .validate()
        .map_err(|err| (StatusCode::BAD_REQUEST, Json(vec![err])))?;

    let (email_taken, username_taken) = tokio::join!(
        db::users::is_email_taken(db, credentials.get_email()),
        db::users::is_username_taken(db, &username)
    );

    let mut invalid = Vec::new();

    if email_taken {
        invalid.push(CredentialError::EmailTaken);
    }

    if username_taken {
        invalid.push(CredentialError::UsernameTaken);
    }

    if !invalid.is_empty() {
        return Err((StatusCode::BAD_REQUEST, Json(invalid)));
    };

    db::users::add_user(db, credentials, username)
        .await
        .map_err(|_: crate::error::AppError| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(Vec::new()))
        })?;

    Ok(StatusCode::CREATED)
}

#[derive(Deserialize)]
pub struct LoginData {
    pub credentials: Credentials,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
}

pub async fn login(
    State(app): State<AppState>,
    cookies: CookieJar,
    Json(LoginData { credentials }): Json<LoginData>,
) -> Result<(StatusCode, CookieJar, Json<LoginResponse>), (StatusCode, Json<Vec<CredentialError>>)>
{
    let db = &app.db;

    let credentials = credentials
        .validate()
        .map_err(|err| (StatusCode::BAD_REQUEST, Json(vec![err])))?;

    let refresh_token =
        Auth::mint_refresh_token(credentials, db)
            .await
            .map_err(|err| match err {
                AppError::CredentialError(err) => (StatusCode::BAD_REQUEST, Json(vec![err])),
                _ => (StatusCode::INTERNAL_SERVER_ERROR, Json(Vec::new())),
            })?;

    let access_token =
        Auth::mint_access_token(&refresh_token, db)
            .await
            .map_err(|err| match err {
                AppError::CredentialError(err) => (StatusCode::BAD_REQUEST, Json(vec![err])),
                _ => (StatusCode::INTERNAL_SERVER_ERROR, Json(Vec::new())),
            })?;

    let refresh_token_encoded = refresh_token
        .try_encode(env("REFRESH_TOKEN_SECRET"))
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, Json(Vec::new())))?;
    let access_token_encoded = access_token
        .try_encode(env("ACCESS_TOKEN_SECRET"))
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, Json(Vec::new())))?;

    let cookie = build_refresh_cookie(refresh_token_encoded);
    let jar = cookies.add(cookie);

    Ok((
        StatusCode::OK,
        jar,
        Json(LoginResponse {
            token: access_token_encoded,
        }),
    ))
}

#[derive(Serialize)]
pub struct RefreshResponse {
    pub token: String,
}

pub async fn refresh(
    State(app): State<AppState>,
    cookies: CookieJar,
) -> Result<(StatusCode, Json<RefreshResponse>), (StatusCode, Json<Vec<CredentialError>>)> {
    let db = &app.db;

    let refresh_token_encoded = cookies
        .get(REFRESH_COOKIE_IDENT)
        .map(|cookie| cookie.value())
        .ok_or((StatusCode::UNAUTHORIZED, Json(Vec::new())))?;

    let refresh_token =
        RefreshToken::try_decode(refresh_token_encoded, env("REFRESH_TOKEN_SECRET"))
            .ok_or((StatusCode::UNAUTHORIZED, Json(Vec::new())))?;

    let access_token =
        Auth::mint_access_token(&refresh_token, db)
            .await
            .map_err(|err| match err {
                AppError::CredentialError(err) => (StatusCode::BAD_REQUEST, Json(vec![err])),
                _ => (StatusCode::UNAUTHORIZED, Json(Vec::new())),
            })?;

    let access_token_encoded = access_token
        .try_encode(env("ACCESS_TOKEN_SECRET"))
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, Json(Vec::new())))?;

    Ok((
        StatusCode::OK,
        Json(RefreshResponse {
            token: access_token_encoded,
        }),
    ))
}
