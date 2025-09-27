-- Migration to enhance posts table with all user data and post metadata

-- Add new columns to posts table
ALTER TABLE posts 
ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'request',
ADD COLUMN subject VARCHAR(255) NOT NULL DEFAULT 'General',
ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN deadline TIMESTAMPTZ,
ADD COLUMN urgent BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active',
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

-- User information (denormalized for performance)
ADD COLUMN owner_name VARCHAR(255),
ADD COLUMN owner_username VARCHAR(255),
ADD COLUMN owner_email VARCHAR(255),
ADD COLUMN owner_avatar BYTEA,
ADD COLUMN owner_rating DECIMAL(3, 2) NOT NULL DEFAULT 4.5,

-- Post metadata
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN response_count INTEGER NOT NULL DEFAULT 0,

-- Optional enhanced fields
ADD COLUMN location VARCHAR(255),
ADD COLUMN preferred_contact_method VARCHAR(20),
ADD COLUMN academic_level VARCHAR(20),
ADD COLUMN difficulty VARCHAR(20);

-- Populate owner information from users table
UPDATE posts p
SET 
    owner_name = u.username,
    owner_username = u.username,
    owner_email = u.email,
    owner_avatar = u.avatar
FROM users u
WHERE p.owner_id = u.id;

-- Make required owner fields NOT NULL after population
ALTER TABLE posts 
ALTER COLUMN owner_name SET NOT NULL,
ALTER COLUMN owner_username SET NOT NULL,
ALTER COLUMN owner_email SET NOT NULL;

-- Update the created column name to match expected format
ALTER TABLE posts 
RENAME COLUMN created TO created_at;

-- Add indexes for performance
CREATE INDEX idx_posts_owner_id ON posts(owner_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_subject ON posts(subject);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_posts_urgent ON posts(urgent);

-- Add check constraints for enum-like fields
ALTER TABLE posts 
ADD CONSTRAINT chk_posts_type CHECK (type IN ('request', 'offer')),
ADD CONSTRAINT chk_posts_status CHECK (status IN ('active', 'completed', 'cancelled')),
ADD CONSTRAINT chk_posts_contact_method CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'platform', 'phone')),
ADD CONSTRAINT chk_posts_academic_level CHECK (academic_level IS NULL OR academic_level IN ('undergraduate', 'graduate', 'phd', 'other')),
ADD CONSTRAINT chk_posts_difficulty CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced')),
ADD CONSTRAINT chk_posts_price CHECK (price >= 0),
ADD CONSTRAINT chk_posts_rating CHECK (owner_rating >= 0 AND owner_rating <= 5);

-- Add trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_posts_updated_at();






