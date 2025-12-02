-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  qr_code_url text,
  is_public boolean default false,
  subscription_status text check (subscription_status in ('free','pro','canceled')) default 'free',
  menu_font text default 'Plus Jakarta Sans',
  menu_background_color text default '#F4F2EE',
  created_at timestamp with time zone default now()
);

-- Create menu_categories table
create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Create menu_items table
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  category_id uuid references menu_categories (id) on delete set null,
  image_url text,
  title text not null,
  description text,
  price numeric(10,2),
  created_at timestamp with time zone default now()
);

-- Create tags table
create table tags (
  id serial primary key,
  name text unique not null
);

-- Create menu_item_tags junction table
create table menu_item_tags (
  menu_item_id uuid references menu_items (id) on delete cascade,
  tag_id int references tags (id) on delete cascade,
  primary key (menu_item_id, tag_id)
);

-- Create user_favorites table
create table user_favorites (
  user_id uuid references profiles (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (user_id, menu_item_id)
);

-- Insert pre-populated tags
insert into tags (name) values 
  ('gluten-free'),
  ('vegan'),
  ('vegetarian'),
  ('dairy-free'),
  ('nut-free'),
  ('shellfish-free'),
  ('pescatarian'),
  ('spicy')
on conflict (name) do nothing;

-- Enable Row Level Security
alter table profiles enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_tags enable row level security;
alter table user_favorites enable row level security;

-- RLS Policies for profiles
create policy "Users can manage their own profile"
on profiles for all using (id = auth.uid());

create policy "Public can view published profiles"
on profiles for select
using (is_public = true and subscription_status = 'pro');

-- RLS Policies for menu_categories
create policy "Users can manage their own menu categories"
on menu_categories for all using (user_id = auth.uid());

create policy "Public can view published menu categories"
on menu_categories for select
using (
  user_id in (
    select id from profiles
    where is_public = true and subscription_status = 'pro'
  )
);

-- RLS Policies for menu_items
create policy "Users can manage their own menu items"
on menu_items for all using (user_id = auth.uid());

create policy "Public can view published menu items"
on menu_items for select
using (
  user_id in (
    select id from profiles
    where is_public = true and subscription_status = 'pro'
  )
);

-- RLS Policies for menu_item_tags
create policy "Users can manage their own menu item tags"
on menu_item_tags for all using (
  menu_item_id in (
    select id from menu_items
    where user_id = auth.uid()
  )
);

create policy "Public can view published menu item tags"
on menu_item_tags for select
using (
  menu_item_id in (
    select id from menu_items
    where user_id in (
      select id from profiles
      where is_public = true and subscription_status = 'pro'
    )
  )
);

-- Tags are public read-only
create policy "Anyone can view tags"
on tags for select using (true);

-- RLS Policies for user_favorites
create policy "Users can manage their own favorites"
on user_favorites for all using (user_id = auth.uid());

create policy "Public can view published favorites"
on user_favorites for select
using (
  user_id in (
    select id from profiles
    where is_public = true and subscription_status = 'pro'
  )
);

-- Create indexes for better performance
create index idx_profiles_username on profiles(username);
create index idx_profiles_is_public on profiles(is_public, subscription_status);
create index idx_menu_categories_user_id on menu_categories(user_id);
create index idx_menu_items_user_id on menu_items(user_id);
create index idx_menu_items_category_id on menu_items(category_id);
create index idx_menu_item_tags_menu_item_id on menu_item_tags(menu_item_id);
create index idx_menu_item_tags_tag_id on menu_item_tags(tag_id);
create index idx_user_favorites_user_id on user_favorites(user_id);
create index idx_user_favorites_menu_item_id on user_favorites(menu_item_id);

