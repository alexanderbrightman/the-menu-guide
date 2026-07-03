'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { UserLocation } from '@/hooks/useUserLocation'
import {
  DiscoverCardShell,
  DiscoverCardBody,
  PaginationControls,
  LoadingPanel,
  EmptyPanel,
} from '@/components/landing/DiscoverLayout'
import { formatDistanceMiles } from '@/lib/geo'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  restaurant: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    address: string | null
  }
  distance: number | null
}

export interface SpecialsCardProps {
  onItemClick: (special: Special) => void
  className?: string
  location?: UserLocation | null
  locationDenied?: boolean
  locationLoading?: boolean
}

export function SpecialsCard({
  onItemClick,
  className,
  location,
  locationDenied,
  locationLoading,
}: SpecialsCardProps) {
  const isMobile = useIsMobile()
  const [specials, setSpecials] = useState<Special[]>([])
  const [loading, setLoading] = useState(true)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 6

  useEffect(() => {
    if (locationLoading) return

    const fetchSpecials = async () => {
      try {
        const params = new URLSearchParams()
        if (location) {
          params.append('lat', location.latitude.toString())
          params.append('lng', location.longitude.toString())
        }
        const response = await fetch(`/api/specials?${params.toString()}`)
        const data = await response.json()
        if (response.ok && data.specials) setSpecials(data.specials)
      } catch (error) {
        console.error('Error fetching specials:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSpecials()
  }, [location, locationLoading])

  const totalPages = Math.ceil(specials.length / itemsPerPage)
  const displayedSpecials = isMobile
    ? specials
    : specials.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  if (loading || locationLoading) {
    return <LoadingPanel message="Loading specials..." />
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        {displayedSpecials.map((special, index) => (
          <DiscoverCardShell key={`${special.item.id}-${index}`} onClick={() => onItemClick(special)}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.10)]">
              {special.item.image_url && !failedImages.has(special.item.image_url) ? (
                <Image
                  src={special.item.image_url}
                  alt={special.item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                  onError={() => setFailedImages((prev) => new Set(prev).add(special.item.image_url!))}
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
      {!isMobile && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => setCurrentPage((p) => Math.max(0, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}
    </div>
  )
}

export type { Special as SpecialType }
