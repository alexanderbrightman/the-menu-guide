import { sanitizeUrl } from '@/lib/sanitize'

export function mapsSearchUrl(address: string, lat?: number | null, lng?: number | null): string {
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, '')
  const numeric = digits.replace(/\D/g, '')
  if (numeric.length < 7) return null
  return `tel:${digits}`
}

export function reservationHref(url: string | null | undefined): string | null {
  if (!url) return null
  return sanitizeUrl(url)
}

export interface DiscoverRestaurant {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  address: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  reservation_url?: string | null
  opening_hours?: unknown
}

function toCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function toDiscoverRestaurant(profile: object): DiscoverRestaurant {
  const rec = profile as Record<string, unknown>
  return {
    id: String(rec.id ?? ''),
    username: String(rec.username ?? ''),
    display_name: String(rec.display_name ?? ''),
    avatar_url: typeof rec.avatar_url === 'string' ? rec.avatar_url : null,
    address: typeof rec.address === 'string' ? rec.address : null,
    latitude: toCoord(rec.latitude),
    longitude: toCoord(rec.longitude),
    phone: typeof rec.phone === 'string' ? rec.phone : null,
    reservation_url:
      typeof rec.reservation_url === 'string' ? sanitizeUrl(rec.reservation_url) : null,
    opening_hours: rec.opening_hours ?? null,
  }
}
