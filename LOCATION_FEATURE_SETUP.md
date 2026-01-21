# Location Feature Setup Guide

## Overview
This guide explains how to enable the "Top 20 Closest Restaurant Specials" feature, which allows restaurants to add their location and enables customers to see nearby specials sorted by distance.

## What Was Added

### 1. Database Changes
- **Migration file**: `database/migrations/20260120_add_location_to_profiles.sql`
- Adds `latitude`, `longitude`, and `address` columns to the `profiles` table
- Creates a spatial index for efficient distance calculations

### 2. TypeScript Types
- **File**: `src/lib/supabase.ts`
- Updated `Profile` interface to include:
  - `latitude?: number`
  - `longitude?: number`
  - `address?: string`

### 3. Geocoding Utility
- **File**: `src/lib/geocoding.ts`
- Uses OpenStreetMap Nominatim API (free, no API key needed)
- Converts addresses to latitude/longitude coordinates automatically

### 4. Profile Edit Form
- **File**: `src/components/profile/ProfileEditForm.tsx`
- Added "Location" section with address input field
- Automatically geocodes addresses when restaurants save their profile
- Shows helpful message: "This helps customers find nearby specials on the homepage"

## Setup Instructions

### Step 1: Apply the Database Migration

You need to run the SQL migration in your Supabase database:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy and paste the contents of `database/migrations/20260120_add_location_to_profiles.sql`
6. Click "Run" to execute the migration

**Migration SQL:**
\`\`\`sql
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
\`\`\`

### Step 2: Test the Feature

1. **Start your development server** (if not already running):
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Log in as a restaurant**:
   - Go to your app homepage
   - Log in with a test restaurant account

3. **Add restaurant location**:
   - Click on your profile/settings
   - Scroll down to the new "Location" section
   - Enter a full address (e.g., "123 Main St, New York, NY 10001")
   - Click "Save"
   - The system will automatically geocode the address to coordinates

4. **Verify**:
   - Check the browser console for: "Address geocoded: { address, latitude, longitude }"
   - The profile should save successfully

5. **Test the specials feature**:
   - Create some favorite menu items for the restaurant
   - Log out and visit the homepage as a visitor
   - Allow location access when prompted
   - You should see nearby specials sorted by distance

## How It Works

### For Restaurants:
1. Restaurant enters their address in the profile settings
2. When they click "Save", the address is sent to the OpenStreetMap Nominatim API
3. The API returns latitude and longitude coordinates
4. All three values (address, lat, lng) are saved to the database

### For Customers:
1. Customer visits the homepage
2. Browser requests their current location (they must approve)
3. The `/api/specials` endpoint:
   - Fetches all favorited menu items from public/pro restaurants
   - Calculates distance using the Haversine formula
   - Sorts results by distance (closest first)
   - Returns the top 20 closest specials
4. Customer sees nearby specials with distance displayed (e.g., "2.3km" or "500m")

## API Details

### Geocoding
- **Provider**: OpenStreetMap Nominatim
- **Cost**: Free, no API key required
- **Rate Limit**: ~1 request per second (fine for individual profile updates)
- **User Agent**: "TheMenuGuide/1.0" (as required by Nominatim)

### Distance Calculation
- Uses the Haversine formula for accurate distance on a sphere
- Returns distance in kilometers
- Accounts for Earth's curvature

## Troubleshooting

### Address won't geocode
- Make sure the address is complete and properly formatted
- Try including city, state, and zip code
- Example: "Central Park, New York, NY" works better than "Central Park"

### Specials not showing
- Restaurants must have `is_public = true` and `subscription_status = 'pro'`
- Restaurants must have at least one favorited menu item
- Restaurants must have saved a valid location
- Customer must allow location access in their browser

### Distance not showing
- Both the customer and restaurant must have valid coordinates
- Check browser console for any geocoding errors

## Security & Privacy

- Customer location is **never stored** - only used for real-time calculation
- Customer location is only shared with the backend API, not with restaurants
- Geocoding uses a public, anonymous API (no tracking)
- Restaurants can choose not to provide a location (feature is optional)

## Future Enhancements

Potential improvements:
- Add radius filter (e.g., "within 5km")
- Show map visualization
- Add Google Places autocomplete for better address input
- Cache geocoding results to reduce API calls
- Add manual lat/lng input as fallback
