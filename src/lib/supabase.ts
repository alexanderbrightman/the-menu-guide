import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Only create client if we have real credentials
export const supabase = supabaseUrl.includes('placeholder') 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })

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
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_current_period_end?: string
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
