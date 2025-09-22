-- Rollback migration for enhanced posts

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_posts_updated_at ON posts;
DROP FUNCTION IF EXISTS update_posts_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_posts_owner_id;
DROP INDEX IF EXISTS idx_posts_type;
DROP INDEX IF EXISTS idx_posts_subject;
DROP INDEX IF EXISTS idx_posts_status;
DROP INDEX IF EXISTS idx_posts_created_at;
DROP INDEX IF EXISTS idx_posts_urgent;

-- Drop constraints
ALTER TABLE posts 
DROP CONSTRAINT IF EXISTS chk_posts_type,
DROP CONSTRAINT IF EXISTS chk_posts_status,
DROP CONSTRAINT IF EXISTS chk_posts_contact_method,
DROP CONSTRAINT IF EXISTS chk_posts_academic_level,
DROP CONSTRAINT IF EXISTS chk_posts_difficulty,
DROP CONSTRAINT IF EXISTS chk_posts_price,
DROP CONSTRAINT IF EXISTS chk_posts_rating;

-- Rename created_at back to created
ALTER TABLE posts 
RENAME COLUMN created_at TO created;

-- Drop all new columns
ALTER TABLE posts 
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS subject,
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS deadline,
DROP COLUMN IF EXISTS urgent,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS owner_name,
DROP COLUMN IF EXISTS owner_username,
DROP COLUMN IF EXISTS owner_email,
DROP COLUMN IF EXISTS owner_avatar,
DROP COLUMN IF EXISTS owner_rating,
DROP COLUMN IF EXISTS view_count,
DROP COLUMN IF EXISTS response_count,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS preferred_contact_method,
DROP COLUMN IF EXISTS academic_level,
DROP COLUMN IF EXISTS difficulty;
