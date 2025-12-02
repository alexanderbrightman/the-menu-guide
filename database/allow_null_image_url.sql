-- Migration: Allow image_url to be NULL in menu_items table
-- This allows users to create menu items without images

ALTER TABLE menu_items 
ALTER COLUMN image_url DROP NOT NULL;

