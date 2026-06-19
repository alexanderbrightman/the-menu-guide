'use client'

import { useState, useEffect } from 'react'

export interface UserLocation {
  latitude: number
  longitude: number
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLoading(false)
      },
      () => {
        setDenied(true)
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  return { location, denied, loading }
}
