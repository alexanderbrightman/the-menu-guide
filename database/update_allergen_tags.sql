-- Migration script to update allergen tags
-- Run this script on your Supabase database to add the new allergen tags

BEGIN;

-- Insert new allergen tags
INSERT INTO tags (name) VALUES 
  ('Gluten'),
  ('Dairy'),
  ('Nuts'),
  ('Shellfish'),
  ('Eggs'),
  ('Soy'),
  ('Fish'),
  ('Sesame'),
  ('Vegetarian'),
  ('Vegan')
ON CONFLICT (name) DO NOTHING;

COMMIT;




