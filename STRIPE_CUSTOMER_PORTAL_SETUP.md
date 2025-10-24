# Stripe Customer Portal Setup Guide

## The Issue
The "Unable to access Stripe customer portal" error occurs because Stripe's customer portal needs to be configured in your Stripe dashboard before it can be used.

## How to Fix It

### Step 1: Enable Customer Portal in Stripe Dashboard
1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Billing** → **Customer portal**
3. Click **"Activate test link"** (for test mode) or **"Activate live link"** (for production)
4. Configure the portal settings:
   - **Business information**: Add your business name and support email
   - **Features**: Enable the features you want customers to access:
     - ✅ Update payment methods
     - ✅ View billing history
     - ✅ Cancel subscriptions
     - ✅ Update billing information

### Step 2: Configure Portal Features
In the customer portal configuration:
- **Subscription cancellation**: Choose "Cancel at period end" (recommended)
- **Payment method updates**: Enable for customers
- **Billing history**: Enable for customers
- **Support information**: Add your support email

### Step 3: Test the Portal
1. Save your configuration
2. Test the portal with a test customer
3. Verify that subscription cancellation works

## Alternative: Direct Cancellation API
If you prefer not to use the customer portal, the app now includes a direct cancellation API that allows users to cancel their subscriptions without going through Stripe's portal.

## What This Enables
Once configured, users will be able to:
- ✅ Cancel their subscriptions
- ✅ Update payment methods
- ✅ View billing history
- ✅ Update billing information
- ✅ Download invoices

## Security Note
The customer portal is secure and only accessible to authenticated customers. Stripe handles all the security and authentication for you.
