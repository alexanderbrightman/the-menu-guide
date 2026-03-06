'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'

interface Restaurant {
  id: string
  display_name: string
  username: string
  address: string | null
  latitude: number
  longitude: number
  avatar_url: string | null
}

const MapLeaflet = dynamic(() => import('./MapLeaflet'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <div className="w-6 h-6 border-2 border-[#FF6259] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function MapSection() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [userLatLng, setUserLatLng] = useState<[number, number] | null>(null)

  useEffect(() => {
    fetch('/api/restaurants/map')
      .then((r) => r.json())
      .then((data) => {
        if (data.restaurants) setRestaurants(data.restaurants)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLatLng([pos.coords.latitude, pos.coords.longitude]),
      () => { /* permission denied */ }
    )
  }, [])

  const nearbyRestaurants = useMemo(() => {
    if (!userLatLng || restaurants.length === 0) return restaurants.slice(0, 5)
    return [...restaurants]
      .map((r) => ({
        ...r,
        distance: haversineMiles(userLatLng[0], userLatLng[1], r.latitude, r.longitude),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
  }, [restaurants, userLatLng])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Map */}
      <div className="w-full flex-shrink-0 rounded-2xl overflow-hidden md:h-[55%] h-[45%]">
        <MapLeaflet restaurants={restaurants} />
      </div>

      {/* Nearby restaurants list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 pt-4 pb-2">
        {nearbyRestaurants.length > 0 ? (
          <div className="space-y-2">
            {nearbyRestaurants.map((r) => {
              const dist = 'distance' in r ? (r as Restaurant & { distance: number }).distance : null
              return (
                <Link
                  key={r.id}
                  href={`/menu/${r.username}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '0.5px solid rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100"
                    style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
                  >
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt={r.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-semibold"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                      >
                        {r.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-gray-900 truncate leading-tight"
                      style={{
                        fontSize: '14px',
                        letterSpacing: '-0.01em',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                      }}
                    >
                      {r.display_name}
                    </p>
                    {dist !== null && (
                      <p
                        className="text-xs leading-tight mt-0.5"
                        style={{
                          color: '#888',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                        }}
                      >
                        {dist < 0.1 ? 'Nearby' : `${dist.toFixed(1)} mi`}
                      </p>
                    )}
                  </div>

                  {/* View Menu button */}
                  <span
                    className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap opacity-70 group-hover:opacity-100"
                    style={{
                      color: '#E8453C',
                      background: 'rgba(232,69,60,0.08)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    View Menu
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-sm text-gray-400"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
            >
              No restaurants nearby yet
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
