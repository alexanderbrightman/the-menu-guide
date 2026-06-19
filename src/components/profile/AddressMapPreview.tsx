'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'

const pinIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:#3A86FF;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

interface Props {
  latitude: number
  longitude: number
}

export function AddressMapPreview({ latitude, longitude }: Props) {
  return (
    <div className="h-[160px] rounded-xl overflow-hidden border border-white/40 shadow-sm">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        className="h-full w-full"
        style={{ height: '160px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[latitude, longitude]} icon={pinIcon} />
      </MapContainer>
    </div>
  )
}
