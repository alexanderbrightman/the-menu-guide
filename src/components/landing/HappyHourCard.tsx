'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { UserLocation } from '@/hooks/useUserLocation'
import { formatScheduleBadge, formatDistanceMiles } from '@/lib/geo'
import {
  DiscoverCardShell,
  DiscoverCardBody,
  PaginationControls,
  LoadingPanel,
  EmptyPanel,
} from '@/components/landing/DiscoverLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  restaurant: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    address: string | null
  }
  distance: number | null
}

interface Props {
  onItemClick: (entry: HappyHourEntry) => void
  location?: UserLocation | null
  locationDenied?: boolean
  locationLoading?: boolean
  className?: string
}

export function HappyHourCard({ onItemClick, location, locationDenied, locationLoading, className }: Props) {
  const isMobile = useIsMobile()
  const [menus, setMenus] = useState<HappyHourEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 6

  useEffect(() => {
    if (locationLoading) return
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ discover: '1' })
        if (location) {
          params.append('lat', String(location.latitude))
          params.append('lng', String(location.longitude))
        }
        const res = await fetch(`/api/happy-hour?${params}`)
        const data = await res.json()
        if (res.ok) setMenus(data.menus || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [location, locationLoading])

  const totalPages = Math.ceil(menus.length / itemsPerPage)
  const displayedItems = isMobile
    ? menus
    : menus.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  if (loading || locationLoading) return <LoadingPanel message="Loading happy hours..." />
  if (menus.length === 0) return <EmptyPanel message="No happy hours nearby yet. Check back soon!" />

  return (
    <div className={`flex flex-col ${className || ''}`}>
      {locationDenied && (
        <p className="hidden md:block text-xs text-gray-400 text-center mb-3">Showing all happy hours</p>
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        {displayedItems.map((entry) => {
          const photos = entry.menu.photos || []
          const photo = photos[0]?.image_url
          return (
            <DiscoverCardShell key={entry.menu.id} onClick={() => onItemClick(entry)}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.10)]">
                {photo ? (
                  <Image src={photo} alt={entry.menu.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
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
