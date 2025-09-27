// Chat endpoints using

// each chat between 2 users is managed by a socket
// the id of the chat is the pair of 2 uuid's together
// thats also the index used to get chat messages

// When a chat is opened a SSR connection is established on the client
// all messages are posted through /chat/messsage

// /chat/message
// /chat/sync
//

use crate::server::auth::AccessToken;
use crate::error::AppError;
use axum::extract::{ws::{Message, WebSocket}, WebSocketUpgrade};
use futures::StreamExt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncPacket {
    pub message: String,
}

async fn sync_handler(_ws: WebSocketUpgrade, _token: AccessToken) {}

async fn socket_handler(mut socket: WebSocket) {
    let (mut _sender, mut receiver) = socket.split();

    while let Some(msg) = receiver.next().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(payload) => {
                    if let Ok(sync_packet) = serde_json::from_str::<SyncPacket>(&payload) {
                        println!("Received sync packet: {:?}", sync_packet);
                    }
                },
                _ => {}
            }
        }
    }
}
