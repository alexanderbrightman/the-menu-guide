import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
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

    // Search for customers by email in Stripe
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 10
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ 
        error: 'No Stripe customer found with your email address. Please contact support if you believe you have an active subscription.' 
      }, { status: 404 })
    }

    // Look for active subscriptions for each customer
    for (const customer of customers.data) {
      console.log('Checking customer:', customer.id)
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 10
      })

      console.log('Found subscriptions:', subscriptions.data.length)

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0] // Take the first active subscription
        
        console.log('Found active subscription:', subscription.id)

        // Update the user's profile with the real Stripe data
        const updateData: Partial<Profile> = {
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_status: 'pro',
          is_public: true,
          subscription_current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : undefined
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating profile:', updateError)
          return NextResponse.json({ error: 'Failed to update profile with Stripe data' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true,
          message: 'Successfully synced your account with your Stripe subscription!',
          customer_id: customer.id,
          subscription_id: subscription.id,
          subscription_status: subscription.status
        })
      }
    }

    return NextResponse.json({ 
      error: 'No active Stripe subscription found for your email address. Please contact support if you believe you have an active subscription.' 
    }, { status: 404 })

  } catch (error) {
    console.error('Error syncing subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
