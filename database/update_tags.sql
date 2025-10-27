-- Migration script to update dietary tags
-- Run this script on your Supabase database to remove old tags and add new ones

BEGIN;

-- Delete old tags
DELETE FROM tags WHERE name IN ('halal', 'keto', 'low-carb', 'organic');

-- Insert new tags
INSERT INTO tags (name) VALUES 
  ('shellfish-free'), 
  ('pescatarian')
ON CONFLICT (name) DO NOTHING;

-- Note: Menu items that previously had old tags will no longer show those tags
-- This is expected behavior - you may need to manually update menu items in production

COMMIT;
