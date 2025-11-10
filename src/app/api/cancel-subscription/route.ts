import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Helper to create a Supabase client with the user's token
const getSupabaseClientWithAuth = (token: string) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

// Admin Supabase client for subscription operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 })
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseClientWithAuth(token)

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      return NextResponse.json({ 
        error: 'No active Stripe subscription found' 
      }, { status: 404 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 })
    }

    // Cancel the subscription at the end of the current period
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    ) as Stripe.Subscription

    // Update the database to reflect the cancellation
    // Keep subscription_status as 'pro' until the actual end date
    // Only update the cancellation flag and keep premium features active
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_canceled_at: new Date().toISOString(),
        subscription_cancel_at_period_end: true
        // Keep subscription_status as 'pro' and is_public as true until period ends
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      // Don't fail the request since Stripe was updated successfully
    }

    return NextResponse.json({ 
      success: true,
      message: 'Your subscription has been canceled and will end at the end of your current billing period.',
      subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    })

  } catch (error: unknown) {
    console.error('Error canceling subscription:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'resource_missing') {
      return NextResponse.json({ 
        error: 'Subscription not found in Stripe. Please contact support.' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: `Unable to cancel subscription: ${error && typeof error === 'object' && 'message' in error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}
