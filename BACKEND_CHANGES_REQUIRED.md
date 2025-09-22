# Backend Database and API Changes Required

## Database Schema Changes

### 1. Update Posts Table

The `posts` table needs to be restructured to store all display information directly:

```sql
-- New posts table structure
CREATE TABLE posts (
    -- Core post fields
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('request', 'offer') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deadline TIMESTAMP NULL,
    urgent BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Owner information (denormalized for performance)
    owner_id VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_username VARCHAR(255) NOT NULL,
    owner_avatar VARCHAR(500) NULL,
    owner_rating DECIMAL(3, 2) NOT NULL DEFAULT 4.5,
    
    -- Post metadata
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    view_count INT NOT NULL DEFAULT 0,
    response_count INT NOT NULL DEFAULT 0,
    
    -- Optional fields
    location VARCHAR(255) NULL,
    preferred_contact_method ENUM('email', 'platform', 'phone') NULL,
    academic_level ENUM('undergraduate', 'graduate', 'phd', 'other') NULL,
    difficulty ENUM('beginner', 'intermediate', 'advanced') NULL,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_owner_id (owner_id),
    INDEX idx_type (type),
    INDEX idx_subject (subject),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    -- Foreign key
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. Migration Strategy

```sql
-- Migration script to update existing posts
-- Step 1: Add new columns
ALTER TABLE posts 
ADD COLUMN owner_name VARCHAR(255),
ADD COLUMN owner_username VARCHAR(255),
ADD COLUMN owner_avatar VARCHAR(500),
ADD COLUMN owner_rating DECIMAL(3, 2) DEFAULT 4.5,
ADD COLUMN type ENUM('request', 'offer') DEFAULT 'request',
ADD COLUMN subject VARCHAR(255) DEFAULT 'General',
ADD COLUMN price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
ADD COLUMN view_count INT DEFAULT 0,
ADD COLUMN response_count INT DEFAULT 0;

-- Step 2: Populate owner information from users table
UPDATE posts p
JOIN users u ON p.owner_id = u.id
SET 
    p.owner_name = COALESCE(u.name, u.username, 'Unknown User'),
    p.owner_username = COALESCE(u.username, u.name, 'unknown'),
    p.owner_avatar = u.avatar,
    p.owner_rating = COALESCE(u.rating, 4.5);

