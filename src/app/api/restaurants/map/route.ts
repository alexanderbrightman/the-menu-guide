import { NextResponse } from 'next/server'
import { getSecurityHeaders } from '@/lib/security'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { data: restaurants, error } = await supabase
            .from('profiles')
            .select('id, display_name, username, address, latitude, longitude, avatar_url')
            .eq('is_public', true)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)

        if (error) {
            console.error('Error fetching restaurants for map:', error)
            return NextResponse.json(
                { error: 'Failed to fetch restaurants' },
                { status: 500, headers: getSecurityHeaders() }
            )
        }

        return NextResponse.json(
            { restaurants: restaurants ?? [] },
            {
                headers: {
                    ...getSecurityHeaders(),
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                },
            }
        )
    } catch (error) {
        console.error('Error in restaurants/map GET:', error)
        return NextResponse.json(
            { error: 'An error occurred while fetching restaurants' },
            { status: 500, headers: getSecurityHeaders() }
        )
    }
}
