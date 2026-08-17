import type { Metadata } from 'next'
import { dishShareDescription, dishShareTitle } from '@/lib/menu-json-ld'
import { sanitizeUUID } from '@/lib/sanitize'
import { absoluteUrl, menuShareUrl, siteOrigin } from '@/lib/site-url'

export function parseItemSearchParam(item: string | string[] | undefined): string | null {
  const raw = Array.isArray(item) ? item[0] : item
  return sanitizeUUID(raw)
}

interface PlaceMeta {
  username: string
  display_name: string
  bio?: string | null
  avatar_url?: string | null
}

interface DishMeta {
  id: string
  title: string
  description?: string | null
  image_url?: string | null
  price?: number | null
}

export function publicMenuMetadata(
  profile: PlaceMeta,
  dish?: DishMeta | null,
  currency?: string
): Metadata {
  const origin = siteOrigin()
  const isDish = Boolean(dish)
  const canonical = menuShareUrl(profile.username, dish?.id, origin)
  const title = dish
    ? dishShareTitle(dish.title, profile.display_name)
    : `${profile.display_name} - Menu`
  const description = dish
    ? dishShareDescription(dish.description, dish.price, currency) ||
      `From ${profile.display_name}`
    : profile.bio?.trim() || `View ${profile.display_name}'s digital menu`

  const imagePath = dish?.image_url || profile.avatar_url
  const imageUrl = imagePath ? absoluteUrl(imagePath, origin) : absoluteUrl('/CarolLogo.png', origin)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: isDish ? 'article' : 'website',
      locale: 'en_US',
      url: canonical,
      siteName: 'The Menu Guide',
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: dish ? dish.title : profile.display_name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
