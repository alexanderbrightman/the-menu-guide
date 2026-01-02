-- Add is_available column to menu_items table
ALTER TABLE menu_items ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Update existing rows to have true
UPDATE menu_items SET is_available = true WHERE is_available IS NULL;
