-- Add show_display_name column to profiles table
-- This allows users to hide the restaurant name on the public page if it's already in the header image
alter table profiles 
add column if not exists show_display_name boolean default true;

