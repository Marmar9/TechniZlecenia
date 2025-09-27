-- Drop reviews table and related objects
DROP TRIGGER IF EXISTS trigger_update_reviews_updated_at ON reviews;
DROP FUNCTION IF EXISTS update_reviews_updated_at();
DROP TABLE IF EXISTS reviews;
