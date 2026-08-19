'use client'

import { useState, useEffect } from 'react'
import type { UserLocation } from '@/hooks/useUserLocation'
import { formatScheduleBadge, formatDistanceMiles } from '@/lib/geo'
import {
  DiscoverCardShell,
  DiscoverCardBody,
  DiscoverSkeleton,
  EmptyPanel,
} from '@/components/landing/DiscoverLayout'
import { SmartImage } from '@/components/ui/smart-image'
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'
import type { DiscoverRestaurant } from '@/lib/place-links'

export interface HappyHourEntry {
  menu: {
    id: string
    title: string
    description: string | null
    start_time: string
    end_time: string
    days_of_week: number[]
    photos: { id: string; image_url: string; sort_order: number }[]
    is_active_now: boolean
  }
  restaurant: DiscoverRestaurant
  distance: number | null
}

interface Props {
  onItemClick: (entry: HappyHourEntry) => void
  location?: UserLocation | null
  locationDenied?: boolean
  className?: string
}

const CARD_SIZES = '(max-width: 640px) 50vw, 33vw'

export function HappyHourCard({ onItemClick, location, locationDenied, className }: Props) {
  const [menus, setMenus] = useState<HappyHourEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const { visibleCount, sentinelRef, hasMore } = useRevealOnScroll(menus.length)

  const lat = location?.latitude
  const lng = location?.longitude

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ discover: '1' })
        if (lat != null && lng != null) {
          params.set('lat', String(lat))
          params.set('lng', String(lng))
        }
        const res = await fetch(`/api/happy-hour?${params}`)
        const data = await res.json()
        if (!cancelled && res.ok) setMenus(data.menus || [])
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  const displayedItems = menus.slice(0, visibleCount)

  if (loading && menus.length === 0) return <DiscoverSkeleton />
  if (menus.length === 0) return <EmptyPanel message="No happy hours nearby yet. Check back soon!" />

  return (
    <div className={`flex flex-col ${className || ''}`}>
      {locationDenied && (
        <p className="hidden md:block text-xs text-gray-400 text-center mb-3">Showing all happy hours</p>
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        {displayedItems.map((entry, index) => {
          const photos = entry.menu.photos || []
          const photo = photos[0]?.image_url
          return (
            <DiscoverCardShell key={entry.menu.id} onClick={() => onItemClick(entry)}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.10)]">
                {photo && !failedImages.has(photo) ? (
                  <SmartImage
                    src={photo}
                    alt={entry.menu.title}
                    className="object-cover"
                    sizes={CARD_SIZES}
                    priority={index < 4}
                    onFatalError={() => setFailedImages((prev) => new Set(prev).add(photo))}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🍸</div>
                )}
                {entry.menu.is_active_now && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                    Live
                  </span>
                )}
                {photos.length > 1 && (
                  <span className="absolute bottom-2 right-2 text-[10px] bg-black/45 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    +{photos.length}
                  </span>
                )}
              </div>
              <DiscoverCardBody
                title={entry.menu.title}
                subtitle={entry.restaurant.display_name}
                distance={entry.distance != null ? formatDistanceMiles(entry.distance) : undefined}
                meta={formatScheduleBadge(entry.menu.days_of_week, entry.menu.start_time, entry.menu.end_time)}
              />
            </DiscoverCardShell>
          )
        })}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}
    </div>
  )
}
