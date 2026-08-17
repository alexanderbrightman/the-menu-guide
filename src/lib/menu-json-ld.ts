import { formatPrice } from '@/lib/currency'
import {
  parseOpeningHours,
  WEEKDAY_FULL,
  WEEKDAY_ORDER,
  type Weekday,
} from '@/lib/opening-hours'
import { menuShareUrl } from '@/lib/site-url'

export interface JsonLdProfile {
  username: string
  display_name: string
  bio?: string | null
  avatar_url?: string | null
  address?: string | null
  phone?: string | null
  latitude?: number | null
  longitude?: number | null
  opening_hours?: unknown
}

export interface JsonLdMenuItem {
  id: string
  title: string
  description?: string | null
  image_url?: string | null
  price?: number | null
}

export function restaurantJsonLd(profile: JsonLdProfile, origin?: string) {
  const url = menuShareUrl(profile.username, null, origin)
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: profile.display_name,
    url,
    hasMenu: url,
  }

  if (profile.bio) data.description = profile.bio
  if (profile.avatar_url) data.image = profile.avatar_url
  if (profile.phone) data.telephone = profile.phone
  if (profile.address) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: profile.address,
    }
  }
  if (
    profile.latitude != null &&
    profile.longitude != null &&
    Number.isFinite(profile.latitude) &&
    Number.isFinite(profile.longitude)
  ) {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: profile.latitude,
      longitude: profile.longitude,
    }
  }

  const hours = toOpeningHoursSpecification(profile.opening_hours)
  if (hours.length > 0) data.openingHoursSpecification = hours

  return data
}

export function menuItemJsonLd(
  profile: JsonLdProfile,
  item: JsonLdMenuItem,
  currency = 'USD',
  origin?: string
) {
  const url = menuShareUrl(profile.username, item.id, origin)
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MenuItem',
    name: item.title,
    url,
    isPartOf: {
      '@type': 'Menu',
      url: menuShareUrl(profile.username, null, origin),
      name: `${profile.display_name} menu`,
    },
  }

  if (item.description) data.description = item.description
  if (item.image_url) data.image = item.image_url
  if (typeof item.price === 'number') {
    data.offers = {
      '@type': 'Offer',
      price: item.price.toFixed(2),
      priceCurrency: currency,
      url,
    }
  }

  return data
}

export function dishShareTitle(itemTitle: string, restaurantName: string): string {
  return `${itemTitle} — ${restaurantName}`
}

export function dishShareDescription(
  description: string | null | undefined,
  price: number | null | undefined,
  currency?: string
): string {
  const parts: string[] = []
  if (description?.trim()) parts.push(description.trim())
  if (typeof price === 'number') parts.push(formatPrice(price, currency))
  return parts.join(' · ')
}

function toOpeningHoursSpecification(value: unknown) {
  const hours = parseOpeningHours(value)
  if (!hours) return []
  return WEEKDAY_ORDER.filter((day) => !hours[day].closed).map((day: Weekday) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${WEEKDAY_FULL[day]}`,
    opens: hours[day].open,
    closes: hours[day].close,
  }))
}
