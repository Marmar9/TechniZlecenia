-- Messages table for chat system
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES msg_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messages_content_not_empty CHECK (trim(content) <> '')
);

CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_messages_thread_sent ON messages(thread_id, sent_at DESC);

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'thread_' || NEW.thread_id::text,
        json_build_object(
            'message_id', NEW.id,
            'thread_id', NEW.thread_id,
            'sender_id', NEW.sender_id,
            'content', NEW.content,
            'sent_at', NEW.sent_at
        )::text
    );

    UPDATE msg_threads
    SET updated_at = NEW.sent_at
    WHERE id = NEW.thread_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_notify_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();
