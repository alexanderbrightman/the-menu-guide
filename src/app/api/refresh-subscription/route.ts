import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
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
    const rateLimit = checkRateLimit(request, user.id, 'refresh-subscription:POST', STANDARD_RATE_LIMIT.maxRequests, STANDARD_RATE_LIMIT.windowMs)

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

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    console.log('Current profile:', profile)

    // If user has a Stripe subscription ID, check its status
    if (profile.stripe_subscription_id) {
      try {
        const subscription = (await stripe.subscriptions.retrieve(profile.stripe_subscription_id)) as Stripe.Subscription

        console.log('Retrieved subscription:', {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
        })

        // Determine subscription status
        let subscriptionStatus: Profile['subscription_status'] = 'free'
        if (subscription.status === 'active') {
          subscriptionStatus = 'pro'
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'past_due') {
          subscriptionStatus = 'canceled'
        }

        // Update profile with current subscription status
        const firstItem = subscription.items?.data?.[0]
        const periodEndSeconds = firstItem?.current_period_end ?? null

        const updateData: Partial<Profile> = {
          stripe_subscription_id: subscription.id,
          subscription_status: subscriptionStatus,
          subscription_current_period_end: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : undefined,
        }

        if (typeof subscription.customer === 'string') {
          updateData.stripe_customer_id = subscription.customer
        }

        // Set is_public to true when subscription is active
        if (subscriptionStatus === 'pro') {
          updateData.is_public = true
        } else if (subscriptionStatus === 'canceled') {
          updateData.is_public = false
        }

        const { error: updateError } = await supabaseAdmin.from('profiles').update(updateData).eq('id', profile.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return NextResponse.json({ error: 'An error occurred while updating subscription' }, { status: 500, headers: getSecurityHeaders() })
        }

        console.log(`Successfully updated profile ${profile.id} to ${subscriptionStatus}`)

        return NextResponse.json(
          {
            success: true,
            subscriptionStatus,
            message: `Subscription status updated to ${subscriptionStatus}`,
          },
          {
            headers: {
              ...getSecurityHeaders(),
              ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
            },
          }
        )
      } catch (stripeError) {
        console.error('Error retrieving subscription from Stripe:', stripeError)
        return NextResponse.json({ error: 'An error occurred while retrieving subscription from Stripe' }, { status: 500, headers: getSecurityHeaders() })
      }
    } else {
      return NextResponse.json(
        {
          success: true,
          subscriptionStatus: 'free',
          message: 'No Stripe subscription found - user remains on free plan',
        },
        {
          headers: {
            ...getSecurityHeaders(),
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit),
          },
        }
      )
    }
  } catch (error) {
    console.error('Error in refresh subscription:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
