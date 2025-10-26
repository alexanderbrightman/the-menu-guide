-- Add Stripe-related columns to profiles table
-- This migration adds the necessary fields for Stripe subscription management

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_canceled_at timestamp with time zone;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_current_period_end ON profiles(subscription_current_period_end);

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for this profile';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for this profile';
COMMENT ON COLUMN profiles.subscription_current_period_end IS 'End date of current subscription period';
COMMENT ON COLUMN profiles.subscription_cancel_at_period_end IS 'Whether subscription is set to cancel at period end';
COMMENT ON COLUMN profiles.subscription_canceled_at IS 'Timestamp when subscription was canceled';
