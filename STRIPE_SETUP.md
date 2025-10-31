# Stripe Payment Setup Guide

## 🎯 **Stripe Setup Instructions**

To complete the payment integration, you need to set up your Stripe account and configure the environment variables.

### **Step 1: Create Stripe Account**
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete the account verification process
3. Get your API keys from the Stripe Dashboard

### **Step 2: Get Your Stripe Keys**
1. In your Stripe Dashboard, go to **Developers > API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

### **Step 3: Set Up Webhook**
1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://your-domain.com/api/stripe/webhook`
   - For local development: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook Secret** (starts with `whsec_`)

### **Step 4: Configure Environment Variables**
Create a `.env.local` file in your project root with:

```env
# Supabase Configuration (you already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration (add these)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Step 5: Test the Payment Flow**
1. Restart your development server: `npm run dev`
2. Go to your dashboard
3. Click "Upgrade Now" button
4. Complete the Stripe checkout process
5. Your account should be upgraded to "pro" status

### **Step 6: Verify Public Menu Access**
Once upgraded to pro:
1. Go to Settings and toggle "Make Menu Public" to ON
2. Visit `/menu/your-username` to see your public menu
3. The QR code should now work properly

## 🔧 **Troubleshooting**

### **Common Issues:**
- **"Stripe not configured"**: Check your environment variables
- **"Webhook signature verification failed"**: Verify your webhook secret
- **"Profile not found"**: Make sure you're logged in
- **Public menu still 404**: Ensure you're upgraded to pro AND have made menu public

### **Testing Webhooks Locally:**
Use ngrok to expose your local server:
```bash
npx ngrok http 3000
```
Then use the ngrok URL for your webhook endpoint.

## 🎉 **You're All Set!**

Once configured, your users can:
- ✅ Upgrade to Pro plan ($25/month)
- ✅ Make their menus public
- ✅ Generate QR codes
- ✅ Access all premium features

The payment flow will automatically:
- Create Stripe customers
- Handle subscription management
- Update user profiles to "pro" status
- Process webhook events
- Handle payment failures and cancellations
