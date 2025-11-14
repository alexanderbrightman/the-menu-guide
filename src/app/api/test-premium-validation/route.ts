import { NextRequest, NextResponse } from 'next/server'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { getSecurityHeaders } from '@/lib/security'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get and validate auth token
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    const supabase = createAuthenticatedClient(token)

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: getSecurityHeaders() })
    }

    // Test premium validation for different features
    const menuVisibilityValidation = validatePremiumAccess(profile, 'menu visibility')
    const qrCodeValidation = validatePremiumAccess(profile, 'QR code generation')
    const publicMenuValidation = validatePremiumAccess(profile, 'public menu')

    // Calculate subscription status
    let subscriptionStatus = 'unknown'
    let daysUntilExpiry = null
    let isExpired = false

    if (profile.subscription_current_period_end) {
      const endDate = new Date(profile.subscription_current_period_end)
      const now = new Date()
      isExpired = endDate < now
      daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (isExpired) {
        subscriptionStatus = 'expired'
      } else if (profile.subscription_cancel_at_period_end) {
        subscriptionStatus = 'canceled_but_active'
      } else {
        subscriptionStatus = 'active'
      }
    } else {
      subscriptionStatus = profile.subscription_status
    }

    return NextResponse.json(
      {
        profile: {
          id: profile.id,
          username: profile.username,
          subscription_status: profile.subscription_status,
          subscription_current_period_end: profile.subscription_current_period_end,
          subscription_cancel_at_period_end: profile.subscription_cancel_at_period_end,
          subscription_canceled_at: profile.subscription_canceled_at,
          is_public: profile.is_public,
        },
        subscriptionStatus: {
          status: subscriptionStatus,
          isExpired,
          daysUntilExpiry: Math.max(0, daysUntilExpiry || 0),
          endDate: profile.subscription_current_period_end,
        },
        premiumValidation: {
          menuVisibility: {
            isValid: menuVisibilityValidation.isValid,
            error: menuVisibilityValidation.error,
          },
          qrCode: {
            isValid: qrCodeValidation.isValid,
            error: qrCodeValidation.error,
          },
          publicMenu: {
            isValid: publicMenuValidation.isValid,
            error: publicMenuValidation.error,
          },
        },
        summary: {
          hasPremiumAccess: menuVisibilityValidation.isValid,
          canMakePublic: menuVisibilityValidation.isValid,
          canGenerateQR: qrCodeValidation.isValid,
          canAccessPublicMenu: publicMenuValidation.isValid,
        },
      },
      { headers: getSecurityHeaders() }
    )
  } catch (error) {
    console.error('Error testing premium validation:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}