-- Step 3: Make required columns NOT NULL after population
ALTER TABLE posts 
MODIFY COLUMN owner_name VARCHAR(255) NOT NULL,
MODIFY COLUMN owner_username VARCHAR(255) NOT NULL,
MODIFY COLUMN type ENUM('request', 'offer') NOT NULL,
MODIFY COLUMN subject VARCHAR(255) NOT NULL,
MODIFY COLUMN price DECIMAL(10, 2) NOT NULL,
MODIFY COLUMN urgent BOOLEAN NOT NULL,
MODIFY COLUMN status ENUM('active', 'completed', 'cancelled') NOT NULL;
```

## API Changes Required

### 1. Update Post Creation Endpoint

**Endpoint:** `POST /posts/create`

**New Request Body:**
```json
{
    "title": "string",
    "description": "string",
    "type": "request" | "offer",
    "subject": "string",
    "price": number,
    "deadline": "ISO8601 timestamp" | null,
    "urgent": boolean,
    "location": "string" | null,
    "preferredContactMethod": "email" | "platform" | "phone" | null,
    "academicLevel": "undergraduate" | "graduate" | "phd" | "other" | null,
    "difficulty": "beginner" | "intermediate" | "advanced" | null
}
```

**Backend Logic:**
```rust
// When creating a post, automatically populate owner information
let current_user = get_current_user_from_token()?;
let post = Post {
    id: generate_id(),
    title: request.title,
    description: request.description,
    type: request.type,
    subject: request.subject,
    price: request.price,
    deadline: request.deadline,
    urgent: request.urgent,
    
    // Auto-populate owner info from current user
    owner_id: current_user.id,
    owner_name: current_user.name.or(current_user.username).unwrap_or("Unknown"),
    owner_username: current_user.username.or(current_user.name).unwrap_or("unknown"),
    owner_avatar: current_user.avatar,
    owner_rating: current_user.rating.unwrap_or(4.5),
    
    // Default values
    status: "active",
    view_count: 0,
    response_count: 0,
    
    // Optional fields
    location: request.location,
    preferred_contact_method: request.preferred_contact_method,
    academic_level: request.academic_level,
    difficulty: request.difficulty,
    
    created_at: now(),
    updated_at: now(),
};
```

### 2. Update Post Update Endpoint

**Endpoint:** `PUT /posts/{id}`

**Important:** When updating posts, also update owner information if user data has changed:

```rust
// Check if user's profile data has changed and update post accordingly
let current_user = get_current_user_from_token()?;
if post.owner_id == current_user.id {
    post.owner_name = current_user.name.or(current_user.username).unwrap_or("Unknown");
    post.owner_username = current_user.username.or(current_user.name).unwrap_or("unknown");
    post.owner_avatar = current_user.avatar;
    post.owner_rating = current_user.rating.unwrap_or(4.5);
}
```

### 3. Update Get Posts Endpoint

**Endpoint:** `GET /posts`

**New Response Format:**
```json
{
    "posts": [
        {
            "id": "string",
            "title": "string",
            "description": "string",
            "type": "request" | "offer",
            "subject": "string",
            "price": number,
            "deadline": "ISO8601 timestamp" | null,
            "urgent": boolean,
            "createdAt": "ISO8601 timestamp",
            "updatedAt": "ISO8601 timestamp",
            
            "owner_id": "string",
            "owner_name": "string",
            "owner_username": "string",
            "owner_avatar": "string" | null,
            "owner_rating": number,
            
            "status": "active" | "completed" | "cancelled",
            "viewCount": number,
            "responseCount": number,
            
            "location": "string" | null,
            "preferredContactMethod": "email" | "platform" | "phone" | null,
            "academicLevel": "undergraduate" | "graduate" | "phd" | "other" | null,
            "difficulty": "beginner" | "intermediate" | "advanced" | null
        }
    ]
}
```

### 4. User Profile Update Trigger

When a user updates their profile, update all their posts:

```rust
// After user profile update
async fn update_user_posts_on_profile_change(user_id: &str, updated_user: &User) -> Result<()> {
    let update_query = "
        UPDATE posts 
        SET 
            owner_name = ?,
            owner_username = ?,
            owner_avatar = ?,
            owner_rating = ?,
            updated_at = NOW()
        WHERE owner_id = ?
    ";
    
    db.execute(update_query, (
        updated_user.name.as_ref().or(updated_user.username.as_ref()).unwrap_or(&"Unknown".to_string()),
        updated_user.username.as_ref().or(updated_user.name.as_ref()).unwrap_or(&"unknown".to_string()),
        &updated_user.avatar,
        updated_user.rating.unwrap_or(4.5),
        user_id
    )).await?;
    
    Ok(())
}
```

## Benefits of This Approach

### ✅ **Performance**
- No more complex JOINs to get user data for posts
- Single query returns all display information
- Faster page loads and better user experience

### ✅ **Simplicity**
- Frontend gets all data it needs in one request
- No complex client-side user resolution logic
- Cleaner, more maintainable code

### ✅ **Scalability**
- Denormalized data reduces database load
- Better caching opportunities
- Fewer API calls required

### ✅ **Consistency**
- User information is stored with each post at creation time
- Historical consistency (posts show user info as it was when posted)
- No "Anonymous User" issues

## Implementation Priority

1. **High Priority:** Database schema update and migration
2. **High Priority:** Update POST /posts/create endpoint
3. **High Priority:** Update GET /posts endpoint  
4. **Medium Priority:** Update PUT /posts/{id} endpoint
5. **Medium Priority:** User profile update triggers
6. **Low Priority:** Additional fields (location, academic level, etc.)

## Testing Checklist

- [ ] Create new posts with full user information
- [ ] Verify existing posts display correctly after migration
- [ ] Test post updates maintain user information
- [ ] Verify user profile changes update all user's posts
- [ ] Performance test with large number of posts
- [ ] Verify all new optional fields work correctly



