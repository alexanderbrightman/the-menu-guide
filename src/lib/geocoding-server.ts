import type { AddressSuggestion } from './geocoding'

const USER_AGENT = 'TheMenuGuide/1.0 (contact@themenuguide.com)'

interface PhotonFeature {
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    osm_value?: string
  }
  geometry: {
    coordinates: [number, number]
  }
}

function buildDisplayName(props: PhotonFeature['properties']): string {
  const parts: string[] = []
  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`)
  } else if (props.street) {
    parts.push(props.street)
  } else if (props.name) {
    parts.push(props.name)
  }
  const cityState: string[] = []
  if (props.city) cityState.push(props.city)
  if (props.state) cityState.push(props.state)
  if (props.postcode) cityState.push(props.postcode)
  if (cityState.length) parts.push(cityState.join(', '))
  if (props.country && props.country !== 'United States') parts.push(props.country)
  return parts.join(', ') || props.name || 'Unknown location'
}

function photonToSuggestion(feature: PhotonFeature): AddressSuggestion {
  const [lon, lat] = feature.geometry.coordinates
  const props = feature.properties
  const street = props.housenumber && props.street
    ? `${props.housenumber} ${props.street}`
    : props.street || props.name || ''

  return {
    displayName: buildDisplayName(props),
    latitude: lat,
    longitude: lon,
    street,
    city: props.city || '',
    state: props.state || '',
    postcode: props.postcode || '',
    country: props.country || '',
  }
}

export async function searchAddresses(query: string, limit = 6): Promise<AddressSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  try {
    const url =
      `https://photon.komoot.io/api/?` +
      `q=${encodeURIComponent(trimmed)}&limit=${limit}&lang=en`

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    })

    if (!response.ok) return []

    const data = await response.json()
    const features: PhotonFeature[] = data.features || []
    return features.map(photonToSuggestion)
  } catch (error) {
    console.error('Photon search error:', error)
    return []
  }
}

export async function resolveAddress(address: string): Promise<AddressSuggestion | null> {
  const results = await searchAddresses(address, 1)
  if (results.length > 0) return results[0]

  // Nominatim fallback
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(address.trim())}&format=json&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': USER_AGENT } }
    )
    if (!response.ok) return null

    const data = await response.json()
    if (!data?.length) return null

    const result = data[0]
    const addr = result.address || {}
    return {
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      street: [addr.house_number, addr.road].filter(Boolean).join(' ') || '',
      city: addr.city || addr.town || addr.village || '',
      state: addr.state || '',
      postcode: addr.postcode || '',
      country: addr.country || '',
    }
  } catch (error) {
    console.error('Nominatim resolve error:', error)
    return null
  }
}
