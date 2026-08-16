'use client'

import { useState, useEffect } from 'react'

export interface UserLocation {
  latitude: number
  longitude: number
}

/**
 * Ask for GPS in the background. Discover feeds fetch immediately without
 * waiting; they refetch when coordinates arrive. Browser `maximumAge`
 * reuses a recent fix so we do not block on a new satellite lock.
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setDenied(false)
      },
      () => {
        setDenied(true)
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }, [])

  return { location, denied }
}
