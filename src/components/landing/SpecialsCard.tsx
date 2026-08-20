'use client'

import { useState, useEffect } from 'react'
import type { UserLocation } from '@/hooks/useUserLocation'
import {
  DiscoverCardShell,
  DiscoverCardBody,
  DiscoverSkeleton,
  EmptyPanel,
  DISCOVER_GRID_CLASS,
} from '@/components/landing/DiscoverLayout'
import { SmartImage } from '@/components/ui/smart-image'
import { formatDistanceMiles } from '@/lib/geo'
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'
import type { DiscoverRestaurant } from '@/lib/place-links'

export interface Special {
  item: {
    id: string
    title: string
    description: string | null
    price: number | null
    image_url: string | null
    category: string | null
    tags?: { id: number; name: string }[]
  }
  restaurant: DiscoverRestaurant
  distance: number | null
}

export interface SpecialsCardProps {
  onItemClick: (special: Special) => void
  className?: string
  location?: UserLocation | null
  locationDenied?: boolean
}

const CARD_SIZES = '(max-width: 640px) 50vw, 33vw'

export function SpecialsCard({
  onItemClick,
  className,
  location,
  locationDenied,
}: SpecialsCardProps) {
  const [specials, setSpecials] = useState<Special[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const { visibleCount, sentinelRef, hasMore } = useRevealOnScroll(specials.length)

  const lat = location?.latitude
  const lng = location?.longitude

  useEffect(() => {
    let cancelled = false

    const fetchSpecials = async () => {
      try {
        const params = new URLSearchParams()
        if (lat != null && lng != null) {
          params.set('lat', lat.toString())
          params.set('lng', lng.toString())
        }
        const response = await fetch(`/api/specials?${params.toString()}`)
        const data = await response.json()
        if (!cancelled && response.ok && data.specials) {
          setSpecials(data.specials)
        }
      } catch (error) {
        console.error('Error fetching specials:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSpecials()
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  const displayedSpecials = specials.slice(0, visibleCount)

  if (loading && specials.length === 0) {
    return <DiscoverSkeleton />
  }

  if (specials.length === 0) {
    return (
      <EmptyPanel message="Ask your favorite restaurant to join The Menu Guide and star their specials!" />
    )
  }

  return (
    <div className={`flex flex-col ${className || ''}`}>
      {locationDenied && (
        <p className="hidden md:block text-xs text-gray-400 text-center mb-3">Showing all specials</p>
      )}
      <div className={DISCOVER_GRID_CLASS}>
        {displayedSpecials.map((special, index) => (
          <DiscoverCardShell key={special.item.id} onClick={() => onItemClick(special)}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.10)]">
              {special.item.image_url && !failedImages.has(special.item.image_url) ? (
                <SmartImage
                  src={special.item.image_url}
                  alt={special.item.title}
                  className="object-cover"
                  sizes={CARD_SIZES}
                  priority={index < 4}
                  onFatalError={() => setFailedImages((prev) => new Set(prev).add(special.item.image_url!))}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-2xl text-gray-300">🍽️</div>
              )}
            </div>
            <DiscoverCardBody
              title={special.item.title}
              subtitle={special.restaurant.display_name}
              distance={special.distance != null ? formatDistanceMiles(special.distance) : undefined}
            />
          </DiscoverCardShell>
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden="true" />}
    </div>
  )
}

export type { Special as SpecialType }
