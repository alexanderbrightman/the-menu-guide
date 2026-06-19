export interface AddressSuggestion {
  displayName: string
  latitude: number
  longitude: number
  street: string
  city: string
  state: string
  postcode: string
  country: string
}

export interface GeocodingResult {
  latitude: number
  longitude: number
  displayName: string
}

export function formatAddress(suggestion: AddressSuggestion): string {
  return suggestion.displayName
}

export function isSameLocation(
  a: { latitude: number; longitude: number } | null,
  b: { latitude: number; longitude: number } | null,
  tolerance = 0.0001
): boolean {
  if (!a || !b) return false
  return (
    Math.abs(a.latitude - b.latitude) < tolerance &&
    Math.abs(a.longitude - b.longitude) < tolerance
  )
}

/** Client-side resolve via our API route */
export async function resolveAddressViaApi(address: string): Promise<GeocodingResult | null> {
  if (!address.trim()) return null
  try {
    const response = await fetch(
      `/api/geocode/resolve?q=${encodeURIComponent(address.trim())}`
    )
    const data = await response.json()
    if (!response.ok || !data.result) return null
    return {
      latitude: data.result.latitude,
      longitude: data.result.longitude,
      displayName: data.result.displayName,
    }
  } catch {
    return null
  }
}
