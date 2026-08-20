import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { PublicMenuPage } from '@/components/public/PublicMenuPage'
import { JsonLd } from '@/components/public/JsonLd'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { getGoogleMenuFontHref } from '@/lib/fonts'
import { menuItemJsonLd, restaurantJsonLd } from '@/lib/menu-json-ld'
import { parseItemSearchParam, publicMenuMetadata } from '@/lib/menu-metadata'
import { siteOrigin } from '@/lib/site-url'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PublicProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ item?: string | string[] }>
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params
  const query = await searchParams
  const initialItemId = parseItemSearchParam(query.item)

  // Fetch profile by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .eq('is_public', true)
    .single()

  if (profileError) {
    notFound()
  }

  if (!profile) {
    // Check if profile exists but isn't public
    const { data: privateProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (privateProfile) {
      // Profile exists but is private
      notFound()
    } else {
      // Profile doesn't exist at all
      notFound()
    }
  }

  // Validate premium access (check for expiration)
  // This ensures that even if is_public is true in DB, expired subscriptions are hidden
  const { isValid } = validatePremiumAccess(profile, 'public menu')
  if (!isValid) {
    notFound()
  }

  // Fetch menu categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('user_id', profile.id)
    .order('sort_order', { ascending: true })

  // Fetch menu items with tags
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_categories(name),
      menu_item_tags(
        tags(id, name)
      ),
      menu_item_extras(id, kind, name, price, sort_order)
    `)
    .eq('user_id', profile.id)
    .eq('is_available', true)
    .order('sort_order', { ascending: true })

  // Fetch all available tags
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true })

  // Fetch favorites for this restaurant owner
  const { data: favorites } = await supabase
    .from('user_favorites')
    .select('menu_item_id')
    .eq('user_id', profile.id)

  const favoritedIds = favorites?.map((fav) => fav.menu_item_id) || []
  const menuFontHref = getGoogleMenuFontHref(profile.menu_font)
  const origin = siteOrigin()
  const sharedItem = initialItemId
    ? (menuItems || []).find((item) => item.id === initialItemId)
    : null

  return (
    <>
      {menuFontHref && <link rel="stylesheet" href={menuFontHref} />}
      <JsonLd data={restaurantJsonLd(profile, origin)} />
      {sharedItem && (
        <JsonLd data={menuItemJsonLd(profile, sharedItem, profile.currency, origin)} />
      )}
      <PublicMenuPage
        profile={profile}
        categories={categories || []}
        menuItems={menuItems || []}
        tags={tags || []}
        favoritedIds={favoritedIds}
        initialItemId={sharedItem?.id ?? null}
      />
    </>
  )
}

export async function generateMetadata({ params, searchParams }: PublicProfilePageProps) {
  const { username } = await params
  const query = await searchParams
  const itemId = parseItemSearchParam(query.item)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, currency')
    .eq('username', username)
    .eq('is_public', true)
    .single()

  if (!profile) {
    return {
      title: 'Profile Not Found',
    }
  }

  let dish: {
    id: string
    title: string
    description?: string | null
    image_url?: string | null
    price?: number | null
  } | null = null

  if (itemId) {
    const { data: item } = await supabase
      .from('menu_items')
      .select('id, title, description, image_url, price')
      .eq('id', itemId)
      .eq('user_id', profile.id)
      .eq('is_available', true)
      .maybeSingle()
    dish = item
  }

  return publicMenuMetadata(profile, dish, profile.currency)
}
