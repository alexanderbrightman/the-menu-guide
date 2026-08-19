'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { ModalCloseButton } from '@/components/ui/modal-close-button'
import { FullscreenOverlay } from '@/components/ui/fullscreen-overlay'
import {
    ModalRestaurantPill,
    formatDistanceSubtitle,
} from '@/components/ui/modal-restaurant-pill'
import { getAllergenTagStyle } from '@/lib/utils'
import {
  modalDescriptionGlassStyle,
  modalContentTopPadClass,
  modalContentBottomPadClass,
  floatingImageShadow,
} from '@/lib/glass-styles'
import { useFullscreenOverlay } from '@/hooks/useFullscreenOverlay'
import type { Special } from '@/components/landing/SpecialsCard'

interface SpecialItemModalProps {
    special: Special
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

export function SpecialItemModal({ special, onClose }: SpecialItemModalProps) {
    const { item, restaurant, distance } = special
    const [itemImageError, setItemImageError] = useState(false)
    useFullscreenOverlay(true)

    const formatPrice = (price: number | null) => {
        if (price === null) return null
        return `$${price.toFixed(2)}`
    }

    if (typeof document === 'undefined') return null

    return createPortal(
        <FullscreenOverlay onClick={onClose}>
            <ModalRestaurantPill
                restaurant={restaurant}
                subtitle={formatDistanceSubtitle(distance)}
            />
            <ModalCloseButton onClose={onClose} />

            <div
                className={`w-full max-w-md flex flex-col gap-4 px-4 ${modalContentTopPadClass} ${modalContentBottomPadClass} animate-in slide-in-from-bottom-8 fade-in duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-full rounded-[22px] p-6" style={modalDescriptionGlassStyle}>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                            <h2
                                className="text-2xl font-bold leading-tight text-gray-900"
                                style={{ fontFamily: APPLE_FONT, letterSpacing: '-0.02em' }}
                            >
                                {item.title}
                            </h2>
                            {item.price !== null && (
                                <div
                                    className="text-xl font-semibold whitespace-nowrap text-gray-900"
                                    style={{ fontFamily: APPLE_FONT }}
                                >
                                    {formatPrice(item.price)}
                                </div>
                            )}
                        </div>

                        {item.category && (
                            <Badge
                                variant="secondary"
                                className="self-start text-xs py-1 px-2.5 rounded-full"
                                style={{
                                    ...glassChipStyle,
                                    color: '#555',
                                    fontFamily: APPLE_FONT,
                                }}
                            >
                                {item.category}
                            </Badge>
                        )}

                        {item.description && (
                            <p
                                className="text-sm leading-relaxed text-gray-600"
                                style={{ fontFamily: APPLE_FONT }}
                            >
                                {item.description}
                            </p>
                        )}

                        {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="text-[11px] font-semibold py-1 px-2.5 rounded-full"
                                        style={{
                                            ...getAllergenTagStyle(tag.name),
                                            backdropFilter: 'blur(10px) saturate(160%)',
                                            WebkitBackdropFilter: 'blur(10px) saturate(160%)',
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

                {/* Image floats on its own — no glass border/frame */}
                <div
                    className="w-full overflow-hidden rounded-[22px]"
                    style={{ boxShadow: floatingImageShadow }}
                >
                    {item.image_url && !itemImageError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-auto block"
                            onError={() => setItemImageError(true)}
                        />
                    ) : (
                        <div className="flex w-full aspect-[4/3] items-center justify-center text-sm text-gray-500/80 bg-black/5">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl opacity-60">🍽️</span>
                                <span>No image available</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FullscreenOverlay>,
        document.body
    )
}
