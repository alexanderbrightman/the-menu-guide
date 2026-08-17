import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { menuShareUrl, siteOrigin } from '@/lib/site-url'
import type { Profile } from '@/lib/supabase'

export const revalidate = 3600

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin()
  const entries: MetadataRoute.Sitemap = [
    {
      url: origin,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  if (!supabaseUrl || !supabaseAnonKey) return entries

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      'username, is_public, is_complimentary, subscription_status, subscription_current_period_end'
    )
    .eq('is_public', true)
    .not('username', 'is', null)
    .limit(5000)

  for (const profile of profiles || []) {
    if (!validatePremiumAccess(profile as Partial<Profile>, 'public menu').isValid) continue
    if (!profile.username) continue
    entries.push({
      url: menuShareUrl(profile.username, null, origin),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  return entries
}
