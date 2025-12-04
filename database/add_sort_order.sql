-- Add sort_order column to menu_categories
ALTER TABLE menu_categories 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Add sort_order column to menu_items
ALTER TABLE menu_items 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create an index for faster sorting
CREATE INDEX idx_menu_categories_sort_order ON menu_categories(sort_order);
CREATE INDEX idx_menu_items_sort_order ON menu_items(sort_order);
