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

export async function GET(request: NextRequest) {
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
      .select('stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end, created_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      // If user has pro status but no Stripe IDs, provide helpful error message
      if (profile.subscription_status === 'pro') {
        return NextResponse.json({ 
          error: 'Your account shows Premium status but is not connected to Stripe. This may happen if there was an issue with payment processing. Please use the "Sync with Stripe" button to connect your account to your actual subscription.' 
        }, { status: 404 })
      } else {
        return NextResponse.json({ 
          error: 'No active Stripe subscription found. If you recently paid for a subscription, please contact support as there may have been an issue with the payment processing.' 
        }, { status: 404 })
      }
    }

    // Fetch subscription details from Stripe
    let subscription: Stripe.Subscription
    let customer: Stripe.Customer | Stripe.DeletedCustomer
    
    try {
      subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
      customer = await stripe.customers.retrieve(profile.stripe_customer_id)
    } catch (stripeError: unknown) {
      const stripeErr = (stripeError && typeof stripeError === 'object')
        ? stripeError as Stripe.StripeError
        : undefined

      console.error('Error retrieving from Stripe:', stripeError)
      
      // If subscription doesn't exist in Stripe, return appropriate error
      if (stripeErr?.code === 'resource_missing') {
        return NextResponse.json({ 
          error: 'Subscription not found in Stripe. This may indicate a payment processing issue. Please contact support.' 
        }, { status: 404 })
      }
      
      // For other Stripe errors, return generic error
      return NextResponse.json({ 
        error: 'Unable to retrieve subscription details from Stripe' 
      }, { status: 500 })
    }
    
    // Fetch upcoming invoice for renewal information
    let upcomingInvoice = null
    try {
      const upcomingInvoices = await stripe.invoices.list({
        customer: profile.stripe_customer_id,
        status: 'open',
        limit: 1
      })
      upcomingInvoice = upcomingInvoices.data[0] || null
    } catch (error) {
      console.log('No upcoming invoice found:', error)
    }

    // Calculate dates first
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : new Date(profile.created_at).toISOString()
    
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : profile.subscription_current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const daysUntilRenewal = Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

    // Format subscription information
    const subscriptionInfo = {
      // Basic subscription details
      id: subscription.id,
      status: subscription.status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      
      // Pricing information
      amount: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.items.data[0]?.price?.currency || 'usd',
      interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
      
      // Cancellation information
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      
      // Customer information
      customer_email: ('deleted' in customer && customer.deleted) ? '' : customer.email ?? '',
      customer_name: ('deleted' in customer && customer.deleted) ? null : customer.name ?? null,
      
      // Next billing information
      next_billing_date: upcomingInvoice ? new Date(upcomingInvoice.period_end * 1000).toISOString() : null,
      next_billing_amount: upcomingInvoice ? upcomingInvoice.amount_due : null,
      
      // Trial information
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      
      // Status-specific information
      is_active: subscription.status === 'active',
      is_canceled: subscription.status === 'canceled',
      is_past_due: subscription.status === 'past_due',
      is_unpaid: subscription.status === 'unpaid',
      
      // Grace period information
      days_until_renewal: daysUntilRenewal,
      days_until_cancellation: subscription.cancel_at_period_end ? daysUntilRenewal : null
    }

    return NextResponse.json({ subscription: subscriptionInfo })
  } catch (error) {
    console.error('Error fetching subscription details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
