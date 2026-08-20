export const ANALYTICS_EVENT_TYPES = ['profile_view', 'item_click', 'share'] as const
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]

export const ANALYTICS_ENTITY_KINDS = ['menu_item', 'happy_hour', 'pre_fixe'] as const
export type AnalyticsEntityKind = (typeof ANALYTICS_ENTITY_KINDS)[number]

export const ANALYTICS_SOURCES = [
  'instagram',
  'google',
  'qr',
  'discover',
  'direct',
  'other',
] as const
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number]

export const ANALYTICS_SOURCE_LABELS: Record<AnalyticsSource, string> = {
  instagram: 'Instagram',
  google: 'Google',
  qr: 'QR code',
  discover: 'The Menu Guide',
  direct: 'Direct',
  other: 'Other',
}

export type AnalyticsSurface = 'menu' | 'discover'

export interface AnalyticsTrackPayload {
  restaurant_id: string
  event_type: AnalyticsEventType
  menu_item_id?: string | null
  entity_kind?: AnalyticsEntityKind
  surface?: AnalyticsSurface
}

export interface PeriodMetrics {
  profileViews: number
  itemClicks: number
  shares: number
  interactions: number
  engagementRate: number | null
  changePct: number | null
  isNew: boolean
  interactionsChangePct: number | null
  interactionsIsNew: boolean
}

export interface TrendPoint {
  date: string
  views: number
  interactions: number
}

export interface AnalyticsTopItem {
  id: string
  title: string
  clicks: number
  imageUrl: string | null
  entityKind: AnalyticsEntityKind
}

export interface AnalyticsSourceRow {
  source: AnalyticsSource
  label: string
  views: number
}

export interface AnalyticsSummary {
  week: PeriodMetrics
  month: PeriodMetrics
  allTime: {
    profileViews: number
    interactions: number
  }
  trend7: TrendPoint[]
  trend30: TrendPoint[]
  topItems7: AnalyticsTopItem[]
  topItems30: AnalyticsTopItem[]
  sources7: AnalyticsSourceRow[]
  sources30: AnalyticsSourceRow[]
  platform: {
    engagementRate: number | null
    multiplier: number | null
  }
}
