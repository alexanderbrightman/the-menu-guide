import type { AnalyticsSource, AnalyticsSurface } from '@/lib/analytics-types'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/** Inclusive UTC date range of the last `days` days ending today. */
export function rollingUtcRange(today: Date, days: number): { start: Date; end: Date } {
  const end = startOfUtcDay(today)
  const start = addUtcDays(end, -(days - 1))
  return { start, end }
}

export function previousUtcRange(
  today: Date,
  days: number
): { start: Date; end: Date } {
  const current = rollingUtcRange(today, days)
  const end = addUtcDays(current.start, -1)
  const start = addUtcDays(end, -(days - 1))
  return { start, end }
}

export function dateInInclusiveRange(day: string, start: Date, end: Date): boolean {
  const startDay = utcDateString(start)
  const endDay = utcDateString(end)
  return day >= startDay && day <= endDay
}

export function engagementRate(interactions: number, profileViews: number): number | null {
  if (profileViews <= 0) return null
  return interactions / profileViews
}

/**
 * Percent change vs the previous equal-length period.
 * null = no prior traffic to compare. isNew = first traffic this period.
 */
export function periodChange(
  current: number,
  previous: number
): { changePct: number | null; isNew: boolean } {
  if (previous <= 0 && current <= 0) return { changePct: null, isNew: false }
  if (previous <= 0 && current > 0) return { changePct: null, isNew: true }
  return {
    changePct: ((current - previous) / previous) * 100,
    isNew: false,
  }
}

export function classifyAnalyticsSource(input: {
  surface?: AnalyticsSurface | null
  utmSource?: string | null
  referrerHost?: string | null
  requestHost?: string | null
}): AnalyticsSource {
  if (input.surface === 'discover') return 'discover'

  const utm = (input.utmSource || '').trim().toLowerCase()
  if (utm === 'qr' || utm === 'qrcode' || utm === 'qr-code') return 'qr'
  if (utm === 'instagram' || utm === 'ig') return 'instagram'
  if (utm === 'google' || utm.startsWith('google_')) return 'google'
  if (utm === 'discover' || utm === 'tmg') return 'discover'

  const host = (input.referrerHost || '').trim().toLowerCase().replace(/^www\./, '')
  if (!host) return 'direct'

  const requestHost = (input.requestHost || '').trim().toLowerCase().replace(/^www\./, '')
  if (requestHost && (host === requestHost || host.endsWith(`.${requestHost}`))) {
    return 'discover'
  }

  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram'
  if (host === 'google.com' || host.endsWith('.google.com') || /^google\.[a-z.]+$/.test(host)) {
    return 'google'
  }

  return 'other'
}
