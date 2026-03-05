'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useMemo, useState } from 'react'

interface Restaurant {
  id: string
  display_name: string
  username: string
  address: string | null
  latitude: number
  longitude: number
  avatar_url: string | null
}

interface Props {
  restaurants: Restaurant[]
}

// Stamen Toner tile (white bg, black roads, transit stops)
const TONER_URL = 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png'
const TONER_ATTRIBUTION =
  '&copy; <a href="https://stamen.com">Stamen Design</a> &copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function getMiniMapUrl(lat: number, lng: number): string {
  const z = 15
  const n = Math.pow(2, z)
  const x = Math.floor(((lng + 180) / 360) * n)
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  )
  return `https://tiles.stadiamaps.com/tiles/stamen_toner/${z}/${x}/${y}.png`
}

function createDotIcon(size: number, centerColor: string, edgeColor: string, pulse = false) {
  const bg = `radial-gradient(circle at center, ${centerColor} 0%, ${edgeColor} 100%)`
  return L.divIcon({
    html: `<div class="${pulse ? 'orb-core' : 'orb-core-selected'}" style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: '',
  })
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

// On touch devices: single finger scrolls the page, two fingers interact with the map.
// Uses CSS touch-action override so the browser handles 1-finger pan natively (no JS needed).
function TwoFingerGestureHandler() {
  const map = useMap()

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window
    if (!isTouchDevice) return

    const container = map.getContainer()
    const mapPane = container.querySelector('.leaflet-map-pane') as HTMLElement | null

    const setTouchAction = (val: string) => {
      container.style.touchAction = val
      if (mapPane) mapPane.style.touchAction = val
    }

    // Default: let the browser scroll the page with one finger
    setTouchAction('pan-y')
    map.dragging.disable()
    map.touchZoom.disable()

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        setTouchAction('none')
        map.dragging.enable()
        map.touchZoom.enable()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setTouchAction('pan-y')
        map.dragging.disable()
        map.touchZoom.disable()
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
      setTouchAction('')
    }
  }, [map])

  return null
}

// Average human stride ~2.5 ft; 5280 ft/mile ÷ 2.5 = 2112 steps/mile
const STEPS_PER_MILE = 2112

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function MapLeaflet({ restaurants }: Props) {
  const [selected, setSelected] = useState<Restaurant | null>(null)
  const [userLatLng, setUserLatLng] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLatLng([pos.coords.latitude, pos.coords.longitude]),
      () => { /* permission denied or unavailable — steps won't show */ }
    )
  }, [])

  const steps = useMemo(() => {
    if (!selected || !userLatLng) return null
    const miles = haversineMiles(userLatLng[0], userLatLng[1], selected.latitude, selected.longitude)
    return Math.round(miles * STEPS_PER_MILE)
  }, [selected, userLatLng])

  const normalIcon = useMemo(() => createDotIcon(14, '#e8f5e8', '#5a7a5c', true), [])
  const selectedIcon = useMemo(() => createDotIcon(20, '#f0fff0', '#3d5a3f', false), [])

  return (
    <div className="menu-guide-map relative w-full h-full">
      <style>{`
        .menu-guide-map .leaflet-container { background: transparent !important; }

        @keyframes orb-core-glow {
          0%, 100% { box-shadow: 0 0 3px 1px rgba(92,122,92,0.5); }
          50%       { box-shadow: 0 0 6px 2px rgba(92,122,92,0.85); }
        }
        @keyframes orb-core-selected {
          0%, 100% { box-shadow: 0 0 4px 2px rgba(90,122,92,0.7); }
          50%       { box-shadow: 0 0 8px 3px rgba(90,122,92,1); }
        }
        .orb-core          { animation: orb-core-glow     2.4s ease-in-out infinite; }
        .orb-core-selected { animation: orb-core-selected 1.6s ease-in-out infinite; }
      `}</style>

      {/* Blend wrapper — only the map tiles get multiplied against the cream background.
          Popup card is a sibling outside this div so it stays pure white. */}
      <div className="absolute inset-0" style={{ mixBlendMode: 'multiply' }}>
        <MapContainer
          center={[40.7128, -74.006]}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer attribution={TONER_ATTRIBUTION} url={TONER_URL} />
          <TwoFingerGestureHandler />
          <MapClickHandler onMapClick={() => setSelected(null)} />
          {restaurants.map((r) => (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={selected?.id === r.id ? selectedIcon : normalIcon}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation()
                  setSelected(r)
                },
              }}
            />
          ))}
        </MapContainer>
      </div>

      {restaurants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <span className="text-sm text-gray-500 bg-white/80 px-3 py-1 rounded-full">
            No restaurants on map yet
          </span>
        </div>
      )}

      {selected && (
        <div
          className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-2xl shadow-xl px-4 py-3 animate-in slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-700 text-sm leading-none"
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            ×
          </button>

          <div className="flex gap-3 items-center">
            {/* Avatar */}
            <div className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
              {selected.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.avatar_url} alt={selected.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                  {selected.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate leading-tight">{selected.display_name}</p>
              {steps !== null && (
                <p className="text-xs font-medium leading-tight" style={{ color: '#5A7A5C' }}>
                  {steps.toLocaleString()} steps to your nearest delight
                </p>
              )}
              {selected.address && (
                <p className="text-xs text-gray-500 truncate leading-tight">{selected.address}</p>
              )}
            </div>

            {/* CTA */}
            <a
              href={`/menu/${selected.username}`}
              className="flex-shrink-0 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#7C9A7E' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#5A7A5C')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#7C9A7E')}
            >
              View Menu
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
