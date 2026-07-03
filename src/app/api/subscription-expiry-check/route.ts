import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSecurityHeaders } from '@/lib/security'

// Admin Supabase client for subscription operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Verify the request comes from the Vercel cron scheduler (or an operator
 * with the secret). Vercel automatically sends "Authorization: Bearer
 * <CRON_SECRET>" when the CRON_SECRET environment variable is set.
 */
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // Fail closed: without a configured secret, this endpoint is disabled
    console.error('[ExpiryCheck] CRON_SECRET is not configured; rejecting request')
    return false
  }
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

/**
 * Downgrades profiles whose subscription period has ended.
 */
async function runExpiryCheck(): Promise<NextResponse> {
  try {
    console.log('Starting subscription expiry check...')

    // Get all profiles with pro status, excluding complimentary accounts
    // (admin-granted premium never expires)
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, subscription_status, subscription_current_period_end')
      .eq('subscription_status', 'pro')
      .eq('is_complimentary', false)

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError)
      return NextResponse.json({ error: 'An error occurred while fetching profiles' }, { status: 500, headers: getSecurityHeaders() })
    }

    if (!profiles || profiles.length === 0) {
      console.log('No pro profiles found')
      return NextResponse.json(
        {
          message: 'No pro profiles found',
          updated: 0,
        },
        { headers: getSecurityHeaders() }
      )
    }

    const now = new Date()
    let updatedCount = 0
    const expiredProfiles = []

    // Check each profile for expiry
    for (const profile of profiles) {
      if (profile.subscription_current_period_end) {
        const endDate = new Date(profile.subscription_current_period_end)

        if (endDate < now) {
          // Subscription has expired
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              is_public: false,
            })
            .eq('id', profile.id)

          if (updateError) {
            console.error(`Error updating profile ${profile.id}:`, updateError)
          } else {
            console.log(`Updated expired subscription for ${profile.username}`)
            updatedCount++
            expiredProfiles.push({
              id: profile.id,
              username: profile.username,
              expiredOn: endDate.toISOString(),
            })
          }
        }
      }
    }

    console.log(`Subscription expiry check completed. Updated ${updatedCount} profiles.`)

    return NextResponse.json(
      {
        message: `Updated ${updatedCount} expired subscriptions`,
        updated: updatedCount,
        expiredProfiles,
      },
      { headers: getSecurityHeaders() }
    )
  } catch (error) {
    console.error('Error in subscription expiry check:', error)
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500, headers: getSecurityHeaders() })
  }
}

// Vercel cron invokes routes with GET; POST is kept for manual triggering.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
  }
  return runExpiryCheck()
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
  }
  return runExpiryCheck()
}
