import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { Profile } from '@/lib/supabase'

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

// In-memory idempotency store (in production, use Redis or database)
const processedEvents = new Map<string, number>()

// Clean up old entries every hour (in production, use TTL)
setInterval(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (timestamp < oneDayAgo) {
      processedEvents.delete(eventId)
    }
  }
}, 60 * 60 * 1000)

export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint is ready',
    timestamp: new Date().toISOString()
  })
}

export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!stripe) {
    console.error('[Webhook] Stripe not configured')
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Webhook] Signature verification failed: ${message}`)
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
  }

  // Check idempotency - prevent processing same event multiple times
  const eventId = event.id
  if (processedEvents.has(eventId)) {
    console.log(`[Webhook] Event ${eventId} already processed, skipping`)
    return new NextResponse(JSON.stringify({ received: true, skipped: true }), { status: 200 })
  }

  console.log(`[Webhook] Received event: ${event.type} (ID: ${eventId})`)

  if (relevantEvents.has(event.type)) {
    try {
      // Mark event as being processed
      processedEvents.set(eventId, Date.now())

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event)
          break

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionChange(event)
          break

        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event)
          break

        case 'invoice.payment_failed':
          console.log('[Webhook] Payment failed - logging for monitoring')
          break

        default:
          throw new Error('Unhandled relevant event!')
      }

      console.log(`[Webhook] Successfully processed event: ${event.type}`)
    } catch (error) {
      console.error(`[Webhook] Error handling event ${event.type}:`, error)
      // Remove from processed events on error so it can be retried
      processedEvents.delete(eventId)
      return new NextResponse(`Webhook handler failed: ${error}`, { status: 400 })
    }
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session
  console.log('[Checkout] Session completed:', {
    id: checkoutSession.id,
    mode: checkoutSession.mode,
    paymentStatus: checkoutSession.payment_status,
    subscription: checkoutSession.subscription,
    customer: checkoutSession.customer,
    metadata: checkoutSession.metadata,
    customerEmail: checkoutSession.customer_details?.email
  })

  // Only process subscription checkout sessions
  if (checkoutSession.mode !== 'subscription') {
    console.log('[Checkout] Not a subscription checkout, skipping')
    return
  }

  const subscriptionId = checkoutSession.subscription as string
  const customerId = checkoutSession.customer as string
  const userId = checkoutSession.metadata?.userId as string
  const profileId = checkoutSession.metadata?.profileId as string

  if (!subscriptionId || !customerId) {
    console.error('[Checkout] Missing subscription or customer ID')
    return
  }

  if (!userId || !profileId) {
    console.error('[Checkout] Missing userId or profileId in metadata')
    return
  }

  console.log('[Checkout] Processing subscription:', { subscriptionId, customerId, userId, profileId })

  await manageSubscriptionStatusChange(
    stripe!,
    subscriptionId,
    customerId,
    userId,
    profileId,
    false
  )
}

async function handleSubscriptionChange(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  console.log('[Subscription] Event received:', {
    type: event.type,
    subscriptionId: subscription.id,
    status: subscription.status,
    customer: subscription.customer,
    metadata: subscription.metadata
  })

  const userIdFromSubscription = subscription.metadata?.userId as string
  const profileIdFromSubscription = subscription.metadata?.profileId as string

  // If metadata is missing, try to find profile by customer email
  if (!userIdFromSubscription || !profileIdFromSubscription) {
    console.log('[Subscription] Missing metadata, attempting to find profile by customer email')
    try {
      const customer = await stripe!.customers.retrieve(subscription.customer as string)
      if (customer && !customer.deleted && customer.email) {
        // Alternative: search by username or look up in auth.users
        // For now, we'll log this and require metadata
        console.error('[Subscription] Cannot automatically find profile without metadata')
      }
    } catch (error) {
      console.error('[Subscription] Error retrieving customer:', error)
    }
  }

  if (userIdFromSubscription && profileIdFromSubscription) {
    await manageSubscriptionStatusChange(
      stripe!,
      subscription.id,
      subscription.customer as string,
      userIdFromSubscription,
      profileIdFromSubscription,
      false
    )
  } else {
    console.error('[Subscription] Could not determine user/profile for subscription:', subscription.id)
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription }
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription?.id || null
    
  console.log('[Invoice] Payment succeeded:', {
    invoiceId: invoice.id,
    customer: invoice.customer,
    subscription: subscriptionId,
    amount: invoice.amount_paid
  })

  // If this is for a subscription, ensure the subscription status is updated
  if (subscriptionId) {
    
    // Retrieve the subscription to get its status
    const subscription = await stripe!.subscriptions.retrieve(subscriptionId)
    console.log('[Invoice] Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status
    })

    // Update the profile with subscription info if we can find it
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (profile) {
      console.log('[Invoice] Found profile for subscription:', profile)
      await manageSubscriptionStatusChange(
        stripe!,
        subscription.id,
        subscription.customer as string,
        profile.id,
        profile.id,
        false
      )
    } else {
      console.warn('[Invoice] No profile found for subscription:', subscriptionId)
    }
  }
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
    console.log('[ManageSubscription] Called with:', {
      subscriptionId,
      customerId,
      userId,
      profileId,
      createStripeCustomer
    })

    // Validate required parameters
    if (!subscriptionId || !customerId || !userId || !profileId) {
      console.error('[ManageSubscription] Missing required parameters')
      return
    }

    // Retrieve the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
    console.log('[ManageSubscription] Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
      current_period_end: subscription.items?.data?.[0]?.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    })

    // Find the profile in Supabase
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, subscription_status')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      console.error('[ManageSubscription] Profile not found:', error)
      return
    }

    console.log('[ManageSubscription] Found profile:', profile)

    // Determine subscription status based on Stripe subscription status
    let subscriptionStatus = 'free'
    let isPublic = false
    
    if (subscription.status === 'active') {
      subscriptionStatus = 'pro'
      isPublic = true
    } else if (subscription.status === 'canceled') {
      // Check if subscription was canceled at period end or immediately
      const currentPeriodEnd = subscription.items?.data?.[0]?.current_period_end
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
    const updateData: Partial<Profile> = {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_cancel_at_period_end: subscription.cancel_at_period_end || false,
      is_public: isPublic
    }
    updateData.subscription_status = subscriptionStatus

    const periodEndSeconds = subscription.items?.data?.[0]?.current_period_end
    updateData.subscription_current_period_end = periodEndSeconds
      ? new Date(periodEndSeconds * 1000).toISOString()
      : undefined

    // Add cancellation timestamp if subscription is canceled
    if (subscription.status === 'canceled' && subscription.canceled_at) {
      updateData.subscription_canceled_at = new Date(subscription.canceled_at * 1000).toISOString()
    } else if (subscription.status !== 'canceled') {
      updateData.subscription_canceled_at = undefined
    }

    console.log('[ManageSubscription] Updating profile with data:', updateData)

    // Update profile with subscription details
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id)

    if (updateError) {
      console.error('[ManageSubscription] Error updating subscription:', updateError)
      throw updateError
    } else {
      console.log(`[ManageSubscription] Successfully updated profile ${profileId} (${profile.username}) to ${subscriptionStatus}`)
    }
  } catch (error) {
    console.error('[ManageSubscription] Error in manageSubscriptionStatusChange:', error)
    // Re-throw to ensure webhook returns error status
    throw error
  }
}