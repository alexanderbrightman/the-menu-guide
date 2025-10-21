# 🚀 The Menu Guide - Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ **Current Status**
- ✅ Git repository initialized and committed
- ✅ All project files ready for deployment
- ✅ Next.js 15 application with TypeScript
- ✅ Supabase integration (Auth, Database, Storage)
- ✅ Stripe payment integration
- ✅ Complete UI with shadcn/ui components

### 🔧 **Next Steps for Deployment**

## 1. **Create GitHub Repository**

### Option A: Using GitHub CLI (Recommended)
```bash
# Install GitHub CLI if not installed
brew install gh

# Login to GitHub
gh auth login

# Create repository and push
gh repo create the-menu-guide --public --source=. --remote=origin --push
```

### Option B: Manual GitHub Setup
1. Go to [github.com](https://github.com) and create a new repository
2. Name it `the-menu-guide`
3. Make it **Public** (required for free Vercel deployment)
4. **Don't** initialize with README (we already have files)

Then run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/the-menu-guide.git
git branch -M main
git push -u origin main
```

## 2. **Deploy to Vercel (Recommended)**

### Why Vercel?
- ✅ **Free tier** with generous limits
- ✅ **Perfect for Next.js** applications
- ✅ **Automatic deployments** from GitHub
- ✅ **Custom domain support**
- ✅ **Built-in SSL certificates**

### Steps:
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account
3. Click "New Project"
4. Import your `the-menu-guide` repository
5. Vercel will auto-detect Next.js settings
6. Add environment variables (see below)
7. Click "Deploy"

### Environment Variables for Vercel:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID=your_stripe_price_id
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

## 3. **Alternative: Deploy to Netlify**

### Steps:
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "New site from Git"
4. Choose your repository
5. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
6. Add environment variables
7. Deploy

## 4. **Set Up Production Services**

### Supabase Production Setup:
1. Create a new Supabase project for production
2. Run the SQL scripts from `database/` folder:
   - `schema.sql` - Creates tables and RLS policies
   - `storage.sql` - Sets up storage buckets
   - `triggers.sql` - Creates database triggers
3. Update environment variables with production URLs

### Stripe Production Setup:
1. Switch to **Live mode** in Stripe Dashboard
2. Get your live API keys
3. Create a production webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, etc.
4. Update environment variables

## 5. **Custom Domain Setup**

### For Vercel:
1. In Vercel dashboard → Project → Settings → Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Follow DNS instructions:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → `76.76.19.61`
4. Vercel will automatically provision SSL

### For Netlify:
1. In Netlify dashboard → Site → Domain management
2. Add custom domain
3. Follow DNS instructions
4. SSL is automatically provisioned

## 💰 **Cost Breakdown**

### Free Tier (Recommended for MVP):
- **Vercel:** Free (100GB bandwidth/month)
- **Supabase:** Free (500MB database, 1GB storage)
- **Stripe:** 2.9% + 30¢ per transaction
- **Domain:** $10-15/year
- **Total:** ~$1-2/month + transaction fees

### Production Tier:
- **Vercel Pro:** $20/month
- **Supabase Pro:** $25/month
- **Stripe:** Same transaction fees
- **Domain:** $10-15/year
- **Total:** ~$45-50/month + transaction fees

## 🔧 **Quick Commands**

```bash
# Push to GitHub
git add .
git commit -m "Your commit message"
git push origin main

# Deploy to Vercel (after GitHub setup)
# Just push to GitHub - Vercel auto-deploys!

# Check deployment status
vercel --prod
```

## 📞 **Support Resources**

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs

## 🎯 **Recommended Next Steps**

1. **Create GitHub repository** (5 minutes)
2. **Deploy to Vercel** (10 minutes)
3. **Set up production Supabase** (15 minutes)
4. **Configure production Stripe** (10 minutes)
5. **Add custom domain** (5 minutes)

**Total setup time: ~45 minutes**

---

Your "The Menu Guide" SaaS platform is ready for deployment! 🚀
