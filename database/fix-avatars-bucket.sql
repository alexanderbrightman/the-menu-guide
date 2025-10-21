-- Make avatars bucket public for image display
update storage.buckets 
set public = true 
where id = 'avatars';

-- Verify the bucket is now public
select id, name, public from storage.buckets where id = 'avatars';

