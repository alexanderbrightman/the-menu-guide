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

// Stamen Toner — white background, pure black roads and outlines
const TONER_BG_URL = 'https://tiles.stadiamaps.com/tiles/stamen_toner_background/{z}/{x}/{y}{r}.png?api_key=f1d73476-34da-42b5-a1ee-e71be5fef8cc'
const TONER_LINES_URL = 'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png?api_key=f1d73476-34da-42b5-a1ee-e71be5fef8cc'
const TONER_ATTRIBUTION =
  '&copy; <a href="https://stamen.com">Stamen Design</a> &copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

function getMiniMapUrl(lat: number, lng: number): string {
  const z = 15
  const n = Math.pow(2, z)
  const x = Math.floor(((lng + 180) / 360) * n)
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
  )
  return `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`
}

// Apple Maps–inspired pin: vibrant marker + frosted label card
function createRestaurantIcon(name: string, isSelected: boolean) {
  // Pin: teardrop shape built from a circle + rotated square, Apple-red/coral
  const pinColor = isSelected ? '#E8453C' : '#FF6259'
  const pinScale = isSelected ? 1.15 : 1
  const labelBg = isSelected
    ? 'rgba(255,255,255,0.96)'
    : 'rgba(255,255,255,0.82)'
  const labelBorder = isSelected
    ? 'rgba(0,0,0,0.14)'
    : 'rgba(0,0,0,0.08)'
  const labelShadow = isSelected
    ? '0 2px 12px rgba(0,0,0,0.18), 0 0.5px 1px rgba(0,0,0,0.1)'
    : '0 1px 6px rgba(0,0,0,0.12), 0 0.5px 1px rgba(0,0,0,0.06)'
  const fontWeight = isSelected ? 600 : 500
  const textColor = isSelected ? '#1a1a1a' : '#444'

  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:0;position:relative;">
        <div style="
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          background:${labelBg};
          border:0.5px solid ${labelBorder};
          border-radius:8px;
          padding:4px 10px;
          font-size:12px;
          font-weight:${fontWeight};
          color:${textColor};
          font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif;
          letter-spacing:-0.01em;
          box-shadow:${labelShadow};
          white-space:nowrap;
          line-height:1.3;
        ">${name}</div>
        <div style="
          width:2px;height:8px;
          background:linear-gradient(to bottom, rgba(0,0,0,0.12), transparent);
          margin-left:10px;
        "></div>
        <div style="
          width:${10 * pinScale}px;
          height:${10 * pinScale}px;
          border-radius:50%;
          background:${pinColor};
          box-shadow:0 1px 4px rgba(232,69,60,0.4), inset 0 1px 1px rgba(255,255,255,0.3);
          margin-left:${5 - (10 * pinScale - 10) / 2}px;
        "></div>
      </div>`,
    iconSize: [0, 0],
    // anchor at center of the dot: ~10px left, full height (~card 20 + stem 8 + dot 10 = 38px)
    iconAnchor: [10, Math.round(20 + 8 + 10 * pinScale)],
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

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
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


  return (
    <div className="menu-guide-map relative w-full h-full">
      <style>{`
        .menu-guide-map .leaflet-container { background: #F5F5F5 !important; }
        .menu-guide-map .leaflet-control-zoom {
          border: none !important;
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 1px 6px rgba(0,0,0,0.12), 0 0.5px 1px rgba(0,0,0,0.06) !important;
        }
        .menu-guide-map .leaflet-control-zoom a {
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #333 !important;
          border: none !important;
          border-bottom: 0.5px solid rgba(0,0,0,0.08) !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
          font-size: 18px !important;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif !important;
          font-weight: 300 !important;
          transition: background 0.15s ease;
        }
        .menu-guide-map .leaflet-control-zoom a:hover {
          background: rgba(255,255,255,0.95) !important;
        }
        .menu-guide-map .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }
      `}</style>

      <div className="absolute inset-0">
        <MapContainer
          center={[40.7128, -74.006]}
          zoom={13}
          minZoom={10}
          maxZoom={19}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer attribution={TONER_ATTRIBUTION} url={TONER_BG_URL} />
          <TileLayer url={TONER_LINES_URL} />
          <MapClickHandler onMapClick={() => setSelected(null)} />
          {restaurants.map((r) => (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={createRestaurantIcon(r.display_name, selected?.id === r.id)}
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
          className="absolute bottom-4 left-4 right-4 z-[1000] rounded-2xl px-4 py-3 animate-in slide-in-from-bottom-4 duration-200"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm leading-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              border: '0.5px solid rgba(0,0,0,0.1)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            ×
          </button>

          <div className="flex gap-3 items-center">
            {/* Avatar */}
            <div className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gray-100" style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}>
              {selected.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.avatar_url} alt={selected.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-semibold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                  {selected.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate leading-tight" style={{ fontSize: '15px', letterSpacing: '-0.01em', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>{selected.display_name}</p>
              {steps !== null && (
                <p className="text-xs font-medium leading-tight mt-0.5" style={{ color: '#E8453C' }}>
                  {steps.toLocaleString()} steps away
                </p>
              )}
              {selected.address && (
                <p className="text-xs text-gray-500 truncate leading-tight mt-0.5" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>{selected.address}</p>
              )}
            </div>

            {/* CTA */}
            <a
              href={`/menu/${selected.username}`}
              className="flex-shrink-0 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #FF6259, #E8453C)',
                boxShadow: '0 2px 8px rgba(232,69,60,0.3)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              View Menu
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
