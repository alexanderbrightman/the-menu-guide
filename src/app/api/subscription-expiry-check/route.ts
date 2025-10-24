import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Supabase client for subscription operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Updates expired subscriptions in the database
 * This endpoint can be called by a cron job or scheduled task
 */
export async function POST(_request: NextRequest) {
  try {
    console.log('Starting subscription expiry check...')
    
    // Get all profiles with pro status
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, subscription_status, subscription_current_period_end')
      .eq('subscription_status', 'pro')

    if (fetchError) {
      console.error('Error fetching profiles:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      console.log('No pro profiles found')
      return NextResponse.json({ 
        message: 'No pro profiles found',
        updated: 0
      })
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
              is_public: false
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
              expiredOn: endDate.toISOString()
            })
          }
        }
      }
    }

    console.log(`Subscription expiry check completed. Updated ${updatedCount} profiles.`)

    return NextResponse.json({
      message: `Updated ${updatedCount} expired subscriptions`,
      updated: updatedCount,
      expiredProfiles
    })

  } catch (error) {
    console.error('Error in subscription expiry check:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(_request: NextRequest) {
  try {
    // Get all profiles with pro status and their expiry info
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, subscription_status, subscription_current_period_end')
      .eq('subscription_status', 'pro')

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    const now = new Date()
    const profilesWithStatus = profiles?.map(profile => {
      let status = 'active'
      let daysUntilExpiry = null
      
      if (profile.subscription_current_period_end) {
        const endDate = new Date(profile.subscription_current_period_end)
        const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (endDate < now) {
          status = 'expired'
        } else {
          daysUntilExpiry = Math.max(0, daysUntil)
        }
      }

      return {
        id: profile.id,
        username: profile.username,
        status,
        daysUntilExpiry,
        subscriptionEnd: profile.subscription_current_period_end
      }
    }) || []

    return NextResponse.json({
      profiles: profilesWithStatus,
      total: profilesWithStatus.length,
      expired: profilesWithStatus.filter(p => p.status === 'expired').length,
      active: profilesWithStatus.filter(p => p.status === 'active').length
    })

  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
