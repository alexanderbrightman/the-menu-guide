import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Admin Supabase client for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint is ready',
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    if (!sig || !webhookSecret) {
      throw new Error('Stripe signature or webhook secret missing.')
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`Received webhook event: ${event.type}`)

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session
          console.log('Checkout session completed:', {
            mode: checkoutSession.mode,
            subscription: checkoutSession.subscription,
            customer: checkoutSession.customer,
            metadata: checkoutSession.metadata,
            customerEmail: checkoutSession.customer_details?.email
          })
          
          if (checkoutSession.mode === 'subscription' && checkoutSession.customer_details?.email) {
            const subscriptionId = checkoutSession.subscription as string
            const customerId = checkoutSession.customer as string
            const userId = checkoutSession.metadata?.userId as string
            const profileId = checkoutSession.metadata?.profileId as string

            console.log('Processing subscription:', { subscriptionId, customerId, userId, profileId })

            await manageSubscriptionStatusChange(
              subscriptionId,
              customerId,
              userId,
              profileId,
              true
            )
          }
          break

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription
          const userIdFromSubscription = subscription.metadata?.userId as string
          const profileIdFromSubscription = subscription.metadata?.profileId as string

          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            userIdFromSubscription,
            profileIdFromSubscription,
            false
          )
          break

        case 'invoice.payment_succeeded':
          console.log('Payment succeeded for subscription')
          break

        case 'invoice.payment_failed':
          console.log('Payment failed for subscription')
          break

        default:
          throw new Error('Unhandled relevant event!')
      }
    } catch (error) {
      console.error('Error handling Stripe event:', error)
      return new NextResponse('Webhook handler failed.', { status: 400 })
    }
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
}

async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  userId: string,
  profileId: string,
  createStripeCustomer: boolean
) {
  try {
    console.log('manageSubscriptionStatusChange called with:', {
      subscriptionId,
      customerId,
      userId,
      profileId,
      createStripeCustomer
    })

    // Retrieve the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    console.log('Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer
    })

    // Find the profile in Supabase
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      console.error('Profile not found for subscription:', error)
      return
    }

    console.log('Found profile:', profile)

    // Determine subscription status based on Stripe subscription status
    let subscriptionStatus = 'free'
    if (subscription.status === 'active') {
      subscriptionStatus = 'pro'
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      subscriptionStatus = 'canceled'
    }

    // Update profile with subscription details
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: subscriptionStatus,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_current_period_end: (subscription as any).current_period_end 
          ? new Date((subscription as any).current_period_end * 1000).toISOString() 
          : null,
        // Set is_public to true when subscription becomes active
        is_public: subscriptionStatus === 'pro' ? true : false,
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
    } else {
      console.log(`Successfully updated profile ${profileId} to ${subscriptionStatus}`)
    }
  } catch (error) {
    console.error('Error in manageSubscriptionStatusChange:', error)
  }
}