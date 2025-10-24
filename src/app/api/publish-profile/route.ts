import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateApiPremiumAccess, PREMIUM_API_HEADERS, createPremiumErrorResponse } from '@/lib/premium-validation'

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, is_public')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate premium access for public profile publishing
    const premiumValidation = validateApiPremiumAccess(profile, 'public profile publishing')
    if (!premiumValidation.isValid) {
      return NextResponse.json(
        createPremiumErrorResponse(premiumValidation.error!, premiumValidation.statusCode!),
        { 
          status: premiumValidation.statusCode!,
          headers: PREMIUM_API_HEADERS
        }
      )
    }

    // Update profile to be public
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_public: true })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile to public:', updateError)
      return NextResponse.json({ error: 'Failed to publish profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile published successfully',
      is_public: true
    }, {
      headers: PREMIUM_API_HEADERS
    })
  } catch (error) {
    console.error('Error publishing profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
