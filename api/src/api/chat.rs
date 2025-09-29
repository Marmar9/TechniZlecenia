// WebSocket-based chat system with PostgreSQL LISTEN/NOTIFY

use crate::{
    app::AppState,
    common::env,
    db::messages as db_messages,
    error::{AppError, Result},
    server::{
        auth::{AccessToken, JwtToken},
        chat::{ChatCommand, ChatResponse, MessageInfo, MessageNotification},
    },
};
use axum::extract::{
    ws::{Message, WebSocket},
    Query, State, WebSocketUpgrade,
};
use futures::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use serde_json;
use sqlx::postgres::{PgListener, PgNotification};
use std::{
    collections::HashMap,
    sync::Arc,
};
use tokio::sync::{mpsc, RwLock};
use tracing::{error, info, warn};
use uuid::Uuid;

/// Connection manager that holds user connections and handles PostgreSQL notifications
pub type ConnectionManager = Arc<RwLock<HashMap<Uuid, Vec<UserConnection>>>>;

/// Represents a user's WebSocket connection
pub struct UserConnection {
    pub connection_id: Uuid,
    pub sender: mpsc::UnboundedSender<ChatResponse>,
}

/// Initialize the global connection manager
pub fn create_connection_manager() -> ConnectionManager {
    Arc::new(RwLock::new(HashMap::new()))
}


/// WebSocket upgrade handler with authentication
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> axum::response::Response {
    // Get token from query parameter
    let access_token = if let Some(token_str) = params.get("token") {
        // Parse token from query parameter
        let secret = env("ACCESS_TOKEN_SECRET");
        match AccessToken::try_decode(token_str, secret) {
            Some(token) if token.is_valid() => token,
            _ => {
                return axum::response::Response::builder()
                    .status(401)
                    .body("Unauthorized".into())
                    .unwrap_or_else(|e| {
                        error!("Failed to build unauthorized response: {}", e);
                        axum::response::Response::new("Internal Error".into())
                    })
            }
        }
    } else {
        return axum::response::Response::builder()
            .status(401)
            .body("Unauthorized".into())
            .unwrap_or_else(|e| {
                error!("Failed to build unauthorized response: {}", e);
                axum::response::Response::new("Internal Error".into())
            })
    };

    ws.on_upgrade(move |socket| handle_socket(socket, state, access_token))
}

/// Main WebSocket connection handler
async fn handle_socket(socket: WebSocket, state: AppState, token: AccessToken) {
    let user_id = token.sub;
    let connection_id = Uuid::new_v4();
    
    info!("User {} connected with connection {}", user_id, connection_id);

    let (ws_sender, ws_receiver) = socket.split();
    let (tx, rx) = mpsc::unbounded_channel::<ChatResponse>();

    // Create user connection
    let user_conn = UserConnection {
        connection_id,
        sender: tx,
    };

    // Get connection manager from app state
    let connection_manager = state.connection_manager.clone();

    // Add connection to manager
    {
        let mut connections = connection_manager.write().await;
        connections
            .entry(user_id)
            .or_insert_with(Vec::new)
            .push(user_conn);
    }

    // Start PostgreSQL listener for this user
    let listener_task = start_postgres_listener(
        state.db.clone(),
        user_id,
        connection_manager.clone(),
    );

    // Start message sender task
    let sender_task = start_message_sender(ws_sender, rx);

    // Start command receiver task
    let receiver_task = start_command_receiver(
        ws_receiver,
        state.db.clone(),
        user_id,
        connection_manager.clone(),
    );

    // Wait for any task to complete (usually means disconnection)
    tokio::select! {
        _ = listener_task => info!("PostgreSQL listener task ended for user {}", user_id),
        _ = sender_task => info!("Message sender task ended for user {}", user_id),
        _ = receiver_task => info!("Command receiver task ended for user {}", user_id),
    }

    // Clean up connection
    {
        let mut connections = connection_manager.write().await;
        if let Some(user_connections) = connections.get_mut(&user_id) {
            user_connections.retain(|conn| conn.connection_id != connection_id);
            if user_connections.is_empty() {
                connections.remove(&user_id);
            }
        }
    }

    info!("User {} disconnected (connection {})", user_id, connection_id);
}

