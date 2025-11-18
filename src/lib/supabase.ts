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
  // Catch unhandled promise rejections from Supabase (like refresh token errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    if (error && typeof error === 'object') {
      const errorMessage = String(error.message || '').toLowerCase()
      const errorName = String(error.name || '').toLowerCase()
      
      // Check if it's a refresh token error
      if (
        errorName === 'authapierror' ||
        errorMessage.includes('refresh token') ||
        errorMessage.includes('refresh_token') ||
        errorMessage.includes('invalid refresh token') ||
        errorMessage.includes('refresh token not found')
      ) {
        // Suppress refresh token errors - they're handled gracefully
        event.preventDefault()
        console.log('Refresh token error handled gracefully, clearing invalid session')
        
        // Clear invalid session and localStorage
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
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_current_period_end?: string
  subscription_cancel_at_period_end?: boolean
  subscription_canceled_at?: string
  view_count?: number
  created_at: string
}

export interface MenuCategory {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface MenuItem {
  id: string
  user_id: string
  category_id?: string
  image_url: string
  title: string
  description?: string
  price?: number
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
