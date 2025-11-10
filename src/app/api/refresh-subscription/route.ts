import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { Profile } from '@/lib/supabase'

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
    const supabase = createClient(
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

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('Current profile:', profile)

    // If user has a Stripe subscription ID, check its status
    if (profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id) as Stripe.Subscription
        
        console.log('Retrieved subscription:', {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer
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
        }
        updateData.subscription_current_period_end = periodEndSeconds
          ? new Date(periodEndSeconds * 1000).toISOString()
          : undefined

        updateData.subscription_status = subscriptionStatus

        if (typeof subscription.customer === 'string') {
          updateData.stripe_customer_id = subscription.customer
        }

        // Set is_public to true when subscription is active
        if (subscriptionStatus === 'pro') {
          updateData.is_public = true
        } else if (subscriptionStatus === 'canceled') {
          updateData.is_public = false
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        console.log(`Successfully updated profile ${profile.id} to ${subscriptionStatus}`)

        return NextResponse.json({ 
          success: true, 
          subscriptionStatus,
          message: `Subscription status updated to ${subscriptionStatus}` 
        })

      } catch (stripeError) {
        console.error('Error retrieving subscription from Stripe:', stripeError)
        return NextResponse.json({ error: 'Failed to retrieve subscription from Stripe' }, { status: 500 })
      }
    } else {
      return NextResponse.json({ 
        success: true, 
        subscriptionStatus: 'free',
        message: 'No Stripe subscription found - user remains on free plan' 
      })
    }

  } catch (error) {
    console.error('Error in refresh subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}