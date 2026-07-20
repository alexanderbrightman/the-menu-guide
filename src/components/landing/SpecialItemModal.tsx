'use client'

import { useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAllergenBorderColor } from '@/lib/utils'
import { useFullscreenOverlay } from '@/hooks/useFullscreenOverlay'

interface Special {
    item: {
        id: string
        title: string
        description: string | null
        price: number | null
        image_url: string | null
        category: string | null
        tags?: { id: number; name: string }[]
    }
    restaurant: {
        id: string
        username: string
        display_name: string
        avatar_url: string | null
        address: string | null
    }
    distance: number | null
}

interface SpecialItemModalProps {
    special: Special
    onClose: () => void
}

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

const islandStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
}

export function SpecialItemModal({ special, onClose }: SpecialItemModalProps) {
    const { item, restaurant, distance } = special
    const [itemImageError, setItemImageError] = useState(false)
    useFullscreenOverlay(true)

    const formatPrice = (price: number | null) => {
        if (price === null) return null
        return `$${price.toFixed(2)}`
    }

    const distanceLabel =
        distance !== null
            ? distance < 0.1
                ? `${Math.round(distance * 5280)}ft away`
                : `${distance.toFixed(1)}mi away`
            : restaurant.address || 'View menu'

    if (typeof document === 'undefined') return null

    return createPortal(
        <div
            className="fullscreen-overlay flex items-start justify-center overflow-y-auto overscroll-contain bg-black/30 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close — desktop */}
            <button
                onClick={onClose}
                className="hidden md:flex fixed top-3 right-3 z-[110] p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/20 items-center justify-center"
                aria-label="Close"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Scrollable column of equally spaced islands */}
            <div
                className="w-full max-w-md flex flex-col gap-4 my-auto px-4 py-8 animate-in slide-in-from-bottom-8 fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1. Description island */}
                <div className="w-full rounded-2xl p-6" style={islandStyle}>
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
                                    background: 'rgba(0,0,0,0.05)',
                                    border: '0.5px solid rgba(0,0,0,0.1)',
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
                                {item.tags.map((tag) => {
                                    const borderColor = getAllergenBorderColor(tag.name)
                                    return (
                                        <span
                                            key={tag.id}
                                            className="text-[11px] font-medium py-1 px-2.5 rounded-full"
                                            style={{
                                                border: `1px solid ${borderColor || 'rgba(0,0,0,0.12)'}`,
                                                color: borderColor || '#666',
                                                background: borderColor ? `${borderColor}10` : 'rgba(0,0,0,0.03)',
                                                fontFamily: APPLE_FONT,
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Image island */}
                <div className="w-full rounded-2xl overflow-hidden" style={islandStyle}>
                    {item.image_url && !itemImageError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-auto block"
                            onError={() => setItemImageError(true)}
                        />
                    ) : (
                        <div className="flex w-full aspect-[4/3] items-center justify-center text-sm text-gray-400 bg-gray-50">
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-4xl">🍽️</span>
                                <span>No image available</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Restaurant island */}
                <div className="w-full rounded-2xl p-4" style={islandStyle}>
                    <Link
                        href={`/menu/${restaurant.username}`}
                        className="flex items-center gap-3 transition-opacity hover:opacity-90 active:opacity-80"
                    >
                        <div
                            className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-gray-100"
                            style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
                        >
                            {restaurant.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={restaurant.avatar_url}
                                    alt={restaurant.display_name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-semibold"
                                    style={{ fontFamily: APPLE_FONT }}
                                >
                                    {restaurant.display_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p
                                className="font-semibold text-gray-900 truncate text-[15px]"
                                style={{ fontFamily: APPLE_FONT, letterSpacing: '-0.01em' }}
                            >
                                {restaurant.display_name}
                            </p>
                            <p
                                className="text-xs text-gray-400 truncate"
                                style={{ fontFamily: APPLE_FONT }}
                            >
                                {distanceLabel}
                            </p>
                        </div>

                        <span
                            className="flex-shrink-0 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full"
                            style={{
                                background: 'linear-gradient(135deg, #FF6259, #E8453C)',
                                boxShadow: '0 2px 8px rgba(232,69,60,0.3)',
                                fontFamily: APPLE_FONT,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            View Menu
                        </span>
                    </Link>
                </div>
            </div>
        </div>,
        document.body
    )
}
