'use client'

import Link from 'next/link'
import { BookOpen, Calendar, ChevronDown, MapPin } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getModalChromeGlassStyle } from '@/lib/glass-styles'
import { formatHoursStatus } from '@/lib/opening-hours'
import {
  mapsSearchUrl,
  reservationHref,
  type DiscoverRestaurant,
} from '@/lib/place-links'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

const menuItemClass =
  'cursor-pointer rounded-xl px-2.5 py-2 text-[13px] font-medium'

/** Dusty icon tints — deeper on light chrome, softer on dark. */
const iconColor = {
  light: { menu: '#7A8B6A', reserve: '#B08968', directions: '#5E8A86' },
  dark: { menu: '#B5C4A3', reserve: '#D2B48C', directions: '#8FB3B0' },
} as const

interface ModalRestaurantPillProps {
  restaurant: DiscoverRestaurant
  /** Optional secondary line (distance, schedule snippet, etc.) */
  subtitle?: string | null
  /** Follows the description island. Homepage stays light; profile menus pass their theme. */
  isDark?: boolean
}

/**
 * Fixed top chrome for discover modals: restaurant dropdown on the left,
 * hours status in the remaining space, paired with ModalCloseButton on the right.
 */
export function ModalRestaurantPill({
  restaurant,
  subtitle,
  isDark = false,
}: ModalRestaurantPillProps) {
  const { username, display_name: displayName, avatar_url: avatarUrl } = restaurant
  const status = formatHoursStatus(restaurant.opening_hours)
  const isCurrentlyOpen = Boolean(status?.startsWith('Open'))
  const mapsUrl =
    restaurant.address || (restaurant.latitude != null && restaurant.longitude != null)
      ? mapsSearchUrl(restaurant.address || '', restaurant.latitude, restaurant.longitude)
      : null
  const reserveHref = reservationHref(restaurant.reservation_url)
  const chromeStyle = getModalChromeGlassStyle(isDark)
  const icons = isDark ? iconColor.dark : iconColor.light
  const itemClass = cn(
    menuItemClass,
    isDark
      ? 'text-white focus:bg-white/15 focus:text-white data-[highlighted]:bg-white/15 data-[highlighted]:text-white'
      : 'text-gray-900 focus:bg-black/5 focus:text-gray-900 data-[highlighted]:bg-black/5 data-[highlighted]:text-gray-900'
  )

  return (
    <div
      className="fixed z-[110] flex items-center gap-2"
      style={{
        top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        left: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        right: 'max(4rem, calc(env(safe-area-inset-right, 0px) + 3.25rem))',
        fontFamily: APPLE_FONT,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${displayName} actions`}
            className={cn(
              'group flex h-11 max-w-[min(12rem,55%)] min-w-0 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-2.5 transition-transform active:scale-[0.97]',
              isDark
                ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
                : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20'
            )}
            style={chromeStyle}
          >
            <div
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ring-1',
                isDark ? 'bg-white/15 ring-white/25' : 'bg-black/[0.06] ring-black/10'
              )}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className={cn(
                    'text-[13px] font-semibold',
                    isDark ? 'text-white/90' : 'text-gray-800'
                  )}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-left">
              <p
                className={cn(
                  'truncate text-[13px] font-semibold leading-tight',
                  isDark ? 'text-white' : 'text-gray-900'
                )}
                style={{ letterSpacing: '-0.01em' }}
              >
                {displayName}
              </p>
              {subtitle && (
                <p
                  className={cn(
                    'truncate text-[11px] leading-tight',
                    isDark ? 'text-white/65' : 'text-gray-500'
                  )}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180',
                isDark ? 'text-white/55' : 'text-gray-400'
              )}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className={cn(
            'z-[120] min-w-[12.5rem] rounded-2xl p-1.5 shadow-lg backdrop-blur-[40px] backdrop-saturate-[1.8]',
            isDark
              ? 'border-white/20 text-white'
              : 'border-black/10 text-gray-900'
          )}
          style={{
            fontFamily: 'var(--font-raleway), sans-serif',
            ...chromeStyle,
          }}
        >
          <DropdownMenuItem asChild>
            <Link href={`/menu/${username}`} className={itemClass}>
              <BookOpen className="h-4 w-4" strokeWidth={2} style={{ color: icons.menu }} />
              Visit Menu
            </Link>
          </DropdownMenuItem>
          {reserveHref && (
            <DropdownMenuItem asChild>
              <a
                href={reserveHref}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClass}
              >
                <Calendar className="h-4 w-4" strokeWidth={2} style={{ color: icons.reserve }} />
                Reservations
              </a>
            </DropdownMenuItem>
          )}
          {mapsUrl && (
            <DropdownMenuItem asChild>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={itemClass}
              >
                <MapPin className="h-4 w-4" strokeWidth={2} style={{ color: icons.directions }} />
                Directions
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {status && (
        <div
          className="flex h-11 min-w-0 items-center gap-1.5 overflow-hidden rounded-full px-3"
          style={chromeStyle}
          role="status"
        >
          <span
            className={cn(
              'h-1.5 w-1.5 flex-shrink-0 rounded-full',
              isCurrentlyOpen
                ? 'bg-emerald-500'
                : isDark
                  ? 'bg-white/45'
                  : 'bg-gray-400'
            )}
            aria-hidden
          />
          <span
            className={cn(
              'min-w-0 truncate text-[12px] font-medium leading-tight',
              isDark ? 'text-white/90' : 'text-gray-700'
            )}
          >
            {status}
          </span>
        </div>
      )}
    </div>
  )
}

export function formatDistanceSubtitle(distance: number | null): string | null {
  if (distance === null) return null
  return distance < 0.1
    ? `${Math.round(distance * 5280)}ft`
    : `${distance.toFixed(1)}mi`
}
