'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HappyHourEntry } from '@/components/landing/HappyHourCard'
import { Badge } from '@/components/ui/badge'
import { ModalCloseButton } from '@/components/ui/modal-close-button'
import {
  ModalRestaurantPill,
  formatDistanceSubtitle,
} from '@/components/ui/modal-restaurant-pill'
import { formatScheduleBadge } from '@/lib/geo'
import {
  glassCardStyle,
  glassTokens,
  modalContentTopPadClass,
  modalContentBottomPadClass,
  floatingImageShadow,
} from '@/lib/glass-styles'
import { useFullscreenOverlay } from '@/hooks/useFullscreenOverlay'
import { PlaceActions } from '@/components/public/PlaceActions'

interface Props {
  entry: HappyHourEntry
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

const navGlassStyle = {
  background: 'rgba(0,0,0,0.32)',
  backdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
  WebkitBackdropFilter: `blur(${glassTokens.blur}) saturate(${glassTokens.saturate})`,
  border: '0.5px solid rgba(255,255,255,0.2)',
} as const

export function HappyHourModal({ entry, onClose }: Props) {
  const { menu, restaurant, distance } = entry
  const photos = menu.photos || []
  const [photoIdx, setPhotoIdx] = useState(0)
  const [imageError, setImageError] = useState(false)
  useFullscreenOverlay(true)

  const prev = () => {
    setImageError(false)
    setPhotoIdx((i) => (i > 0 ? i - 1 : photos.length - 1))
  }
  const next = () => {
    setImageError(false)
    setPhotoIdx((i) => (i < photos.length - 1 ? i + 1 : 0))
  }

  const schedule = formatScheduleBadge(menu.days_of_week, menu.start_time, menu.end_time)
  const currentPhoto = photos[photoIdx]

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
        className={`w-full max-w-md flex flex-col gap-4 my-auto px-4 ${modalContentTopPadClass} ${modalContentBottomPadClass} animate-in slide-in-from-bottom-8 fade-in duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Info island */}
        <div className="w-full rounded-[22px] p-6" style={glassCardStyle}>
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <h2
                className="text-2xl font-bold leading-tight text-gray-900"
                style={{ fontFamily: APPLE_FONT, letterSpacing: '-0.02em' }}
              >
                {menu.title}
              </h2>
              {menu.is_active_now && (
                <span
                  className="flex-shrink-0 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full"
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

            {menu.description && (
              <p
                className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap"
                style={{ fontFamily: APPLE_FONT }}
              >
                {menu.description}
              </p>
            )}

            <PlaceActions place={restaurant} compact surface="glass" />
          </div>
        </div>

        {/* Photo floats on its own — no glass border/frame */}
        <div
          className="w-full overflow-hidden rounded-[22px] relative"
          style={{ boxShadow: floatingImageShadow }}
        >
          {currentPhoto && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentPhoto.image_url}
              alt={menu.title}
              className="w-full h-auto block"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex w-full aspect-[4/3] items-center justify-center text-sm text-gray-500/80 bg-black/5">
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl opacity-60">🍸</span>
                <span>No photo available</span>
              </div>
            </div>
          )}

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-95"
                style={navGlassStyle}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-95"
                style={navGlassStyle}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    type="button"
                    aria-label={`Photo ${i + 1}`}
                    onClick={() => {
                      setImageError(false)
                      setPhotoIdx(i)
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === photoIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
