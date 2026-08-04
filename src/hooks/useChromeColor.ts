'use client'

import { useEffect } from 'react'
import { setBaseChromeColor, pushChromeColor, CHROME_COLORS } from '@/lib/chrome-color'

/**
 * Keeps the mobile status-bar / safe-area chrome matched to the active
 * page surface. Updates as the color changes (e.g. menu theme toggle).
 */
export function useChromeColor(color: string | null | undefined) {
  const next = color || CHROME_COLORS.app

  useEffect(() => {
    setBaseChromeColor(next)
    return () => {
      // Leaving a page restores the app default until the next page mounts.
      setBaseChromeColor(CHROME_COLORS.app)
    }
  }, [next])
}

/**
 * Temporarily paints chrome for a modal / sheet / dimmed overlay.
 * Stacks cleanly with page chrome and other overlays.
 */
export function useOverlayChromeColor(
  active: boolean,
  color: string = CHROME_COLORS.overlayDim
) {
  useEffect(() => {
    if (!active) return
    return pushChromeColor(color)
  }, [active, color])
}
