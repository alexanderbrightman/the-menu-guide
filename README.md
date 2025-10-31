# The Menu Guide

A SaaS web platform for restaurant owners to create and manage digital menus with beautiful photo layouts and dietary filtering.

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 2. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the following SQL files in order:
   - `database/schema.sql` - Creates all tables and RLS policies
   - `database/storage.sql` - Sets up storage buckets and policies
   - `database/triggers.sql` - Creates automatic profile creation trigger

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # shadcn/ui components
├── contexts/             # React contexts
├── lib/                  # Utility functions
└── types/                # TypeScript types
```

## 🧩 Key Features

- **Authentication**: Supabase Auth with automatic profile creation
- **Profile Management**: Restaurant owners can edit their profile and upload avatars
- **Menu Management**: Create categories and add menu items with photos
- **Dietary Tagging**: Tag items with dietary restrictions (gluten-free, vegan, etc.)
- **QR Code Generation**: Generate QR codes for public menu access
- **Subscription Management**: Stripe integration for $25/month Pro plan
- **Public Menus**: Customers can view published menus with dietary filtering

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Public menus only visible with active Pro subscription
- Secure file uploads to Supabase Storage

## 💳 Subscription Model

- **Free Plan**: Upload and organize menu items privately
- **Pro Plan ($25/month)**: Publish menu publicly and generate QR codes
- Stripe webhooks automatically update subscription status

## 🎨 Design Inspiration

The UI is inspired by modern social media layouts with:
- Clean, minimalist design
- Grid-based photo layouts
- Professional restaurant branding
- Mobile-responsive design

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:
- Supabase project URL and keys
- Stripe keys and webhook secret
- NextAuth configuration

## 📱 Mobile Support

The application is fully responsive and works great on:
- Desktop computers
- Tablets
- Mobile phones

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.