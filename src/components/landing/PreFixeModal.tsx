'use client'

import { createPortal } from 'react-dom'
import type { PreFixeEntry } from '@/components/landing/PreFixeCard'
import { Badge } from '@/components/ui/badge'
import { ModalCloseButton } from '@/components/ui/modal-close-button'
import {
  ModalRestaurantPill,
  formatDistanceSubtitle,
} from '@/components/ui/modal-restaurant-pill'
import { CategoryDivider } from '@/components/public/CategoryDivider'
import { getAllergenTagStyle } from '@/lib/utils'
import { formatScheduleBadge } from '@/lib/geo'
import {
  glassCardStyle,
  modalContentTopPadClass,
  modalContentBottomPadClass,
  floatingImageShadow,
} from '@/lib/glass-styles'
import { useFullscreenOverlay } from '@/hooks/useFullscreenOverlay'
import { PlaceActions } from '@/components/public/PlaceActions'

interface Props {
  entry: PreFixeEntry
  onClose: () => void
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

const glassChipStyle = {
  background: 'rgba(255,255,255,0.45)',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  border: '0.5px solid rgba(255,255,255,0.55)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
} as const

function formatPrice(price: number | null) {
  if (price == null) return null
  return `$${Number(price).toFixed(2)}`
}

export function PreFixeModal({ entry, onClose }: Props) {
  const { menu, restaurant, distance } = entry
  useFullscreenOverlay(true)

  const hasSchedule =
    menu.start_time &&
    menu.end_time &&
    menu.days_of_week &&
    menu.days_of_week.length > 0

  const schedule = hasSchedule
    ? formatScheduleBadge(menu.days_of_week, menu.start_time!, menu.end_time!)
    : null

  const priceLabel = formatPrice(menu.price)

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fullscreen-overlay flex items-start justify-center overflow-y-auto overscroll-contain bg-black/20 backdrop-blur-2xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <ModalRestaurantPill
        username={restaurant.username}
        displayName={restaurant.display_name}
        avatarUrl={restaurant.avatar_url}
        subtitle={formatDistanceSubtitle(distance)}
      />
      <ModalCloseButton onClose={onClose} />

      <div
        className={`w-full max-w-md md:max-w-2xl lg:max-w-3xl flex flex-col gap-4 my-auto px-4 ${modalContentTopPadClass} ${modalContentBottomPadClass} animate-in slide-in-from-bottom-8 fade-in duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Info island — mirrors specials layout */}
        <div className="w-full rounded-[22px] p-6" style={glassCardStyle}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-gray-900"
                style={{ fontFamily: APPLE_FONT, letterSpacing: '-0.02em' }}
              >
                {menu.title}
              </h2>
              {priceLabel && (
                <div
                  className="text-xl font-semibold whitespace-nowrap text-gray-900"
                  style={{ fontFamily: APPLE_FONT }}
                >
                  {priceLabel}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {schedule && (
                <Badge
                  variant="secondary"
                  className="self-start text-xs py-1 px-2.5 rounded-full"
                  style={{
                    ...glassChipStyle,
                    color: '#555',
                    fontFamily: APPLE_FONT,
                  }}
                >
                  {schedule}
                </Badge>
              )}
              {menu.is_active_now && (
                <span
                  className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(34,197,94,0.85)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    fontFamily: APPLE_FONT,
                  }}
                >
                  Live
                </span>
              )}
            </div>

            {menu.description && (
              <p
                className="text-sm leading-relaxed text-gray-600"
                style={{ fontFamily: APPLE_FONT }}
              >
                {menu.description}
              </p>
            )}

            <PlaceActions place={restaurant} compact surface="glass" />
          </div>
        </div>

        {/* Course sections with floating item cards */}
        {(menu.courses || []).map((course) => {
          const items = course.prefxe_items || []
          if (items.length === 0) return null

          const scrollable = items.length > 2

          return (
            <div key={course.id} className="flex flex-col gap-2.5">
              <CategoryDivider
                title={course.name}
                isDarkBackground={false}
                fontFamily={APPLE_FONT}
                size="md"
              />

              <div
                className={
                  scrollable
                    ? // Bleed only on the right so cards can scroll past the edge;
                      // keep the parent’s left px-4 so the first card lines up with
                      // the info island and course dividers.
                      'flex gap-3 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory scrollbar-hide -mr-4 md:mr-0'
                    : items.length === 1
                      ? 'grid grid-cols-1 sm:max-w-xs'
                      : 'grid grid-cols-2 gap-3'
                }
              >
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={
                      scrollable
                        ? 'flex-shrink-0 w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.5rem)] snap-start flex flex-col gap-2'
                        : 'flex flex-col gap-2'
                    }
                  >
                    {/* Image floats on its own — no glass border/frame */}
                    <div
                      className="relative aspect-square overflow-hidden rounded-[20px] bg-black/[0.03]"
                      style={{ boxShadow: floatingImageShadow }}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-50">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Text island keeps the liquid-glass highlight */}
                    <div className="rounded-[18px] p-3 space-y-1.5" style={glassCardStyle}>
                      <p
                        className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2"
                        style={{ fontFamily: APPLE_FONT, letterSpacing: '-0.01em' }}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p
                          className="text-[11px] leading-relaxed text-gray-500 line-clamp-2"
                          style={{ fontFamily: APPLE_FONT }}
                        >
                          {item.description}
                        </p>
                      )}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="text-[10px] font-semibold py-0.5 px-1.5 rounded-full"
                              style={{
                                ...getAllergenTagStyle(tag.name),
                                fontFamily: APPLE_FONT,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {scrollable ? (
                  <div className="w-4 shrink-0 md:hidden" aria-hidden />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  )
}
