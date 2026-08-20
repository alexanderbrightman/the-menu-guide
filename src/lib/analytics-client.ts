'use client'

import type { AnalyticsTrackPayload } from '@/lib/analytics-types'
import { isUuid } from '@/lib/analytics-metrics'

const SESSION_KEY = 'tmg_aid'

function randomSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tmg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function getAnonymousSessionId(): string {
  if (typeof window === 'undefined') return randomSessionId()
  try {
    const existing = window.localStorage.getItem(SESSION_KEY)
    if (existing && existing.length >= 8 && existing.length <= 64) return existing
    const next = randomSessionId()
    window.localStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return randomSessionId()
  }
}

function referrerHost(): string | null {
  if (typeof document === 'undefined') return null
  const raw = document.referrer
  if (!raw) return null
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
}

function utmSource(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return new URLSearchParams(window.location.search).get('utm_source')
  } catch {
    return null
  }
}

/**
 * Fire-and-forget anonymous event. Never throws. Skips invalid restaurant IDs.
 */
export function trackAnalytics(payload: AnalyticsTrackPayload): void {
  if (typeof window === 'undefined') return
  if (!isUuid(payload.restaurant_id)) return
  if (payload.menu_item_id && !isUuid(payload.menu_item_id)) return

  if (payload.event_type === 'profile_view') {
    try {
      const seenKey = `tmg_pv_${payload.restaurant_id}`
      if (window.sessionStorage.getItem(seenKey)) return
      window.sessionStorage.setItem(seenKey, '1')
    } catch {
      // private mode — server unique index still dedupes
    }
  }

  const body = JSON.stringify({
    restaurant_id: payload.restaurant_id,
    event_type: payload.event_type,
    menu_item_id: payload.menu_item_id || null,
    entity_kind: payload.entity_kind || 'menu_item',
    surface: payload.surface || 'menu',
    session_id: getAnonymousSessionId(),
    referrer_host: referrerHost(),
    utm_source: utmSource(),
  })

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never break the diner experience.
  })
}
