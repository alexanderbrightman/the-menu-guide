import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  validateApiPremiumAccess,
  checkAndGetExpiredSubscriptionUpdate,
  createPremiumErrorResponse,
} from '@/lib/premium-validation'

export type PremiumGateResult =
  | { ok: true }
  | { ok: false; status: number; body: ReturnType<typeof createPremiumErrorResponse> }

/**
 * Server-side premium gate for API routes.
 *
 * Fetches the user's profile, downgrades it if the subscription period has
 * lapsed, and validates premium access. Client-side gating alone is not
 * enough: anyone with a session token can call the API directly, so every
 * premium endpoint must run this check.
 */
export async function requirePremium(
  supabase: SupabaseClient,
  userId: string,
  feature: string
): Promise<PremiumGateResult> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, is_public, subscription_current_period_end, is_complimentary')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { ok: false, status: 404, body: createPremiumErrorResponse('Profile not found', 404) }
  }

  // If the paid period has lapsed, persist the downgrade (server-managed
  // columns require the service-role client) and validate against the
  // downgraded state.
  const expiryCheck = checkAndGetExpiredSubscriptionUpdate(profile)
  if (expiryCheck.needsUpdate && expiryCheck.updateData) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabaseAdmin.from('profiles').update(expiryCheck.updateData).eq('id', userId)
    Object.assign(profile, expiryCheck.updateData)
    console.log(`[Premium] Updated expired subscription for user ${userId}`)
  }

  const validation = validateApiPremiumAccess(profile, feature)
  if (!validation.isValid) {
    return {
      ok: false,
      status: validation.statusCode ?? 403,
      body: createPremiumErrorResponse(validation.error!, validation.statusCode ?? 403),
    }
  }

  return { ok: true }
}
