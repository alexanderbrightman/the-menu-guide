/**
 * Canonical origin for Open Graph, sitemaps, and share links.
 * Prefer the configured app URL so preview deployments do not mint
 * throwaway og:url hosts.
 */
export function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const production =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  if (production) {
    return `https://${production.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }

  return 'http://localhost:3000'
}

export function absoluteUrl(pathOrUrl: string, origin: string = siteOrigin()): string {
  try {
    return new URL(pathOrUrl, `${origin}/`).toString()
  } catch {
    return origin
  }
}

export function menuSharePath(username: string, itemId?: string | null): string {
  const base = `/menu/${encodeURIComponent(username)}`
  if (!itemId) return base
  return `${base}?item=${encodeURIComponent(itemId)}`
}

export function menuShareUrl(
  username: string,
  itemId?: string | null,
  origin?: string
): string {
  const resolved =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : siteOrigin())
  return `${resolved.replace(/\/$/, '')}${menuSharePath(username, itemId)}`
}

/** Update ?item= without a Next navigation (avoids re-fetching the menu). */
export function replaceMenuItemQuery(itemId: string | null) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (itemId) url.searchParams.set('item', itemId)
  else url.searchParams.delete('item')
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (current === next) return
  window.history.replaceState(window.history.state, '', next)
}
