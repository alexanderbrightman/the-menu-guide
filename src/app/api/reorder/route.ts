import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { getSecurityHeaders } from '@/lib/security'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiting'

export async function POST(request: NextRequest) {
    try {
        // Get and validate auth token
        const token = getAuthToken(request)
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
        }

        const supabase = createAuthenticatedClient(token)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getSecurityHeaders() })
        }

        // Rate limiting
        const rateLimit = checkRateLimit(request, user.id, 'reorder', 20, 60000) // 20 requests per minute
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { ...getSecurityHeaders(), ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetTime, rateLimit.limit) } }
            )
        }

        const body = await request.json()
        const { type, updates } = body

        if (!type || !updates || !Array.isArray(updates)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: getSecurityHeaders() })
        }

        if (type !== 'category' && type !== 'item') {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400, headers: getSecurityHeaders() })
        }

        const cleanUpdates = updates.map((update: { id: string; sort_order: number }) => ({
            id: update.id,
            sort_order: update.sort_order,
        }))

        const rpcFunction = type === 'category' ? 'update_menu_category_order' : 'update_menu_item_order'

        const { error } = await supabase.rpc(rpcFunction, {
            payload: cleanUpdates
        })

        if (error) {
            console.error('Error reordering:', error)
            // Fallback to upsert if RPC fails (e.g. function not created yet)
            // This helps if the user hasn't run the migration yet, although upsert was failing before.
            // Let's just return the error to be clear.
            return NextResponse.json({ error: 'Failed to update order. Please ensure database functions are created.' }, { status: 500, headers: getSecurityHeaders() })
        }

        return NextResponse.json({ success: true }, { headers: getSecurityHeaders() })

    } catch (error) {
        console.error('Error in reorder API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: getSecurityHeaders() })
    }
}
