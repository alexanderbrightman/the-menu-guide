import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Only create client if we have real credentials
const supabaseClient = (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder'))
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'the-menu-guide'
      }
    }
  })

// Add global error handler for unhandled Supabase auth errors
if (supabaseClient && typeof window !== 'undefined') {
  // Helper to check if an error is a refresh token error
  const isRefreshTokenError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false

    const errorMessage = String('message' in error ? error.message : '').toLowerCase()
    const errorName = String('name' in error ? error.name : '').toLowerCase()
    const errorString = String(error).toLowerCase()
    const errorCode = 'code' in error ? String(error.code || '').toLowerCase() : ''

    return (
      errorName === 'authapierror' ||
      errorMessage.includes('refresh token') ||
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('invalid refresh token') ||
      errorMessage.includes('refresh token not found') ||
      errorMessage.includes('refresh token: refresh token not found') ||
      errorString.includes('refresh token') ||
      errorString.includes('refresh_token') ||
      errorString.includes('invalid refresh token') ||
      errorString.includes('refresh token not found') ||
      (errorName === 'authapierror' && (errorMessage.includes('not found') || errorMessage.includes('refresh'))) ||
      errorCode === 'pgrst301' // PostgREST auth error code
    )
  }

  // Catch unhandled promise rejections from Supabase (like refresh token errors)
  // This is the primary source of refresh token errors appearing in console
  window.addEventListener('unhandledrejection', (event) => {
    if (isRefreshTokenError(event.reason)) {
      // Suppress refresh token errors - they're handled gracefully
      event.preventDefault()

      // Clear invalid session and localStorage silently
      supabaseClient.auth.signOut().catch(() => {
        // Ignore sign out errors - session may already be cleared
      })

      // Clear Supabase-related localStorage items
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })
      } catch {
        // Ignore localStorage errors
      }
    }
  })

}

export const supabase = supabaseClient

// Database types
export interface Profile {
  id: string
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  qr_code_url?: string
  is_public: boolean
  subscription_status: 'free' | 'pro' | 'canceled'
  menu_font?: string
  menu_background_color?: string
  show_prices?: boolean
  show_display_name?: boolean
  instagram_url?: string
  website_url?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_current_period_end?: string
  subscription_cancel_at_period_end?: boolean
  subscription_canceled_at?: string
  view_count?: number
  currency?: string
  created_at: string
}

export interface MenuCategory {
  id: string
  user_id: string
  name: string
  sort_order?: number
  created_at: string
}

export interface MenuItem {
  id: string
  user_id: string
  category_id?: string
  image_url?: string | null
  title: string
  description?: string
  price?: number
  sort_order?: number
  is_available?: boolean
  created_at: string
}

export interface Tag {
  id: number
  name: string
}

export interface MenuItemTag {
  menu_item_id: string
  tag_id: number
}

export interface UserFavorite {
  user_id: string
  menu_item_id: string
  created_at: string
}

export interface MenuItemWithRelations extends MenuItem {
  menu_categories?: { name: string }
  menu_item_tags?: { tags: { id: number; name: string } }[]
}
