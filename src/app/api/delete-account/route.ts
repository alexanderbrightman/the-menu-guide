import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { PREMIUM_API_HEADERS } from '@/lib/premium-validation'

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

// Admin Supabase client for data deletion
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: NextRequest) {
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

    // Get the user's profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('Starting account deletion for user:', user.id)

    // Step 1: Cancel Stripe subscription if exists
    if (profile.stripe_subscription_id) {
      try {
        console.log('Canceling Stripe subscription:', profile.stripe_subscription_id)
        await stripe.subscriptions.cancel(profile.stripe_subscription_id, {
          prorate: false, // Don't prorate - cancel immediately
        })
        console.log('Stripe subscription canceled successfully')
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError)
        // Continue with deletion even if Stripe fails
      }
    }

    // Step 2: Delete Stripe customer if exists
    if (profile.stripe_customer_id) {
      try {
        console.log('Deleting Stripe customer:', profile.stripe_customer_id)
        await stripe.customers.del(profile.stripe_customer_id)
        console.log('Stripe customer deleted successfully')
      } catch (stripeError) {
        console.error('Error deleting Stripe customer:', stripeError)
        // Continue with deletion even if Stripe fails
      }
    }

    // Step 3: Delete all user data from Supabase (using admin client)
    console.log('Deleting user data from Supabase...')
    
    // First, get all file paths for storage deletion
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    const { data: menuItems } = await supabaseAdmin
      .from('menu_items')
      .select('id, image_url')
      .eq('user_id', user.id)

    // Delete files from storage
    try {
      console.log('Deleting files from storage...')
      
      // Delete avatar
      if (profileData?.avatar_url) {
        try {
          // Extract file path from Supabase storage URL
          const urlParts = profileData.avatar_url.split('/')
          const bucketIndex = urlParts.findIndex((part: string) => part === 'avatars')
          
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            // Get path after bucket name (e.g., "userId/filename.webp")
            const avatarPath = urlParts.slice(bucketIndex + 1).join('/')
            await supabaseAdmin.storage.from('avatars').remove([avatarPath])
            console.log('Avatar deleted from storage')
          }
        } catch (avatarError) {
          console.warn('Error deleting avatar from storage:', avatarError)
        }
      }

      // Delete menu item images
      if (menuItems && menuItems.length > 0) {
        const imagePaths = menuItems
          .map(item => item.image_url)
          .filter(url => url)
          .map(url => {
            // Extract file path from Supabase storage URL
            // URL format: https://project.supabase.co/storage/v1/object/public/bucket_name/path/to/file
            const urlParts = url.split('/')
            const bucketIndex = urlParts.findIndex((part: string) => part === 'menu_items')
            
            if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
              // Get path after bucket name (e.g., "userId/filename.webp")
              return urlParts.slice(bucketIndex + 1).join('/')
            }
            return null
          })
          .filter((path): path is string => path !== null)
        
        if (imagePaths.length > 0) {
          await supabaseAdmin.storage.from('menu_items').remove(imagePaths)
          console.log(`${imagePaths.length} menu images deleted from storage`)
        }
      }
    } catch (storageError) {
      console.error('Error deleting files from storage:', storageError)
      // Continue with database deletion even if storage fails
    }
    
    // Delete in order to respect foreign key constraints
    const deletionSteps = [
      // Delete menu item tags first (junction table)
      async () => {
        if (menuItems && menuItems.length > 0) {
          const menuItemIds = menuItems.map(item => item.id)
          return supabaseAdmin
            .from('menu_item_tags')
            .delete()
            .in('menu_item_id', menuItemIds)
        }
        return { error: null }
      },
      
      // Delete menu items
      () => supabaseAdmin
        .from('menu_items')
        .delete()
        .eq('user_id', user.id),
      
      // Delete menu categories
      () => supabaseAdmin
        .from('menu_categories')
        .delete()
        .eq('user_id', user.id),
      
      // Delete profile
      () => supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id),
    ]

    // Execute deletion steps
    for (const step of deletionSteps) {
      try {
        const { error } = await step()
        if (error) {
          console.error('Error in deletion step:', error)
          // Continue with other steps even if one fails
        }
      } catch (error) {
        console.error('Error executing deletion step:', error)
      }
    }

    // Step 4: Delete user from Supabase Auth (this will cascade delete profile)
    console.log('Deleting user from Supabase Auth...')
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      if (authDeleteError) {
        console.error('Error deleting user from auth:', authDeleteError)
        return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
      }
      console.log('User deleted from Supabase Auth successfully')
    } catch (error) {
      console.error('Error deleting user from auth:', error)
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
    }

    console.log('Account deletion completed successfully for user:', user.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully. All data has been permanently removed.',
      deletedAt: new Date().toISOString()
    }, {
      headers: PREMIUM_API_HEADERS
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred while deleting your account. Please contact support.' 
    }, { status: 500 })
  }
}
