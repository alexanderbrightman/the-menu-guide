import { NextRequest, NextResponse } from 'next/server'
import { getSecurityHeaders } from '@/lib/security'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Haversine formula to calculate distance between two coordinates in miles
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// GET - Fetch specials (favorited menu items) from nearby restaurants
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const lat = searchParams.get('lat')
        const lng = searchParams.get('lng')
        const limit = parseInt(searchParams.get('limit') || '20', 10)

        // Create Supabase client with service role for public access
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Fetch all public restaurants with favorited items
        const { data: favorites, error: favoritesError } = await supabase
            .from('user_favorites')
            .select(`
        menu_item_id,
        menu_items!inner (
          id,
          title,
          description,
          price,
          image_url,
          user_id,
          menu_categories (
            name
          )
        ),
        profiles!user_favorites_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          latitude,
          longitude,
          address
        )
      `)
            .eq('profiles.is_public', true)
            .eq('profiles.subscription_status', 'pro')
            .not('menu_items', 'is', null)
            .limit(1000) // Fetch more than needed, we'll filter and sort below

        if (favoritesError) {
            console.error('Error fetching favorites:', favoritesError)
            return NextResponse.json(
                { error: 'Failed to fetch specials' },
                { status: 500, headers: getSecurityHeaders() }
            )
        }

        if (!favorites || favorites.length === 0) {
            return NextResponse.json(
                { specials: [] },
                { headers: getSecurityHeaders() }
            )
        }

        // Process and structure the data
        const specials = favorites
            .filter((fav) => fav.menu_items && fav.profiles)
            .map((fav: any) => {
                const item = fav.menu_items
                const restaurant = fav.profiles
                let distance: number | null = null

                // Calculate distance if user location and restaurant location are provided
                if (
                    lat &&
                    lng &&
                    restaurant.latitude !== null &&
                    restaurant.longitude !== null
                ) {
                    const userLat = parseFloat(lat)
                    const userLng = parseFloat(lng)
                    if (!isNaN(userLat) && !isNaN(userLng)) {
                        distance = calculateDistance(
                            userLat,
                            userLng,
                            restaurant.latitude,
                            restaurant.longitude
                        )
                    }
                }

                return {
                    item: {
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        price: item.price,
                        image_url: item.image_url,
                        category: item.menu_categories?.name || null,
                    },
                    restaurant: {
                        id: restaurant.id,
                        username: restaurant.username,
                        display_name: restaurant.display_name,
                        avatar_url: restaurant.avatar_url,
                        address: restaurant.address,
                    },
                    distance,
                }
            })

        // Sort by distance if location was provided, otherwise keep original order
        if (lat && lng) {
            specials.sort((a, b) => {
                // Items with null distance go to the end
                if (a.distance === null && b.distance === null) return 0
                if (a.distance === null) return 1
                if (b.distance === null) return -1
                return a.distance - b.distance
            })
        }

        // Limit results
        const limitedSpecials = specials.slice(0, Math.min(limit, 100))

        return NextResponse.json(
            { specials: limitedSpecials },
            {
                headers: {
                    ...getSecurityHeaders(),
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
                },
            }
        )
    } catch (error) {
        console.error('Error in specials GET:', error)
        return NextResponse.json(
            { error: 'An error occurred while fetching specials' },
            { status: 500, headers: getSecurityHeaders() }
        )
    }
}
