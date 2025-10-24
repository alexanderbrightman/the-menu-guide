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
  // Check if Stripe is configured
  if (!stripe) {
    return new NextResponse('Stripe not configured', { status: 503 })
  }

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
              stripe,
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
          console.log('Subscription event received:', {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            metadata: subscription.metadata
          })

          // Try to get metadata from subscription, or find profile by customer email
          let userIdFromSubscription = subscription.metadata?.userId as string
          let profileIdFromSubscription = subscription.metadata?.profileId as string

          // If metadata is missing, try to find profile by customer email
          if (!userIdFromSubscription || !profileIdFromSubscription) {
            console.log('Missing metadata, attempting to find profile by customer email')
            const customer = await stripe.customers.retrieve(subscription.customer as string)
            if (customer && !customer.deleted && customer.email) {
              const { data: profileByEmail } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('username', customer.email) // Assuming email matches username
                .single()
              
              if (profileByEmail) {
                userIdFromSubscription = profileByEmail.id
                profileIdFromSubscription = profileByEmail.id
                console.log('Found profile by email:', profileByEmail)
              }
            }
          }

          if (userIdFromSubscription && profileIdFromSubscription) {
            await manageSubscriptionStatusChange(
              stripe,
              subscription.id,
              subscription.customer as string,
              userIdFromSubscription,
              profileIdFromSubscription,
              false
            )
          } else {
            console.error('Could not determine user/profile for subscription:', subscription.id)
          }
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
  stripe: Stripe,
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

    // Validate required parameters
    if (!subscriptionId || !customerId || !userId || !profileId) {
      console.error('Missing required parameters for subscription update')
      return
    }

    // Retrieve the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    console.log('Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
      current_period_end: (subscription as any).current_period_end
    })

    // Find the profile in Supabase
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, subscription_status')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      console.error('Profile not found for subscription:', error)
      return
    }

    console.log('Found profile:', profile)

    // Determine subscription status based on Stripe subscription status
    let subscriptionStatus = 'free'
    let isPublic = false
    
    if (subscription.status === 'active') {
      subscriptionStatus = 'pro'
      isPublic = true
    } else if (subscription.status === 'canceled') {
      // Check if subscription was canceled at period end or immediately
      const currentPeriodEnd = (subscription as any).current_period_end
      const now = Math.floor(Date.now() / 1000)
      
      if (subscription.cancel_at_period_end && currentPeriodEnd > now) {
        // Subscription is canceled but still active until period end
        subscriptionStatus = 'pro'
        isPublic = true
      } else {
        // Subscription has actually ended
        subscriptionStatus = 'canceled'
        isPublic = false
      }
    } else if (subscription.status === 'unpaid' || subscription.status === 'past_due') {
      subscriptionStatus = 'canceled'
      isPublic = false
    }

    // Prepare update data
    const updateData: any = {
      subscription_status: subscriptionStatus,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_current_period_end: (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000).toISOString() 
        : null,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
      is_public: isPublic
    }

    // Add cancellation timestamp if subscription is canceled
    if (subscription.status === 'canceled') {
      updateData.subscription_canceled_at = subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString()
    }

    console.log('Updating profile with data:', updateData)

    // Update profile with subscription details
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      throw updateError
    } else {
      console.log(`Successfully updated profile ${profileId} (${profile.username}) to ${subscriptionStatus}`)
    }
  } catch (error) {
    console.error('Error in manageSubscriptionStatusChange:', error)
    // Re-throw to ensure webhook returns error status
    throw error
  }
}