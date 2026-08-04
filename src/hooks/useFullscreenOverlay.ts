'use client'

import { useEffect } from 'react'
import {
  pushChromeColor,
  acquireScrollLock,
  getOverlayChromeColor,
} from '@/lib/chrome-color'

/**
 * Full-screen discover/menu item overlays:
 * - Locks scroll (reference-counted for stacked modals)
 * - Optionally paints html/body + theme-color for dark menu surfaces
 *   where a solid chrome color matches the page.
 *
 * Light homepage overlays intentionally skip chrome painting: a solid
 * mid-grey theme-color shows up as letterbox bars in iOS Safari. The
 * frosted `.fullscreen-overlay` scrim (100lvh) should paint edge-to-edge
 * so content shows through the translucent browser chrome instead —
 * matching the public profile full-bleed behavior.
 */
export function useFullscreenOverlay(
  active: boolean,
  options?: {
    isDarkBackground?: boolean
    color?: string
    /** Force/skip theme-color paint. Defaults to true only for dark menus. */
    paintChrome?: boolean
  }
) {
  const isDark = Boolean(options?.isDarkBackground)
  const paintChrome =
    options?.paintChrome ?? (isDark || options?.color != null)
  const color = options?.color ?? getOverlayChromeColor(isDark)

  useEffect(() => {
    if (!active) return
    const releaseScroll = acquireScrollLock()
    const releaseColor = paintChrome ? pushChromeColor(color) : null
    return () => {
      releaseScroll()
      releaseColor?.()
    }
  }, [active, color, paintChrome])
}
