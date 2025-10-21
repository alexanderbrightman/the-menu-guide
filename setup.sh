#!/bin/bash

echo "🍽️  Setting up The Menu Guide..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
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
EOF
    echo "✅ Created .env.local file"
else
    echo "⚠️  .env.local already exists, skipping creation"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Create a Supabase project at https://supabase.com"
echo "2. Run the SQL files in the database/ folder in your Supabase SQL editor:"
echo "   - database/schema.sql"
echo "   - database/storage.sql" 
echo "   - database/triggers.sql"
echo "3. Update .env.local with your Supabase credentials"
echo "4. Set up Stripe account and add keys to .env.local"
echo "5. Run: npm run dev"
echo ""
echo "📚 Check README.md for detailed setup instructions"
echo "🎉 Happy coding!"

