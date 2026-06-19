import { NextRequest } from 'next/server'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { secureJsonResponse } from '@/lib/security'

export async function POST(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const { course_id, title, description, image_url, tag_ids } = await request.json()
  if (!course_id || !title?.trim()) return secureJsonResponse({ error: 'course_id and title required' }, 400)

  const { count } = await supabase.from('prefxe_items').select('*', { count: 'exact', head: true }).eq('course_id', course_id)
  const { data: item, error } = await supabase
    .from('prefxe_items')
    .insert({
      course_id,
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      image_url: image_url || null,
      sort_order: count || 0,
    })
    .select()
    .single()

  if (error) return secureJsonResponse({ error: error.message }, 500)

  if (tag_ids?.length) {
    await supabase.from('prefxe_item_tags').insert(
      tag_ids.map((tag_id: number) => ({ item_id: item.id, tag_id }))
    )
  }

  return secureJsonResponse({ item }, 201)
}

export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const { id, tag_ids, ...updates } = await request.json()
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { error } = await supabase.from('prefxe_items').update(updates).eq('id', id).eq('user_id', user.id)
  if (error) return secureJsonResponse({ error: error.message }, 500)

  if (tag_ids !== undefined) {
    await supabase.from('prefxe_item_tags').delete().eq('item_id', id)
    if (tag_ids.length) {
      await supabase.from('prefxe_item_tags').insert(
        tag_ids.map((tag_id: number) => ({ item_id: id, tag_id }))
      )
    }
  }

  return secureJsonResponse({ success: true })
}

export async function DELETE(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { error } = await supabase.from('prefxe_items').delete().eq('id', id).eq('user_id', user.id)
  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ success: true })
}
