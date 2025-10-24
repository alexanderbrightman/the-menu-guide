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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // If user has a Stripe subscription ID, check its status
    if (profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        
        let subscriptionStatus = 'free'
        if (subscription.status === 'active') {
          subscriptionStatus = 'pro'
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          subscriptionStatus = 'canceled'
        }

        // Update profile with current subscription status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: subscriptionStatus,
            is_public: subscriptionStatus === 'pro' ? true : false,
            subscription_current_period_end: (subscription as any).current_period_end 
              ? new Date((subscription as any).current_period_end * 1000).toISOString() 
              : null,
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        return NextResponse.json({ 
          success: true, 
          subscription_status: subscriptionStatus,
          is_public: subscriptionStatus === 'pro' ? true : false
        })
      } catch (stripeError) {
        console.error('Stripe error:', stripeError)
        return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      subscription_status: profile.subscription_status,
      is_public: profile.is_public
    })
  } catch (error) {
    console.error('Error refreshing subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
