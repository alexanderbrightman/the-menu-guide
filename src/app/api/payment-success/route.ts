import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

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

// Admin Supabase client for reliable updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
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

    console.log('Processing payment success for user:', user.id, user.email)

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email, username')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('Current profile:', profile)

    // Strategy 1: Check if user already has a customer ID and active subscription
    let activeSubscription = null
    let customerId = null

    if (profile.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: profile.stripe_customer_id,
          status: 'active',
          limit: 1
        })
        
        if (subscriptions.data.length > 0) {
          activeSubscription = subscriptions.data[0]
          customerId = profile.stripe_customer_id
          console.log('Found active subscription by customer ID:', activeSubscription.id)
        }
      } catch (error) {
        console.error('Error fetching subscriptions by customer ID:', error)
      }
    }

    // Strategy 2: If no customer ID or subscription found, search by email
    if (!activeSubscription && user.email) {
      try {
        console.log('Searching for customer by email:', user.email)
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 5 // Get more customers in case there are multiple
        })
        
        console.log('Found customers:', customers.data.length)
        
        for (const customer of customers.data) {
          console.log('Checking customer:', customer.id, 'for active subscriptions')
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
          })
          
          if (subscriptions.data.length > 0) {
            activeSubscription = subscriptions.data[0]
            customerId = customer.id
            console.log('Found active subscription by email:', activeSubscription.id)
            break
          }
        }
      } catch (error) {
        console.error('Error fetching customer by email:', error)
      }
    }

    // Strategy 3: Search recent checkout sessions for this user
    if (!activeSubscription && user.email) {
      try {
        console.log('Searching recent checkout sessions for email:', user.email)
        const sessions = await stripe.checkout.sessions.list({
          limit: 10,
          expand: ['data.subscription']
        })
        
        for (const session of sessions.data) {
          if (session.customer_details?.email === user.email && 
              session.payment_status === 'paid' && 
              session.subscription) {
            console.log('Found paid checkout session:', session.id)
            
            // Get the subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
            if (subscription.status === 'active') {
              activeSubscription = subscription
              customerId = session.customer as string
              console.log('Found active subscription from checkout session:', subscription.id)
              break
            }
          }
        }
      } catch (error) {
        console.error('Error searching checkout sessions:', error)
      }
    }

    // Update profile with subscription details
    const updateData: any = {
      subscription_status: 'pro',
      is_public: true,
    }

    if (activeSubscription) {
      updateData.stripe_customer_id = customerId
      updateData.stripe_subscription_id = activeSubscription.id
      updateData.subscription_current_period_end = new Date((activeSubscription as any).current_period_end * 1000).toISOString()
      console.log('Updating with subscription details:', {
        customerId,
        subscriptionId: activeSubscription.id,
        periodEnd: updateData.subscription_current_period_end
      })
    } else {
      console.log('No active subscription found, updating to pro status anyway')
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating subscription status:', updateError)
      return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 })
    }

    console.log('Successfully updated profile to Premium for user:', user.id)

    // Verify the update was successful
    const { data: updatedProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, is_public, stripe_subscription_id, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (verifyError) {
      console.error('Error verifying profile update:', verifyError)
    } else {
      console.log('Verified profile update:', updatedProfile)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment processed successfully',
      subscription_status: 'pro',
      is_public: true,
      subscription_id: activeSubscription?.id || null,
      customer_id: customerId,
      verified: updatedProfile
    })
  } catch (error) {
    console.error('Error processing payment success:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
