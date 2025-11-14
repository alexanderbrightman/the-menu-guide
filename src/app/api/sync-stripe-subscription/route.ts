import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'

// Maximum request body size (1MB)
const MAX_REQUEST_SIZE = 1024 * 1024

// Admin Supabase client for subscription operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413, headers: getSecurityHeaders() })
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 503, headers: getSecurityHeaders() })
    }

    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const supabase = createAuthenticatedClient(token)

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Apply standard rate limiting
    const rateLimit = checkRateLimit(request, user.id, 'sync-stripe-subscription:POST', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        {
          status: 429,
          headers: {
            ...getSecurityHeaders(),
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
          },
        }
      )
    }

    // Search for customers by email in Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 10,
    })

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No Stripe customer found with your email address. Please contact support if you believe you have an active subscription.' },
        { status: 404, headers: getSecurityHeaders() }
      )
    }

    // Look for active subscriptions for each customer
    for (const customer of customers.data) {
      console.log('Checking customer:', customer.id)

      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10,
      })

      console.log('Found subscriptions:', subscriptions.data.length)

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0] // Take the first active subscription

        console.log('Found active subscription:', subscription.id)

        // Update the user's profile with the real Stripe data
        const firstItem = subscription.items?.data?.[0]
        const periodEndSeconds = firstItem?.current_period_end ?? null

        const updateData: Partial<Profile> = {
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_status: 'pro',
          is_public: true,
          subscription_current_period_end: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : undefined,
        }

        const { error: updateError } = await supabaseAdmin.from('profiles').update(updateData).eq('id', user.id)

        if (updateError) {
          console.error('Error updating profile:', updateError)
          return NextResponse.json({ error: 'An error occurred while updating your profile' }, { status: 500, headers: getSecurityHeaders() })
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Successfully synced your account with your Stripe subscription!',
            customer_id: customer.id,
            subscription_id: subscription.id,
            subscription_status: subscription.status,
          },
          {
            headers: {
              ...getSecurityHeaders(),
              ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
            },
          }
        )
      }
    }

    return NextResponse.json(
      { error: 'No active Stripe subscription found for your email address. Please contact support if you believe you have an active subscription.' },
      { status: 404, headers: getSecurityHeaders() }
    )
  } catch (error) {
    console.error('Error syncing subscription:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
