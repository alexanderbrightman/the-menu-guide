'use client'

import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FullscreenOverlayProps {
  children: ReactNode
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  className?: string
}

/**
 * Edge-to-edge modal shell (Apple fullScreenCover / UIVisualEffectView).
 *
 * Frost is a sibling of the scroller so iOS Safari can paint backdrop-filter
 * into the status-bar and home-indicator bands. A scrolling overlay clips
 * that filter at the visual viewport — the hard line in the screenshot.
 * Share/close chrome still insets itself with the tokens in glass-styles.
 */
export function FullscreenOverlay({
  children,
  onClick,
  className,
}: FullscreenOverlayProps) {
  return (
    <div
      className={cn('fullscreen-overlay animate-in fade-in duration-200', className)}
      onClick={onClick}
    >
      <div className="fullscreen-overlay-frost" aria-hidden />
      <div className="fullscreen-overlay-scroll">{children}</div>
    </div>
  )
}
