use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// Represents a chat thread between two users about a specific post
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct MessageThread {
    pub id: Uuid,
    pub post_id: Uuid,
    pub user_a: Uuid,
    pub user_b: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl MessageThread {
    /// Create a new thread ensuring user_a < user_b for consistent ordering
    pub fn new(post_id: Uuid, user1: Uuid, user2: Uuid) -> Self {
        let (user_a, user_b) = if user1 < user2 {
            (user1, user2)
        } else {
            (user2, user1)
        };
        
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            post_id,
            user_a,
            user_b,
            created_at: now,
            updated_at: now,
        }
    }
    
    /// Check if a user is part of this thread
    pub fn contains_user(&self, user_id: &Uuid) -> bool {
        &self.user_a == user_id || &self.user_b == user_id
    }
    
    /// Get the other user in the thread (not the provided user)
    pub fn get_other_user(&self, user_id: &Uuid) -> Option<Uuid> {
        if &self.user_a == user_id {
            Some(self.user_b)
        } else if &self.user_b == user_id {
            Some(self.user_a)
        } else {
            None
        }
    }
}

/// Represents a message within a chat thread
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub thread_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: DateTime<Utc>,
}

impl Message {
    /// Create a new message
    pub fn new(thread_id: Uuid, sender_id: Uuid, content: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            thread_id,
            sender_id,
            content,
            sent_at: Utc::now(),
        }
    }
}

/// Enhanced thread info with post and user details for API responses
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThreadInfo {
    pub id: Uuid,
    pub post_id: Uuid,
    pub post_title: String,
    pub other_user_id: Uuid,
    pub other_user_name: String,
    pub last_message: Option<String>,
    pub last_message_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Message with sender info for API responses
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageInfo {
    pub id: Uuid,
    pub thread_id: Uuid,
    pub sender_id: Uuid,
    pub sender_name: String,
    pub content: String,
    pub sent_at: DateTime<Utc>,
}

/// WebSocket command from client
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "cmd")]
pub enum ChatCommand {
    #[serde(rename = "create_thread")]
    CreateThread {
        post_id: Uuid,
        other_user_id: Uuid,
    },
    #[serde(rename = "send_message")]
    SendMessage {
        thread_id: Uuid,
        content: String,
    },
    #[serde(rename = "get_threads")]
    GetThreads,
    #[serde(rename = "get_messages")]
    GetMessages {
        thread_id: Uuid,
        limit: Option<i32>,
        offset: Option<i32>,
    },
}

/// WebSocket response to client
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ChatResponse {
    #[serde(rename = "thread_created")]
    ThreadCreated {
        thread: ThreadInfo,
    },
    #[serde(rename = "message_sent")]
    MessageSent {
        message: MessageInfo,
    },
    #[serde(rename = "threads_list")]
    ThreadsList {
        threads: Vec<ThreadInfo>,
    },
    #[serde(rename = "messages_list")]
    MessagesList {
        messages: Vec<MessageInfo>,
    },
    #[serde(rename = "new_message")]
    NewMessage {
        message: MessageInfo,
    },
    #[serde(rename = "error")]
    Error {
        message: String,
        code: Option<String>,
    },
}

/// PostgreSQL notification payload
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageNotification {
    pub message_id: Uuid,
    pub thread_id: Uuid,
    pub sender_id: Uuid,
    pub content: String,
    pub sent_at: DateTime<Utc>,
}