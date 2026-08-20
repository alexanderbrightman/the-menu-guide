import {
  ANALYTICS_SOURCE_LABELS,
  type AnalyticsEntityKind,
  type AnalyticsSource,
  type AnalyticsSummary,
  type AnalyticsTopItem,
  type PeriodMetrics,
  type TrendPoint,
} from '@/lib/analytics-types'
import {
  addUtcDays,
  dateInInclusiveRange,
  engagementRate,
  periodChange,
  previousUtcRange,
  rollingUtcRange,
  utcDateString,
} from '@/lib/analytics-metrics'

export interface AnalyticsEventRow {
  event_type: 'profile_view' | 'item_click' | 'share'
  menu_item_id: string | null
  entity_kind: AnalyticsEntityKind
  source: AnalyticsSource | null
  created_at: string
}

export interface AnalyticsRollupRow {
  day: string
  profile_views: number
  item_clicks: number
  shares: number
}

interface ItemLookup {
  title: string
  imageUrl: string | null
}

function eventDay(createdAt: string): string {
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.getTime())) return createdAt.slice(0, 10)
  return utcDateString(parsed)
}

function tallyPeriod(events: AnalyticsEventRow[], start: Date, end: Date) {
  let profileViews = 0
  let itemClicks = 0
  let shares = 0
  for (const event of events) {
    const day = eventDay(event.created_at)
    if (!dateInInclusiveRange(day, start, end)) continue
    if (event.event_type === 'profile_view') profileViews += 1
    else if (event.event_type === 'item_click') itemClicks += 1
    else if (event.event_type === 'share') shares += 1
  }
  const interactions = itemClicks + shares
  return { profileViews, itemClicks, shares, interactions }
}

function buildPeriod(
  events: AnalyticsEventRow[],
  today: Date,
  days: number
): PeriodMetrics {
  const currentRange = rollingUtcRange(today, days)
  const previousRange = previousUtcRange(today, days)
  const current = tallyPeriod(events, currentRange.start, currentRange.end)
  const previous = tallyPeriod(events, previousRange.start, previousRange.end)
  const change = periodChange(current.profileViews, previous.profileViews)
  const interactionsChange = periodChange(current.interactions, previous.interactions)
  return {
    ...current,
    engagementRate: engagementRate(current.interactions, current.profileViews),
    changePct: change.changePct,
    isNew: change.isNew,
    interactionsChangePct: interactionsChange.changePct,
    interactionsIsNew: interactionsChange.isNew,
  }
}

function buildTrend(events: AnalyticsEventRow[], today: Date, days: number): TrendPoint[] {
  const { start, end } = rollingUtcRange(today, days)
  const byDay = new Map<string, { views: number; interactions: number }>()
  for (const event of events) {
    const day = eventDay(event.created_at)
    if (!dateInInclusiveRange(day, start, end)) continue
    const bucket = byDay.get(day) || { views: 0, interactions: 0 }
    if (event.event_type === 'profile_view') bucket.views += 1
    if (event.event_type === 'item_click' || event.event_type === 'share') {
      bucket.interactions += 1
    }
    byDay.set(day, bucket)
  }

  const points: TrendPoint[] = []
  for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor = addUtcDays(cursor, 1)) {
    const date = utcDateString(cursor)
    const bucket = byDay.get(date) || { views: 0, interactions: 0 }
    points.push({ date, views: bucket.views, interactions: bucket.interactions })
  }
  return points
}

function buildTopItems(
  events: AnalyticsEventRow[],
  start: Date,
  end: Date,
  lookup: Map<string, ItemLookup>
): AnalyticsTopItem[] {
  const counts = new Map<string, { id: string; entityKind: AnalyticsEntityKind; clicks: number }>()
  for (const event of events) {
    if (event.event_type !== 'item_click' || !event.menu_item_id) continue
    const day = eventDay(event.created_at)
    if (!dateInInclusiveRange(day, start, end)) continue
    const key = `${event.entity_kind}:${event.menu_item_id}`
    const existing = counts.get(key)
    if (existing) existing.clicks += 1
    else {
      counts.set(key, {
        id: event.menu_item_id,
        entityKind: event.entity_kind,
        clicks: 1,
      })
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)
    .map((row) => {
      const meta = lookup.get(`${row.entityKind}:${row.id}`)
      return {
        id: row.id,
        title: meta?.title || 'Untitled item',
        clicks: row.clicks,
        imageUrl: meta?.imageUrl || null,
        entityKind: row.entityKind,
      }
    })
}

function buildSources(
  events: AnalyticsEventRow[],
  start: Date,
  end: Date
): AnalyticsSummary['sources7'] {
  const counts = new Map<AnalyticsSource, number>()
  for (const event of events) {
    if (event.event_type !== 'profile_view') continue
    const day = eventDay(event.created_at)
    if (!dateInInclusiveRange(day, start, end)) continue
    const source = event.source || 'direct'
    counts.set(source, (counts.get(source) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([source, views]) => ({
      source,
      label: ANALYTICS_SOURCE_LABELS[source],
      views,
    }))
    .sort((a, b) => b.views - a.views)
}

export function sumRollups(rows: AnalyticsRollupRow[]): {
  profileViews: number
  interactions: number
} {
  let profileViews = 0
  let itemClicks = 0
  let shares = 0
  for (const row of rows) {
    profileViews += row.profile_views || 0
    itemClicks += row.item_clicks || 0
    shares += row.shares || 0
  }
  return { profileViews, interactions: itemClicks + shares }
}

export function platformEngagement(
  byRestaurant: Array<{ views: number; interactions: number }>,
  thisRestaurantRate: number | null
): { engagementRate: number | null; multiplier: number | null } {
  const eligible = byRestaurant.filter((row) => row.views >= 5)
  if (eligible.length === 0) {
    return { engagementRate: null, multiplier: null }
  }
  const avg =
    eligible.reduce((sum, row) => sum + row.interactions / row.views, 0) / eligible.length
  if (!Number.isFinite(avg) || avg <= 0) {
    return { engagementRate: null, multiplier: null }
  }
  return {
    engagementRate: avg,
    multiplier:
      thisRestaurantRate != null && Number.isFinite(thisRestaurantRate)
        ? thisRestaurantRate / avg
        : null,
  }
}

export function buildAnalyticsSummary(input: {
  events: AnalyticsEventRow[]
  allTime: { profileViews: number; interactions: number }
  itemLookup: Map<string, ItemLookup>
  platformByRestaurant: Array<{ views: number; interactions: number }>
  now?: Date
}): AnalyticsSummary {
  const today = input.now ?? new Date()
  const week = buildPeriod(input.events, today, 7)
  const month = buildPeriod(input.events, today, 30)
  const range7 = rollingUtcRange(today, 7)
  const range30 = rollingUtcRange(today, 30)

  return {
    week,
    month,
    allTime: input.allTime,
    trend7: buildTrend(input.events, today, 7),
    trend30: buildTrend(input.events, today, 30),
    topItems7: buildTopItems(input.events, range7.start, range7.end, input.itemLookup),
    topItems30: buildTopItems(input.events, range30.start, range30.end, input.itemLookup),
    sources7: buildSources(input.events, range7.start, range7.end),
    sources30: buildSources(input.events, range30.start, range30.end),
    platform: platformEngagement(input.platformByRestaurant, week.engagementRate),
  }
}
