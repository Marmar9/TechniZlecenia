use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Post {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub r#type: String, // 'request' or 'offer'
    pub subject: String,
    pub price: rust_decimal::Decimal,
    pub deadline: Option<DateTime<Utc>>,
    pub urgent: bool,
    pub status: String, // 'active', 'completed', 'cancelled'
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    
    // Owner information (denormalized for performance)
    pub owner_id: Uuid,
    pub owner_name: String,
    pub owner_username: String,
    pub owner_email: String,
    pub owner_avatar: Option<Vec<u8>>,
    pub owner_rating: rust_decimal::Decimal,
    
    // Post metadata
    pub view_count: i32,
    pub response_count: i32,
    
    // Optional enhanced fields
    pub location: Option<String>,
    pub preferred_contact_method: Option<String>,
    pub academic_level: Option<String>,
    pub difficulty: Option<String>,
}

impl Post {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        id: Uuid,
        title: String,
        description: String,
        r#type: String,
        subject: String,
        price: rust_decimal::Decimal,
        deadline: Option<DateTime<Utc>>,
        urgent: bool,
        owner_id: Uuid,
        owner_name: String,
        owner_username: String,
        owner_email: String,
        owner_avatar: Option<Vec<u8>>,
        owner_rating: rust_decimal::Decimal,
        location: Option<String>,
        preferred_contact_method: Option<String>,
        academic_level: Option<String>,
        difficulty: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            title,
            description,
            r#type,
            subject,
            price,
            deadline,
            urgent,
            status: "active".to_string(),
            created_at: now,
            updated_at: now,
            owner_id,
            owner_name,
            owner_username,
            owner_email,
            owner_avatar,
            owner_rating,
            view_count: 0,
            response_count: 0,
            location,
            preferred_contact_method,
            academic_level,
            difficulty,
        }
    }
}