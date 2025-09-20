use crate::{common::ValidatedEmail, error::Result};
use uuid::Uuid;

pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: ValidatedEmail,
}
