import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { secureJsonResponse } from '@/lib/security'
import { calculateDistanceMiles, isActiveNow } from '@/lib/geo'
import { requirePremium } from '@/lib/premium-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function formatTime(t: string | null): string {
  if (!t) return '00:00'
  return t.slice(0, 5)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const discover = searchParams.get('discover') === '1'

  if (discover) {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
      .from('prefxe_menus')
      .select(`
        id, title, description, price, start_time, end_time, days_of_week, is_active,
        prefxe_courses (
          id, name, sort_order,
          prefxe_items (
            id, title, description, image_url, sort_order, is_available,
            prefxe_item_tags ( tags ( id, name ) )
          )
        ),
        profiles!inner ( id, username, display_name, avatar_url, address, latitude, longitude )
      `)
      .eq('is_active', true)
      .eq('profiles.is_public', true)
      .eq('profiles.subscription_status', 'pro')

    if (error) {
      console.error('Pre fixe discover error:', error)
      return secureJsonResponse({ error: 'Failed to fetch' }, 500)
    }

    const userLat = lat ? parseFloat(lat) : NaN
    const userLng = lng ? parseFloat(lng) : NaN
    const hasLocation = !isNaN(userLat) && !isNaN(userLng)

    const menus = (data || []).map((m: Record<string, unknown>) => {
      const profile = m.profiles as Record<string, unknown>
      let distance: number | null = null
      if (hasLocation && profile.latitude != null && profile.longitude != null) {
        distance = calculateDistanceMiles(userLat, userLng, profile.latitude as number, profile.longitude as number)
      }
      const startTime = m.start_time ? formatTime(m.start_time as string) : null
      const endTime = m.end_time ? formatTime(m.end_time as string) : null
      const days = (m.days_of_week as number[]) || []
      const courses = ((m.prefxe_courses as Record<string, unknown>[]) || [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map((c) => ({
          ...c,
          prefxe_items: ((c.prefxe_items as Record<string, unknown>[]) || [])
            .filter((i) => i.is_available !== false)
            .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
            .map((i) => ({
              id: i.id,
              title: i.title,
              description: i.description,
              image_url: i.image_url,
              tags: ((i.prefxe_item_tags as Record<string, unknown>[]) || []).map((t) => (t.tags as Record<string, unknown>)),
            })),
        }))

      return {
        menu: {
          id: m.id,
          title: m.title,
          description: m.description,
          price: m.price,
          start_time: startTime,
          end_time: endTime,
          days_of_week: days,
          courses,
          is_active_now: startTime && endTime ? isActiveNow(days, startTime, endTime) : false,
        },
        restaurant: {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          address: profile.address,
        },
        distance,
      }
    })

    menus.sort((a, b) => {
      if (a.menu.is_active_now !== b.menu.is_active_now) return a.menu.is_active_now ? -1 : 1
      if (a.distance === null && b.distance === null) return 0
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })

    return secureJsonResponse(
      { menus: menus.slice(0, limit) },
      200,
      { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    )
  }

  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const { data, error } = await supabase
    .from('prefxe_menus')
    .select(`
      *,
      prefxe_courses (
        id, name, sort_order,
        prefxe_items (
          id, title, description, image_url, sort_order, is_available,
          prefxe_item_tags ( tag_id, tags ( id, name ) )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('sort_order')

  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ menus: data || [] })
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  // Pre fixe menus are a premium feature - enforce server-side
  const premiumGate = await requirePremium(supabase, user.id, 'pre fixe menus')
  if (!premiumGate.ok) return secureJsonResponse(premiumGate.body, premiumGate.status)

  const body = await request.json()
  const { title, description, price, start_time, end_time, days_of_week, is_active } = body
  if (!title?.trim()) return secureJsonResponse({ error: 'Title required' }, 400)

  const { data: menu, error } = await supabase
    .from('prefxe_menus')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      price: price ?? null,
      start_time: start_time || null,
      end_time: end_time || null,
      days_of_week: days_of_week || [0, 1, 2, 3, 4, 5, 6],
      is_active: is_active !== false,
    })
    .select()
    .single()

  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ menu }, 201)
}

export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  // Pre fixe menus are a premium feature - enforce server-side
  const premiumGate = await requirePremium(supabase, user.id, 'pre fixe menus')
  if (!premiumGate.ok) return secureJsonResponse(premiumGate.body, premiumGate.status)

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { error } = await supabase
    .from('prefxe_menus')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ success: true })
}

export async function DELETE(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { error } = await supabase
    .from('prefxe_menus')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ success: true })
}
