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

export interface PreFixeEntry {
  menu: {
    id: string
    title: string
    description: string | null
    price: number | null
    start_time: string | null
    end_time: string | null
    days_of_week: number[]
    courses: {
      id: string
      name: string
      prefxe_items: {
        id: string
        title: string
        description: string | null
        image_url: string | null
        tags: { id: number; name: string }[]
      }[]
    }[]
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
  onItemClick: (entry: PreFixeEntry) => void
  location?: UserLocation | null
  locationDenied?: boolean
  locationLoading?: boolean
  className?: string
}

function getHeroImage(entry: PreFixeEntry): string | null {
  for (const course of entry.menu.courses || []) {
    for (const item of course.prefxe_items || []) {
      if (item.image_url) return item.image_url
    }
  }
  return null
}

export function PreFixeCard({ onItemClick, location, locationDenied, locationLoading, className }: Props) {
  const isMobile = useIsMobile()
  const [menus, setMenus] = useState<PreFixeEntry[]>([])
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
        const res = await fetch(`/api/prefxe?${params}`)
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

  if (loading || locationLoading) return <LoadingPanel message="Loading pre fixe menus..." />
  if (menus.length === 0) return <EmptyPanel message="No pre fixe menus nearby yet. Check back soon!" />

  return (
    <div className={`flex flex-col ${className || ''}`}>
      {locationDenied && (
        <p className="hidden md:block text-xs text-gray-400 text-center mb-3">Showing all pre fixe menus</p>
      )}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        {displayedItems.map((entry) => {
          const hero = getHeroImage(entry)
          return (
            <DiscoverCardShell key={entry.menu.id} onClick={() => onItemClick(entry)}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_6px_20px_rgba(0,0,0,0.10)]">
                {hero ? (
                  <Image src={hero} alt={entry.menu.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
                )}
                {entry.menu.is_active_now && (
                  <span className="absolute top-2 left-2 text-[10px] font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                    Live
                  </span>
                )}
              </div>
              <DiscoverCardBody
                title={entry.menu.title}
                subtitle={entry.restaurant.display_name}
                distance={entry.distance != null ? formatDistanceMiles(entry.distance) : undefined}
                meta={
                  <>
                    {entry.menu.price != null && `$${Number(entry.menu.price).toFixed(0)}`}
                    {entry.menu.price != null && entry.menu.start_time && entry.menu.end_time ? ' · ' : ''}
                    {entry.menu.start_time && entry.menu.end_time
                      ? formatScheduleBadge(entry.menu.days_of_week, entry.menu.start_time, entry.menu.end_time)
                      : ''}
                  </>
                }
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
