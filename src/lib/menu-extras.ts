import type { SupabaseClient } from '@supabase/supabase-js'
import { formatPrice } from '@/lib/currency'
import { sanitizePrice, sanitizeTextInput } from '@/lib/sanitize'

export type ExtraKind = 'variant' | 'addon'

export interface MenuItemExtra {
  id: string
  menu_item_id?: string
  kind: ExtraKind
  name: string
  price: number
  sort_order?: number
}

/** Local editor row — price is a string so inputs can be empty while typing. */
export interface ExtraDraft {
  id: string
  kind: ExtraKind
  name: string
  price: string
}

export const MAX_EXTRAS_PER_ITEM = 20

export const MENU_ITEM_RELATIONS_SELECT =
  '*, menu_categories(name), menu_item_tags(tags(id, name)), menu_item_extras(id, kind, name, price, sort_order)'

function extraAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function isExtraKind(value: unknown): value is ExtraKind {
  return value === 'variant' || value === 'addon'
}

export function newDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createExtraDraft(kind: ExtraKind): ExtraDraft {
  return { id: newDraftId(), kind, name: '', price: '' }
}

export function extrasToDrafts(extras?: MenuItemExtra[] | null): ExtraDraft[] {
  return (extras || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((extra) => ({
      id: extra.id,
      kind: extra.kind,
      name: extra.name,
      price: String(extra.price),
    }))
}

export function splitExtras(extras?: { kind: string; price: number | string; name: string; id?: string; sort_order?: number }[] | null) {
  const list = (extras || [])
    .map((extra) => {
      const price = extraAmount(extra.price)
      if (price === null) return null
      return { ...extra, price }
    })
    .filter((extra): extra is NonNullable<typeof extra> => extra !== null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return {
    variants: list.filter((extra) => extra.kind === 'variant'),
    addons: list.filter((extra) => extra.kind === 'addon'),
  }
}

export function startingPrice(
  price: number | null | undefined,
  extras?: { kind: string; price: number | string }[] | null
): { amount: number | null; isFrom: boolean } {
  const variants = (extras || [])
    .filter((extra) => extra.kind === 'variant')
    .map((extra) => extraAmount(extra.price))
    .filter((amount): amount is number => amount !== null)
  const base = extraAmount(price)
  if (variants.length >= 2) {
    const amounts = base === null ? variants : [...variants, base]
    return { amount: Math.min(...amounts), isFrom: true }
  }
  if (base !== null) return { amount: base, isFrom: false }
  if (variants.length === 1) return { amount: variants[0], isFrom: false }
  return { amount: null, isFrom: false }
}

export function formatStartingPrice(
  price: number | null | undefined,
  extras: { kind: string; price: number | string }[] | undefined,
  currency?: string
): string | null {
  const { amount, isFrom } = startingPrice(price, extras)
  if (amount == null) return null
  const formatted = formatPrice(amount, currency)
  return isFrom ? `from ${formatted}` : formatted
}

export function sanitizeExtraRows(raw: unknown): {
  kind: ExtraKind
  name: string
  price: number
  sort_order: number
}[] {
  if (!Array.isArray(raw)) return []

  const rows: { kind: ExtraKind; name: string; price: number; sort_order: number }[] = []
  for (const entry of raw) {
    if (rows.length >= MAX_EXTRAS_PER_ITEM) break
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    if (!isExtraKind(record.kind)) continue
    const name = typeof record.name === 'string' ? sanitizeTextInput(record.name) : ''
    if (!name) continue
    const price = sanitizePrice(record.price as string | number)
    if (price === null) continue
    rows.push({
      kind: record.kind,
      name,
      price,
      sort_order: rows.length,
    })
  }
  return rows
}

export function extraDraftsToPayload(drafts: ExtraDraft[]) {
  return sanitizeExtraRows(
    drafts.map((draft) => ({
      kind: draft.kind,
      name: draft.name,
      price: draft.price,
    }))
  )
}

export interface ScannedExtra {
  kind: ExtraKind
  name: string
  price: number
}

export interface ScannedMenuItem {
  title: string
  description: string | null
  price: number | null
  category: string | null
  extras: ScannedExtra[]
}

export async function replaceMenuItemExtras(
  supabase: SupabaseClient,
  menuItemId: string,
  raw: unknown
): Promise<string | null> {
  const extras = sanitizeExtraRows(raw)

  const { error: deleteError } = await supabase
    .from('menu_item_extras')
    .delete()
    .eq('menu_item_id', menuItemId)

  if (deleteError) {
    console.error('Error clearing menu item extras:', deleteError)
    return 'Failed to update extras'
  }

  if (extras.length === 0) return null

  const { error: insertError } = await supabase.from('menu_item_extras').insert(
    extras.map((extra) => ({
      menu_item_id: menuItemId,
      kind: extra.kind,
      name: extra.name,
      price: extra.price,
      sort_order: extra.sort_order,
    }))
  )

  if (insertError) {
    console.error('Error inserting menu item extras:', insertError)
    return 'Failed to save extras'
  }

  return null
}
