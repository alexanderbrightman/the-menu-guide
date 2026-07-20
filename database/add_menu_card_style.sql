-- Add menu_card_style column to profiles table
-- Allows restaurant owners to choose between classic bordered cards and minimal discover-style cards

alter table profiles
add column if not exists menu_card_style text default 'classic'
check (menu_card_style = any (array['classic'::text, 'minimal'::text]));

comment on column profiles.menu_card_style is 'Controls public/private menu item card layout: classic (bordered box) or minimal (discover-style)';
