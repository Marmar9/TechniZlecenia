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
use axum::extract::{ws::{Message, WebSocket}, WebSocketUpgrade};
use futures::StreamExt;

async fn sync_handler(ws: WebSocketUpgrade, token: AccessToken) {}

async fn socket_handler(mut socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();

    receiver.filter_map(|res| {
        res.ok().map(|msg| {
            match msg {
                Message::Text(payload) => serde_json::from_slice::<SyncPacket>(payload).map_err(|| ),
                _ => Err(AppError::SyncError())
            }
        })
    })
}
