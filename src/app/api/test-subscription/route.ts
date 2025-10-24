import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Supabase client for testing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, subscriptionStatus = 'pro' } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Validate subscription status
    if (!['free', 'pro', 'canceled'].includes(subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 })
    }

    // Update the user's subscription status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
        is_public: subscriptionStatus === 'pro' ? true : false,
        // Add some test Stripe data if setting to pro
        ...(subscriptionStatus === 'pro' && {
          stripe_customer_id: 'cus_test_' + Date.now(),
          stripe_subscription_id: 'sub_test_' + Date.now(),
          subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Subscription status updated to ${subscriptionStatus}`,
      userId,
      subscriptionStatus
    })

  } catch (error) {
    console.error('Error in test subscription update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
