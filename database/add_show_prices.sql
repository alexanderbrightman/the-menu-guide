-- Add show_prices column to profiles table
-- This allows users to toggle whether prices are displayed on their public menu

alter table profiles 
add column if not exists show_prices boolean default true;

-- Add comment to explain the column
comment on column profiles.show_prices is 'Controls whether prices are displayed on the public menu page';

