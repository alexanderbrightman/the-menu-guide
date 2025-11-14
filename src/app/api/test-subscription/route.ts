import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSecurityHeaders } from '@/lib/security'
import { sanitizeUUID } from '@/lib/sanitize'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

// Admin Supabase client for testing
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers: getSecurityHeaders() })
    }

    const { userId, subscriptionStatus = 'pro' } = await request.json()

    // Validate and sanitize userId
    const sanitizedUserId = sanitizeUUID(userId)
    if (!sanitizedUserId) {
      return NextResponse.json({ error: 'Valid user ID is required' }, { status: 400, headers: getSecurityHeaders() })
    }

    // Validate subscription status
    if (!['free', 'pro', 'canceled'].includes(subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400, headers: getSecurityHeaders() })
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
          subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        }),
      })
      .eq('id', sanitizedUserId)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json({ error: 'An error occurred while updating subscription' }, { status: 500, headers: getSecurityHeaders() })
    }

    return NextResponse.json(
      {
        success: true,
        message: `Subscription status updated to ${subscriptionStatus}`,
        userId: sanitizedUserId,
        subscriptionStatus,
      },
      { headers: getSecurityHeaders() }
    )
  } catch (error) {
    console.error('Error in test subscription update:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
