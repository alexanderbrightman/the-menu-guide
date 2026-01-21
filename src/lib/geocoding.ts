/**
 * Geocoding utilities using OpenStreetMap Nominatim (free, no API key required)
 */

export interface GeocodingResult {
    latitude: number
    longitude: number
    displayName: string
}

/**
 * Convert an address string to coordinates using OpenStreetMap Nominatim
 * @param address - The address to geocode
 * @returns Object with latitude, longitude, and formatted address
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
    if (!address || address.trim().length === 0) {
        return null
    }

    try {
        // Use Nominatim API (free, no API key needed)
        // We add a user agent as required by Nominatim usage policy
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(address.trim())}&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'TheMenuGuide/1.0',
                },
            }
        )

        if (!response.ok) {
            console.error('Geocoding API error:', response.status)
            return null
        }

        const data = await response.json()

        if (!data || data.length === 0) {
            console.warn('No geocoding results found for address:', address)
            return null
        }

        const result = data[0]

        return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            displayName: result.display_name,
        }
    } catch (error) {
        console.error('Error geocoding address:', error)
        return null
    }
}
