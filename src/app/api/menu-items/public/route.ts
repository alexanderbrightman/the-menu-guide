import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSecurityHeaders } from '@/lib/security'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_request: NextRequest) {
  try {
    // Query menu items from public profiles
    // RLS policy ensures only items from is_public=true and subscription_status='pro' profiles are returned
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select(`
        image_url,
        title,
        description,
        price,
        menu_item_tags(
          tags(id, name)
        )
      `)
      .not('image_url', 'is', null)
      .neq('image_url', '')
      .limit(100)

    if (error) {
      console.error('Error fetching public menu items:', error)
      return NextResponse.json(
        { error: 'An error occurred while fetching menu items', details: error.message },
        { status: 500, headers: getSecurityHeaders() }
      )
    }

    // Shuffle the array to randomize order
    const shuffled = (menuItems || []).sort(() => Math.random() - 0.5)

    return NextResponse.json(
      { items: shuffled },
      { headers: getSecurityHeaders() }
    )
  } catch (error) {
    console.error('Error in public menu items fetch:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: getSecurityHeaders() }
    )
  }
}

