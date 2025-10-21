-- Storage bucket policies for The Menu Guide

-- Create storage buckets
insert into storage.buckets (id, name, public) values 
  ('menu_items', 'menu_items', true),
  ('avatars', 'avatars', false),
  ('qrcodes', 'qrcodes', true)
on conflict (id) do nothing;

-- Menu items bucket policies
create policy "Public can view menu item images"
on storage.objects for select
using (bucket_id = 'menu_items');

create policy "Authenticated users can upload menu item images"
on storage.objects for insert
with check (
  bucket_id = 'menu_items' 
  and auth.uid() is not null
);

create policy "Users can update their own menu item images"
on storage.objects for update
using (
  bucket_id = 'menu_items' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own menu item images"
on storage.objects for delete
using (
  bucket_id = 'menu_items' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars bucket policies
create policy "Public can view avatar images"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatar images"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  and auth.uid() is not null
);

create policy "Users can update their own avatar images"
on storage.objects for update
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own avatar images"
on storage.objects for delete
using (
  bucket_id = 'avatars' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- QR codes bucket policies
create policy "Public can view QR code images"
on storage.objects for select
using (bucket_id = 'qrcodes');

create policy "Authenticated users can upload QR code images"
on storage.objects for insert
with check (
  bucket_id = 'qrcodes' 
  and auth.uid() is not null
);

create policy "Users can update their own QR code images"
on storage.objects for update
using (
  bucket_id = 'qrcodes' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own QR code images"
on storage.objects for delete
using (
  bucket_id = 'qrcodes' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

