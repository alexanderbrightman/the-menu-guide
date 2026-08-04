'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { glassTokens } from '@/lib/glass-styles'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

/** Dark liquid glass — matches ModalCloseButton so top chrome reads as one material. */
const chromeGlassStyle = {
  background: 'rgba(0,0,0,0.32)',
  backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
  WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
  border: '0.5px solid rgba(255,255,255,0.2)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
} as const

interface ModalRestaurantPillProps {
  username: string
  displayName: string
  avatarUrl: string | null
  /** Optional secondary line (distance, schedule snippet, etc.) */
  subtitle?: string | null
}

/**
 * Fixed top-left restaurant control for discover modals.
 * Pairs with ModalCloseButton as matching liquid-glass chrome.
 */
export function ModalRestaurantPill({
  username,
  displayName,
  avatarUrl,
  subtitle,
}: ModalRestaurantPillProps) {
  return (
    <Link
      href={`/menu/${username}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`View ${displayName} menu`}
      className="fixed z-[110] flex h-11 max-w-[min(16rem,calc(100vw-5.5rem))] items-center gap-2 rounded-full pl-1.5 pr-2.5 transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={{
        ...chromeGlassStyle,
        top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        left: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        fontFamily: APPLE_FONT,
      }}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/25">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[13px] font-semibold text-white/90">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px] font-semibold leading-tight text-white"
          style={{ letterSpacing: '-0.01em' }}
        >
          {displayName}
        </p>
        {subtitle && (
          <p className="truncate text-[11px] leading-tight text-white/65">{subtitle}</p>
        )}
      </div>

      <ChevronRight
        className="h-3.5 w-3.5 flex-shrink-0 text-white/55"
        strokeWidth={2.5}
        aria-hidden="true"
      />
    </Link>
  )
}

export function formatDistanceSubtitle(distance: number | null): string | null {
  if (distance === null) return null
  return distance < 0.1
    ? `${Math.round(distance * 5280)}ft`
    : `${distance.toFixed(1)}mi`
}
