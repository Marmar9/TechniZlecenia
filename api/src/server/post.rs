use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Post {
    pub id: Uuid,
    pub title: String,
    pub owner_id: Uuid,
    pub description: String,
}

impl Post {
    pub fn new(id: Uuid, title: String, owner_id: Uuid, description: String) -> Self {
        Self {
            id,
            title,
            owner_id,
            description,
        }
    }
}
