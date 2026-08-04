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
 * - Paints html/body + theme-color to match the frosted scrim so iOS
 *   safe areas feel continuous with the open window
 */
export function useFullscreenOverlay(
  active: boolean,
  options?: { isDarkBackground?: boolean; color?: string }
) {
  const color =
    options?.color ?? getOverlayChromeColor(Boolean(options?.isDarkBackground))

  useEffect(() => {
    if (!active) return
    const releaseColor = pushChromeColor(color)
    const releaseScroll = acquireScrollLock()
    return () => {
      releaseScroll()
      releaseColor()
    }
  }, [active, color])
}
