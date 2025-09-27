-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    type VARCHAR(10) NOT NULL CHECK (type IN ('post', 'profile')),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either post_id or profile_id is set based on type
    CONSTRAINT check_review_type_post CHECK (
        (type = 'post' AND post_id IS NOT NULL AND profile_id IS NULL) OR
        (type = 'profile' AND profile_id IS NOT NULL AND post_id IS NULL)
    ),
    
    -- Prevent self-reviews
    CONSTRAINT check_no_self_review CHECK (review_sender_id != review_receiver_id),
    
    -- Prevent duplicate reviews from same sender to same receiver for same post/profile
    CONSTRAINT unique_review_per_sender_receiver_post UNIQUE (review_sender_id, review_receiver_id, post_id),
    CONSTRAINT unique_review_per_sender_receiver_profile UNIQUE (review_sender_id, review_receiver_id, profile_id)
);

-- Create indexes for better performance
CREATE INDEX idx_reviews_review_sender_id ON reviews(review_sender_id);
CREATE INDEX idx_reviews_review_receiver_id ON reviews(review_receiver_id);
CREATE INDEX idx_reviews_post_id ON reviews(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_reviews_profile_id ON reviews(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_reviews_type ON reviews(type);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();
