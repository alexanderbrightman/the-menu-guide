-- Migration: Add Instagram and website URL fields to profiles table
-- This allows users to add social media and website links to their profile

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS website_url text;

