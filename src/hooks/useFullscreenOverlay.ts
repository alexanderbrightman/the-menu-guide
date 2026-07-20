'use client'

import { useEffect } from 'react'

/**
 * Approximate composite of bg-black/30 + backdrop-blur over a light page.
 * Used for html/body/theme-color so iOS Safari safe areas match the modal scrim
 * instead of flashing the page’s light background.
 */
const OVERLAY_SCRIM = '#4a4a4a'

/**
 * Locks scroll and paints the full-screen (including iOS status-bar / home-indicator
 * safe areas) to match the blurred modal backdrop.
 */
export function useFullscreenOverlay(active: boolean) {
  useEffect(() => {
    if (!active) return

    const html = document.documentElement
    const body = document.body
    const themeMeta = document.querySelector('meta[name="theme-color"]')

    const previous = {
      htmlBg: html.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      themeColor: themeMeta?.getAttribute('content'),
    }

    html.style.backgroundColor = OVERLAY_SCRIM
    body.style.backgroundColor = OVERLAY_SCRIM
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    themeMeta?.setAttribute('content', OVERLAY_SCRIM)

    return () => {
      html.style.backgroundColor = previous.htmlBg
      body.style.backgroundColor = previous.bodyBg
      body.style.overflow = previous.bodyOverflow
      html.style.overflow = previous.htmlOverflow
      if (themeMeta && previous.themeColor != null) {
        themeMeta.setAttribute('content', previous.themeColor)
      } else if (themeMeta && previous.themeColor === null) {
        themeMeta.removeAttribute('content')
      }
    }
  }, [active])
}
