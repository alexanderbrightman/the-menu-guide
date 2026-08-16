/**
 * Serve display-sized images from Supabase instead of the full upload.
 *
 * Uploads are already capped at 800px, but cards are ~50vw / 33vw. Asking
 * Storage for a compressed render keeps the bytes closer to the slot.
 * If Image Transformations are not enabled on the project, the first 400
 * disables this globally and SmartImage falls back to the original URL.
 */

let transformsEnabled = true

export function disableSupabaseImageTransforms() {
  transformsEnabled = false
}

export function getDisplayImageUrl(url: string, width = 800, quality = 70): string {
  if (!transformsEnabled || !url) return url

  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('.supabase.co')) return url

    const objectPrefix = '/storage/v1/object/public/'
    if (!parsed.pathname.includes(objectPrefix)) return url

    parsed.pathname = parsed.pathname.replace(
      objectPrefix,
      '/storage/v1/render/image/public/'
    )
    parsed.searchParams.set('width', String(width))
    parsed.searchParams.set('resize', 'contain')
    parsed.searchParams.set('quality', String(quality))
    return parsed.toString()
  } catch {
    return url
  }
}
