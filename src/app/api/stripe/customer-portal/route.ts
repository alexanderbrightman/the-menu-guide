import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

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
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'No Stripe customer ID found. This may happen if your subscription was created before the customer portal was set up. Please contact support for assistance.' 
      }, { status: 400 })
    }

    // Get base URL with proper protocol and port
    const host = request.headers.get('host') || 'localhost:3000'
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
    const baseUrl = `${protocol}://${host}`

    // Create Stripe customer portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${baseUrl}/dashboard`,
      })

      return NextResponse.json({ url: session.url })
    } catch (stripeError: any) {
      console.error('Stripe customer portal error:', stripeError)
      console.error('Error details:', {
        code: stripeError.code,
        message: stripeError.message,
        type: stripeError.type,
        customer_id: profile.stripe_customer_id
      })
      
      // Handle specific Stripe errors
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json({ 
          error: 'Customer not found in Stripe. Please contact support for assistance.' 
        }, { status: 404 })
      }
      
      if (stripeError.code === 'billing_portal_configuration_inactive') {
        return NextResponse.json({ 
          error: 'Stripe customer portal is not configured. Please contact support to enable subscription management.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: `Unable to access Stripe customer portal: ${stripeError.message}` 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
