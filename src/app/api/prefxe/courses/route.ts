import { NextRequest } from 'next/server'
import { createAuthenticatedClient, getAuthToken } from '@/lib/supabase-server'
import { secureJsonResponse } from '@/lib/security'

export async function POST(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const { menu_id, name } = await request.json()
  if (!menu_id || !name?.trim()) return secureJsonResponse({ error: 'menu_id and name required' }, 400)

  const { data: menu } = await supabase.from('prefxe_menus').select('id').eq('id', menu_id).eq('user_id', user.id).single()
  if (!menu) return secureJsonResponse({ error: 'Menu not found' }, 404)

  const { count } = await supabase.from('prefxe_courses').select('*', { count: 'exact', head: true }).eq('menu_id', menu_id)
  const { data: course, error } = await supabase
    .from('prefxe_courses')
    .insert({ menu_id, name: name.trim(), sort_order: count || 0 })
    .select()
    .single()

  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ course }, 201)
}

export async function PATCH(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const { id, name, sort_order } = await request.json()
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { data: course } = await supabase
    .from('prefxe_courses')
    .select('menu_id, prefxe_menus!inner(user_id)')
    .eq('id', id)
    .single()

  if (!course) return secureJsonResponse({ error: 'Not found' }, 404)

  const { error } = await supabase.from('prefxe_courses').update({ name, sort_order }).eq('id', id)
  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ success: true })
}

export async function DELETE(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) return secureJsonResponse({ error: 'Unauthorized' }, 401)
  const supabase = createAuthenticatedClient(token)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return secureJsonResponse({ error: 'Unauthorized' }, 401)

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return secureJsonResponse({ error: 'ID required' }, 400)

  const { error } = await supabase.from('prefxe_courses').delete().eq('id', id)
  if (error) return secureJsonResponse({ error: error.message }, 500)
  return secureJsonResponse({ success: true })
}
