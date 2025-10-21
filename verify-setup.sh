#!/bin/bash

echo "🍽️  The Menu Guide - Supabase Setup Verification"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Please create it with your Supabase credentials"
    exit 1
fi

# Check if Supabase URL is configured
if grep -q "your-project.supabase.co" .env.local; then
    echo "⚠️  Supabase URL not configured in .env.local"
    echo "Please update NEXT_PUBLIC_SUPABASE_URL with your actual project URL"
    exit 1
fi

# Check if Supabase anon key is configured
if grep -q "your_anon_key_here" .env.local; then
    echo "⚠️  Supabase anon key not configured in .env.local"
    echo "Please update NEXT_PUBLIC_SUPABASE_ANON_KEY with your actual anon key"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Test Supabase connection
echo "🔍 Testing Supabase connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

supabase.from('profiles').select('count').then(({ data, error }) => {
    if (error) {
        console.log('❌ Database connection failed:', error.message);
        process.exit(1);
    } else {
        console.log('✅ Database connection successful!');
        console.log('✅ Tables are accessible');
        process.exit(0);
    }
}).catch(err => {
    console.log('❌ Connection test failed:', err.message);
    process.exit(1);
});
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup complete! You can now run:"
    echo "   npm run dev"
    echo ""
    echo "Then visit: http://localhost:3000"
else
    echo ""
    echo "❌ Setup incomplete. Please check:"
    echo "1. Supabase project is created"
    echo "2. Database schema is set up (run SQL files)"
    echo "3. Environment variables are correct"
fi

