-- Chat threads table linking users and posts
CREATE TABLE msg_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_pair_order CHECK (user_a < user_b),
    CONSTRAINT unique_thread_per_post UNIQUE (post_id, user_a, user_b)
);

CREATE INDEX idx_msg_threads_post_id ON msg_threads(post_id);
CREATE INDEX idx_msg_threads_user_a ON msg_threads(user_a);
CREATE INDEX idx_msg_threads_user_b ON msg_threads(user_b);
CREATE INDEX idx_msg_threads_created_at ON msg_threads(created_at);

CREATE OR REPLACE FUNCTION update_msg_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER msg_threads_updated_at_trigger
    BEFORE UPDATE ON msg_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_msg_threads_updated_at();
