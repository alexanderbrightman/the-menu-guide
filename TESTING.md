# 🧪 Testing The Menu Guide

## Current Status
The development server should be running at: **http://localhost:3000**

## ⚠️ Important: Environment Setup Required

Before testing, you need to set up your Supabase project:

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for it to finish setting up

### 2. Run Database Setup
In your Supabase SQL Editor, run these files in order:
1. `database/schema.sql` - Creates all tables and RLS policies
2. `database/storage.sql` - Sets up storage buckets
3. `database/triggers.sql` - Creates automatic profile creation

### 3. Get Your Credentials
From your Supabase project dashboard:
- Go to Settings → API
- Copy your Project URL and anon key
- Go to Settings → API → Service Role (for the service role key)

### 4. Update Environment Variables
Create/edit `.env.local` with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 What You Can Test

### ✅ Working Features (with Supabase setup):
1. **Authentication**
   - Sign up with email, username, and restaurant name
   - Sign in with existing account
   - Automatic profile creation

2. **Profile Management**
   - View dashboard with profile information
   - Edit profile (name, username, bio)
   - Upload avatar image
   - View subscription status

3. **UI/UX**
   - Clean, modern interface
   - Responsive design
   - Professional styling

### ⚠️ Features Not Yet Implemented:
- Menu item creation/management
- Category management
- Dietary tagging
- QR code generation
- Stripe payments
- Public menu pages

## 🐛 Troubleshooting

### If you see errors:
1. **"Invalid API key"** - Check your Supabase credentials in `.env.local`
2. **"Table doesn't exist"** - Run the database setup SQL files
3. **"Storage bucket not found"** - Run `database/storage.sql`
4. **"Profile not created"** - Run `database/triggers.sql`

### If the server won't start:
1. Check if port 3000 is available
2. Try `npm run dev` again
3. Check for any error messages in the terminal

## 🎯 Next Steps After Testing

Once you've confirmed the basic functionality works:
1. **Menu Management** - Add CRUD for categories and menu items
2. **Image Upload** - Implement menu item photo uploads
3. **Dietary Tags** - Add tagging system for dietary restrictions
4. **Stripe Integration** - Set up subscription payments
5. **Public Pages** - Create customer-facing menu pages
6. **QR Codes** - Generate QR codes for restaurant tables

## 📱 Test on Different Devices

The app is responsive, so test on:
- Desktop browser
- Mobile browser
- Tablet browser

Let me know what you find during testing!

