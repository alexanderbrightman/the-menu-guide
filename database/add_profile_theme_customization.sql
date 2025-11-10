-- Add menu theme customization columns to profiles
alter table profiles
  add column if not exists menu_font text default 'Plus Jakarta Sans';

alter table profiles
  add column if not exists menu_background_color text default '#F4F2EE';
