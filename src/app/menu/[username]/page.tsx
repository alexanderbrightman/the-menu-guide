import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { PublicMenuPage } from '@/components/public/PublicMenuPage'
import { validatePremiumAccess } from '@/lib/premium-validation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PublicProfilePageProps {
  params: {
    username: string
  }
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params

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
    .order('created_at', { ascending: true })

  // Fetch menu items with tags
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select(`
      *,
      menu_categories(name),
      menu_item_tags(
        tags(id, name)
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: true })

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

  // Increment view count
  await supabase
    .from('profiles')
    .update({ view_count: (profile.view_count || 0) + 1 })
    .eq('id', profile.id)

  return (
    <PublicMenuPage
      profile={profile}
      categories={categories || []}
      menuItems={menuItems || []}
      tags={tags || []}
      favoritedIds={favoritedIds}
    />
  )
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { username } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('username', username)
    .eq('is_public', true)
    .single()

  if (!profile) {
    return {
      title: 'Profile Not Found',
    }
  }

  return {
    title: `${profile.display_name} - Menu`,
    description: profile.bio || `View ${profile.display_name}'s digital menu`,
  }
}