/// Start PostgreSQL listener for user's thread channels
async fn start_postgres_listener(
    db: sqlx::PgPool,
    user_id: Uuid,
    connection_manager: ConnectionManager,
) -> Result<()> {
    let mut listener = match PgListener::connect_with(&db).await {
        Ok(listener) => listener,
        Err(e) => {
            error!("Failed to create PostgreSQL listener for user {}: {}", user_id, e);
            return Err(e.into());
        }
    };

    // Get all thread IDs for this user
    let thread_ids = match db_messages::get_user_thread_ids(&db, user_id).await {
        Ok(ids) => ids,
        Err(e) => {
            error!("Failed to get thread IDs for user {}: {}", user_id, e);
            return Err(e);
        }
    };
    
    // Listen to all thread channels
    for thread_id in thread_ids {
        let channel = format!("thread_{}", thread_id);
        if let Err(e) = listener.listen(&channel).await {
            error!("Failed to listen to channel {} for user {}: {}", channel, user_id, e);
            // Continue with other channels instead of failing completely
            continue;
        }
        info!("User {} listening to channel {}", user_id, channel);
    }

    // Process notifications with proper error handling
    loop {
        match listener.try_recv().await {
            Ok(Some(notification)) => {
                if let Err(e) = handle_notification(notification, user_id, &connection_manager, &db).await {
                    error!("Error handling notification for user {}: {:?}", user_id, e);
                }
            }
            Ok(None) => {
                // No notification available, continue listening
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
            Err(e) => {
                error!("PostgreSQL listener error for user {}: {}", user_id, e);
                break;
            }
        }
    }

    info!("PostgreSQL listener ended for user {}", user_id);
    Ok(())
}

/// Handle PostgreSQL notification
async fn handle_notification(
    notification: PgNotification,
    user_id: Uuid,
    connection_manager: &ConnectionManager,
    db: &sqlx::PgPool,
) -> Result<()> {
    let channel = notification.channel();
    let payload = notification.payload();

    // Parse thread_id from channel name
    let _thread_id = if let Some(id_str) = channel.strip_prefix("thread_") {
        Uuid::parse_str(id_str)?
    } else {
        warn!("Invalid channel name: {}", channel);
        return Ok(());
    };

    // Parse message notification
    let msg_notification: MessageNotification = serde_json::from_str(payload)?;

    // Get sender name from database
    let sender_name = sqlx::query_scalar!(
        "SELECT username FROM users WHERE id = $1",
        msg_notification.sender_id
    )
    .fetch_one(db)
    .await?;

    let message_info = MessageInfo {
        id: msg_notification.message_id,
        thread_id: msg_notification.thread_id,
        sender_id: msg_notification.sender_id,
        sender_name,
        content: msg_notification.content,
        sent_at: msg_notification.sent_at,
    };

    let response = ChatResponse::NewMessage {
        message: message_info,
    };

    // Send to user's connections
    let connections = connection_manager.read().await;
    if let Some(user_connections) = connections.get(&user_id) {
        for conn in user_connections {
            if let Err(e) = conn.sender.send(response.clone()) {
                error!("Failed to send message to connection: {:?}", e);
            }
        }
    }

    Ok(())
}

/// Send messages to WebSocket
async fn start_message_sender(
    mut ws_sender: SplitSink<WebSocket, Message>,
    mut rx: mpsc::UnboundedReceiver<ChatResponse>,
) {
    while let Some(response) = rx.recv().await {
        if let Ok(json) = serde_json::to_string(&response) {
            if let Err(e) = ws_sender.send(Message::Text(json.into())).await {
                error!("Failed to send WebSocket message: {:?}", e);
                break;
            }
        }
    }
}

/// Receive and process commands from WebSocket
async fn start_command_receiver(
    mut ws_receiver: SplitStream<WebSocket>,
    db: sqlx::PgPool,
    user_id: Uuid,
    connection_manager: ConnectionManager,
) {
    while let Some(msg) = ws_receiver.next().await {
        if let Ok(Message::Text(text)) = msg {
            if let Err(e) = process_command(text.to_string(), &db, user_id, &connection_manager).await {
                error!("Error processing command: {:?}", e);
            }
        }
    }
}

/// Process a chat command
async fn process_command(
    command_text: String,
    db: &sqlx::PgPool,
    user_id: Uuid,
    connection_manager: &ConnectionManager,
) -> Result<()> {
    let command: ChatCommand = serde_json::from_str(&command_text)?;

    let response = match command {
        ChatCommand::CreateThread { post_id, other_user_id } => {
            let thread = db_messages::create_thread(db, post_id, user_id, other_user_id).await?;

            // Get thread info for creator response
            let creator_threads = db_messages::get_user_threads(db, user_id).await?;
            let thread_info = creator_threads.into_iter().find(|t| t.id == thread.id)
                .ok_or_else(|| AppError::InternalServerError("Thread not found after creation".to_string()))?;

            // Also refresh the other participant's thread list
            let other_user_threads = db_messages::get_user_threads(db, other_user_id).await?;
            let other_response = ChatResponse::ThreadsList { threads: other_user_threads };
            let connections = connection_manager.read().await;
            if let Some(other_user_conns) = connections.get(&other_user_id) {
                for conn in other_user_conns {
                    let _ = conn.sender.send(other_response.clone());
                }
            }

            ChatResponse::ThreadCreated { thread: thread_info }
        }
        ChatCommand::SendMessage { thread_id, content } => {
            let message = db_messages::send_message(db, thread_id, user_id, content).await?;
            
            // Get sender name
            let sender_name = sqlx::query_scalar!(
                "SELECT username FROM users WHERE id = $1",
                user_id
            )
            .fetch_one(db)
            .await?;

            let message_info = MessageInfo {
                id: message.id,
                thread_id: message.thread_id,
                sender_id: message.sender_id,
                sender_name,
                content: message.content,
                sent_at: message.sent_at,
            };

            // Proactively fanout to the other participant as a NewMessage
            if let Some(thread) = db_messages::get_thread_by_id(db, thread_id, user_id).await? {
                let other_user_id = if thread.user_a == user_id { thread.user_b } else { thread.user_a };
                let new_msg_response = ChatResponse::NewMessage { message: message_info.clone() };
                let connections = connection_manager.read().await;
                if let Some(other_user_conns) = connections.get(&other_user_id) {
                    for conn in other_user_conns {
                        let _ = conn.sender.send(new_msg_response.clone());
                    }
                }
            }

            ChatResponse::MessageSent { message: message_info }
        }
        ChatCommand::GetThreads => {
            let threads = db_messages::get_user_threads(db, user_id).await?;
            ChatResponse::ThreadsList { threads }
        }
        ChatCommand::GetMessages { thread_id, limit, offset } => {
            let limit = limit.unwrap_or(50);
            let offset = offset.unwrap_or(0);
            let messages = db_messages::get_thread_messages(db, thread_id, user_id, limit, offset).await?;
            ChatResponse::MessagesList { messages }
        }
    };

    // Send response to user's connections
    let connections = connection_manager.read().await;
    if let Some(user_connections) = connections.get(&user_id) {
        for conn in user_connections {
            if let Err(e) = conn.sender.send(response.clone()) {
                error!("Failed to send response to connection: {:?}", e);
            }
        }
    }

    Ok(())
}

