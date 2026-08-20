import { NextRequest } from 'next/server'
import {
  createAuthenticatedClient,
  getAuthToken,
  supabaseAdmin,
} from '@/lib/supabase-server'
import { requirePremium } from '@/lib/premium-server'
import { secureJsonResponse } from '@/lib/security'
import { checkRateLimit, getRateLimitHeaders, STANDARD_RATE_LIMIT } from '@/lib/rate-limiting'
import { addUtcDays, rollingUtcRange, startOfUtcDay, utcDateString } from '@/lib/analytics-metrics'
import {
  buildAnalyticsSummary,
  sumRollups,
  type AnalyticsEventRow,
  type AnalyticsRollupRow,
} from '@/lib/analytics-summary'

export async function GET(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return secureJsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createAuthenticatedClient(token)
  const {
    data: { user },
  } = await supabase.auth.getUser(token)
  if (!user) {
    return secureJsonResponse({ error: 'Unauthorized' }, 401)
  }

  const gate = await requirePremium(supabase, user.id, 'analytics dashboard')
  if (!gate.ok) {
    return secureJsonResponse(gate.body, gate.status)
  }

  const rate = checkRateLimit(
    request,
    user.id,
    'analytics-summary',
    STANDARD_RATE_LIMIT.maxRequests,
    STANDARD_RATE_LIMIT.windowMs
  )
  if (!rate.allowed) {
    return secureJsonResponse(
      { error: 'Too many requests' },
      429,
      getRateLimitHeaders(rate.remaining, rate.resetTime, rate.limit)
    )
  }

  const today = startOfUtcDay(new Date())
  const since = addUtcDays(rollingUtcRange(today, 60).start, 0)
  const sinceIso = since.toISOString()

  const [eventsResult, rollupsResult, platformResult] = await Promise.all([
    supabaseAdmin
      .from('analytics_events')
      .select('event_type, menu_item_id, entity_kind, source, created_at')
      .eq('restaurant_id', user.id)
      .gte('created_at', sinceIso),
    supabaseAdmin
      .from('analytics_daily_rollups')
      .select('day, profile_views, item_clicks, shares')
      .eq('restaurant_id', user.id),
    supabaseAdmin
      .from('analytics_daily_rollups')
      .select('restaurant_id, profile_views, item_clicks, shares')
      .gte('day', utcDateString(rollingUtcRange(today, 7).start)),
  ])

  if (eventsResult.error) {
    console.error('[analytics summary] events', eventsResult.error.message)
    return secureJsonResponse({ error: 'Failed to load analytics' }, 500)
  }
  if (rollupsResult.error) {
    console.error('[analytics summary] rollups', rollupsResult.error.message)
    return secureJsonResponse({ error: 'Failed to load analytics' }, 500)
  }

  const events = (eventsResult.data || []) as AnalyticsEventRow[]
  const rollups = (rollupsResult.data || []) as AnalyticsRollupRow[]
  const allTime = sumRollups(rollups)

  const itemIds = new Set<string>()
  const happyHourIds = new Set<string>()
  const preFixeIds = new Set<string>()
  for (const event of events) {
    if (!event.menu_item_id) continue
    if (event.entity_kind === 'happy_hour') happyHourIds.add(event.menu_item_id)
    else if (event.entity_kind === 'pre_fixe') preFixeIds.add(event.menu_item_id)
    else itemIds.add(event.menu_item_id)
  }

  const itemLookup = new Map<string, { title: string; imageUrl: string | null }>()

  const [menuItemRows, happyHourRows, preFixeRows] = await Promise.all([
    itemIds.size > 0
      ? supabaseAdmin.from('menu_items').select('id, title, image_url').in('id', Array.from(itemIds))
      : Promise.resolve({ data: [] as { id: string; title: string; image_url: string | null }[] }),
    happyHourIds.size > 0
      ? supabaseAdmin
          .from('happy_hour_menus')
          .select('id, title, happy_hour_photos(image_url, sort_order)')
          .in('id', Array.from(happyHourIds))
      : Promise.resolve({ data: [] as { id: string; title: string; happy_hour_photos: { image_url: string; sort_order: number }[] | null }[] }),
    preFixeIds.size > 0
      ? supabaseAdmin.from('prefxe_menus').select('id, title').in('id', Array.from(preFixeIds))
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ])

  for (const row of menuItemRows.data || []) {
    itemLookup.set(`menu_item:${row.id}`, {
      title: row.title,
      imageUrl: row.image_url,
    })
  }
  for (const row of happyHourRows.data || []) {
    const photos = row.happy_hour_photos || []
    const first = [...photos].sort((a, b) => a.sort_order - b.sort_order)[0]
    itemLookup.set(`happy_hour:${row.id}`, {
      title: row.title,
      imageUrl: first?.image_url || null,
    })
  }
  for (const row of preFixeRows.data || []) {
    itemLookup.set(`pre_fixe:${row.id}`, {
      title: row.title,
      imageUrl: null,
    })
  }

  const platformByRestaurant = new Map<string, { views: number; interactions: number }>()
  for (const row of platformResult.data || []) {
    const current = platformByRestaurant.get(row.restaurant_id) || { views: 0, interactions: 0 }
    current.views += row.profile_views || 0
    current.interactions += (row.item_clicks || 0) + (row.shares || 0)
    platformByRestaurant.set(row.restaurant_id, current)
  }

  const summary = buildAnalyticsSummary({
    events,
    allTime:
      allTime.profileViews > 0 || allTime.interactions > 0
        ? allTime
        : sumFromEvents(events),
    itemLookup,
    platformByRestaurant: Array.from(platformByRestaurant.values()),
    now: today,
  })

  return secureJsonResponse(summary)
}

function sumFromEvents(events: AnalyticsEventRow[]) {
  let profileViews = 0
  let interactions = 0
  for (const event of events) {
    if (event.event_type === 'profile_view') profileViews += 1
    else interactions += 1
  }
  return { profileViews, interactions }
}
