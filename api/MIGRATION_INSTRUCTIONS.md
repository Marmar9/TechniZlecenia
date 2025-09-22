# Database Migration Instructions

## Overview
This migration enhances the posts table to store all user information directly, eliminating the need for complex joins and resolving the "Anonymous User" issue.

## Prerequisites
- Ensure you have `sqlx-cli` installed
- Make sure your database is running and accessible
- Backup your database before running migrations

## Step 1: Install Dependencies
```bash
cd api
cargo build
```

## Step 2: Run the Migration
```bash
# Apply the new migration
sqlx migrate run

# Or if you need to specify database URL
DATABASE_URL="postgresql://username:password@localhost/database_name" sqlx migrate run
```

## Step 3: Verify Migration
After running the migration, verify that:

1. **New columns exist:**
```sql
\d posts
```

2. **Data was populated correctly:**
```sql
SELECT id, title, owner_name, owner_username, owner_email, type, subject, price 
FROM posts 
LIMIT 5;
```

3. **Indexes were created:**
```sql
\di posts*
```

## Step 4: Test the API

1. **Start the server:**
```bash
cargo run
```

2. **Test endpoints:**
```bash
# Get all posts (should show user info)
curl http://localhost:8080/posts

# Create a new post (requires auth token)
curl -X POST http://localhost:8080/posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Need help with calculus",
    "description": "Looking for a tutor for calculus 1",
    "type": "request",
    "subject": "Mathematics",
    "price": 25.0,
    "urgent": false
  }'
```

## Migration Changes Summary

### New Columns Added:
- `type` (request/offer) 
- `subject` (academic subject)
- `price` (decimal)
- `deadline` (optional timestamp)
- `urgent` (boolean)
- `status` (active/completed/cancelled)
- `updated_at` (auto-updating timestamp)

### User Information (Denormalized):
- `owner_name`
- `owner_username` 
- `owner_email`
- `owner_avatar`
- `owner_rating`

### Metadata:
- `view_count`
- `response_count`

### Enhanced Fields:
- `location`
- `preferred_contact_method`
- `academic_level`
- `difficulty`

### Performance Improvements:
- Added indexes on commonly queried fields
- Added check constraints for data validation
- Added trigger for automatic `updated_at` updates

## Rollback Instructions
If you need to rollback the migration:

```bash
sqlx migrate revert
```

**Warning:** This will remove all the new columns and data!

## Expected Frontend Behavior
After migration, the frontend should:

1. ✅ Show real usernames instead of "Anonymous User"
2. ✅ Display all post metadata (type, subject, price, etc.)
3. ✅ Support enhanced post creation with all fields
4. ✅ Properly handle post updates
5. ✅ Show accurate owner information for each post

## Troubleshooting

### Migration Fails
- Check database connection
- Ensure no active transactions are blocking
- Verify user has necessary permissions

### Missing Data After Migration
- Check if `UPDATE` statement populated owner fields
- Verify users table has corresponding records
- Check for any constraint violations

### API Errors
- Ensure `rust_decimal` dependency is installed
- Check that all struct fields match database columns
- Verify JSON serialization is working correctly

## Performance Notes
- The denormalized approach trades storage space for query performance
- Single query now returns all display information
- No more N+1 query problems for user information
- Better caching opportunities due to self-contained records



