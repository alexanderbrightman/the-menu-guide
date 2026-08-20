import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getSecurityHeaders, secureJsonResponse } from '@/lib/security'
import {
  checkRateLimit,
  getRateLimitHeaders,
  ANALYTICS_INGEST_RATE_LIMIT,
} from '@/lib/rate-limiting'
import {
  ANALYTICS_ENTITY_KINDS,
  ANALYTICS_EVENT_TYPES,
  type AnalyticsEntityKind,
  type AnalyticsEventType,
  type AnalyticsSurface,
} from '@/lib/analytics-types'
import { classifyAnalyticsSource, isUuid } from '@/lib/analytics-metrics'

const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/

function noContent(extra: Record<string, string> = {}) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...getSecurityHeaders(), ...extra },
  })
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim()
  if (ip) return ip
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === request.nextUrl.origin
  } catch {
    return false
  }
}

function asEventType(value: unknown): AnalyticsEventType | null {
  return typeof value === 'string' &&
    (ANALYTICS_EVENT_TYPES as readonly string[]).includes(value)
    ? (value as AnalyticsEventType)
    : null
}

function asEntityKind(value: unknown): AnalyticsEntityKind {
  return typeof value === 'string' &&
    (ANALYTICS_ENTITY_KINDS as readonly string[]).includes(value)
    ? (value as AnalyticsEntityKind)
    : 'menu_item'
}

function asSurface(value: unknown): AnalyticsSurface {
  return value === 'discover' ? 'discover' : 'menu'
}

function hostFromValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 253)
  if (!trimmed) return null
  // Accept a hostname, never a full URL with query (could contain PII).
  if (trimmed.includes('/') || trimmed.includes('?') || trimmed.includes('@')) return null
  return trimmed.toLowerCase()
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return secureJsonResponse({ error: 'Forbidden' }, 403)
  }

  const rate = checkRateLimit(
    request,
    clientKey(request),
    'analytics-events',
    ANALYTICS_INGEST_RATE_LIMIT.maxRequests,
    ANALYTICS_INGEST_RATE_LIMIT.windowMs
  )
  if (!rate.allowed) {
    return secureJsonResponse(
      { error: 'Too many requests' },
      429,
      getRateLimitHeaders(rate.remaining, rate.resetTime, rate.limit)
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return secureJsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const restaurantId = typeof body.restaurant_id === 'string' ? body.restaurant_id : ''
  const eventType = asEventType(body.event_type)
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : ''
  const menuItemId =
    typeof body.menu_item_id === 'string' && isUuid(body.menu_item_id)
      ? body.menu_item_id
      : null

  if (!isUuid(restaurantId) || !eventType || !SESSION_RE.test(sessionId)) {
    return noContent()
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, is_public')
    .eq('id', restaurantId)
    .maybeSingle()

  if (profileError || !profile?.is_public) {
    return noContent()
  }

  const source = classifyAnalyticsSource({
    surface: asSurface(body.surface),
    utmSource: typeof body.utm_source === 'string' ? body.utm_source.slice(0, 64) : null,
    referrerHost: hostFromValue(body.referrer_host),
    requestHost: request.nextUrl.hostname,
  })

  const { error } = await supabaseAdmin.from('analytics_events').insert({
    restaurant_id: restaurantId,
    menu_item_id: eventType === 'profile_view' ? null : menuItemId,
    entity_kind: asEntityKind(body.entity_kind),
    event_type: eventType,
    session_id: sessionId,
    source,
  })

  if (error && error.code !== '23505') {
    console.error('[analytics ingest]', error.message)
  }

  return noContent(getRateLimitHeaders(rate.remaining, rate.resetTime, rate.limit))
}
