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

// GET — owner list OR public discover (?discover=1&lat=&lng=)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const discover = searchParams.get('discover') === '1'

  if (discover) {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabase
      .from('happy_hour_menus')
      .select(`
        id, title, description, start_time, end_time, days_of_week, is_active,
        happy_hour_photos ( id, image_url, sort_order ),
        profiles!inner ( id, username, display_name, avatar_url, address, latitude, longitude, is_public, subscription_status, is_complimentary )
      `)
      .eq('is_active', true)
      .eq('profiles.is_public', true)
      // Premium access = paid subscription OR admin-granted complimentary flag
      .or('subscription_status.eq.pro,is_complimentary.eq.true', { referencedTable: 'profiles' })

    if (error) {
      console.error('Happy hour discover error:', error)
      return secureJsonResponse({ error: 'Failed to fetch' }, 500)
    }

    const userLat = lat ? parseFloat(lat) : NaN
    const userLng = lng ? parseFloat(lng) : NaN
    const hasLocation = !isNaN(userLat) && !isNaN(userLng)

    const menus = (data || []).map((m: Record<string, unknown>) => {
      const profile = m.profiles as Record<string, unknown>
      let distance: number | null = null
      if (hasLocation && profile.latitude != null && profile.longitude != null) {
        distance = calculateDistanceMiles(
          userLat, userLng,
          profile.latitude as number, profile.longitude as number
        )
      }
      const photos = ((m.happy_hour_photos as Record<string, unknown>[]) || [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      const startTime = formatTime(m.start_time as string)
      const endTime = formatTime(m.end_time as string)
      const days = m.days_of_week as number[]
      return {
        menu: {
          id: m.id,
          title: m.title,
          description: m.description,
          start_time: startTime,
          end_time: endTime,
          days_of_week: days,
          photos,
          is_active_now: isActiveNow(days, startTime, endTime),
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
      if (a.menu.is_active_now !== b.menu.is_active_now) {
        return a.menu.is_active_now ? -1 : 1
      }
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
    .from('happy_hour_menus')
    .select(`*, happy_hour_photos ( id, image_url, sort_order )`)
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

  // Happy hour menus are a premium feature - enforce server-side
  const premiumGate = await requirePremium(supabase, user.id, 'happy hour menus')
  if (!premiumGate.ok) return secureJsonResponse(premiumGate.body, premiumGate.status)

  const body = await request.json()
  const { title, description, start_time, end_time, days_of_week, is_active, photos } = body

  if (!title?.trim()) return secureJsonResponse({ error: 'Title required' }, 400)

  const { data: menu, error } = await supabase
    .from('happy_hour_menus')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      start_time: start_time || '16:00',
      end_time: end_time || '18:00',
      days_of_week: days_of_week || [1, 2, 3, 4, 5],
      is_active: is_active !== false,
    })
    .select()
    .single()

  if (error) return secureJsonResponse({ error: error.message }, 500)

  if (photos?.length) {
    await supabase.from('happy_hour_photos').insert(
      photos.map((p: { image_url: string; sort_order?: number }, i: number) => ({
        menu_id: menu.id,
        image_url: p.image_url,
        sort_order: p.sort_order ?? i,
      }))
    )
  }

  return secureJsonResponse({ menu }, 201)
}

export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  // Happy hour menus are a premium feature - enforce server-side
  const premiumGate = await requirePremium(supabase, user.id, 'happy hour menus')
  if (!premiumGate.ok) return secureJsonResponse(premiumGate.body, premiumGate.status)

  const body = await request.json()
  const { id, photos, ...updates } = body
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { error } = await supabase
    .from('happy_hour_menus')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return secureJsonResponse({ error: error.message }, 500)

  if (photos !== undefined) {
    await supabase.from('happy_hour_photos').delete().eq('menu_id', id)
    if (photos.length) {
      await supabase.from('happy_hour_photos').insert(
        photos.map((p: { image_url: string; sort_order?: number }, i: number) => ({
          menu_id: id,
          image_url: p.image_url,
          sort_order: p.sort_order ?? i,
        }))
      )
    }
  }

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
    .from('happy_hour_menus')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ success: true })
}
