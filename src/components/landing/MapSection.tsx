'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

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
      <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export function MapSection() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])

  useEffect(() => {
    fetch('/api/restaurants/map')
      .then((r) => r.json())
      .then((data) => {
        if (data.restaurants) setRestaurants(data.restaurants)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="w-full h-full relative">
      <MapLeaflet restaurants={restaurants} />
    </div>
  )
}
