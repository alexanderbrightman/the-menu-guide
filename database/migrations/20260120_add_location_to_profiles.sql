-- Add location fields to profiles table for geolocation-based features
alter table profiles
add column if not exists latitude numeric(10, 7),
add column if not exists longitude numeric(10, 7),
add column if not exists address text;

-- Create spatial index for efficient distance calculations
create index if not exists idx_profiles_location on profiles(latitude, longitude) where latitude is not null and longitude is not null;

-- Add comment for documentation
comment on column profiles.latitude is 'Restaurant latitude coordinate for geolocation features';
comment on column profiles.longitude is 'Restaurant longitude coordinate for geolocation features';
comment on column profiles.address is 'Restaurant address (optional, for display purposes)';
