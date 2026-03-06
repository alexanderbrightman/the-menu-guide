'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getAllergenBorderColor } from '@/lib/utils'

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


export function SpecialItemModal({ special, onClose }: SpecialItemModalProps) {
    const { item, restaurant, distance } = special
    const [itemImageError, setItemImageError] = useState(false)

    const formatPrice = (price: number | null) => {
        if (price === null) return null
        return `$${price.toFixed(2)}`
    }

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/30 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md flex flex-col gap-4 animate-in slide-in-from-bottom-8 fade-in duration-300"
            >
                {/* Close Button - desktop only */}
                <button
                    onClick={onClose}
                    className="hidden md:flex absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/20 items-center justify-center"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Image */}
                {item.image_url && !itemImageError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="max-h-[45vh] max-w-full w-auto mx-auto rounded-2xl block"
                        onError={() => setItemImageError(true)}
                    />
                ) : (
                    <div className="flex w-full aspect-[4/3] items-center justify-center text-sm text-white/60">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-4xl">🍽️</span>
                            <span>No image available</span>
                        </div>
                    </div>
                )}

                {/* Info Card */}
                <div
                    className="w-full rounded-2xl p-6 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
                    }}
                >
                    <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <h2
                                className="text-2xl font-bold leading-tight text-gray-900"
                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', letterSpacing: '-0.02em' }}
                            >
                                {item.title}
                            </h2>
                            {item.price !== null && (
                                <div
                                    className="text-xl font-semibold whitespace-nowrap text-gray-900"
                                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
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
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                }}
                            >
                                {item.category}
                            </Badge>
                        )}

                        {/* Description */}
                        {item.description && (
                            <p
                                className="text-sm leading-relaxed text-gray-600"
                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                            >
                                {item.description}
                            </p>
                        )}

                        {/* Allergen / Dietary Tags */}
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
                                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                    )
                                })}
                            </div>
                        )}

                        {/* Restaurant Info */}
                        <div className="mt-1">
                            <Link
                                href={`/menu/${restaurant.username}`}
                                className="block rounded-xl overflow-hidden transition-all duration-200 hover:scale-[0.99] active:scale-[0.97]"
                                style={{
                                    border: '0.5px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
                                }}
                            >
                                <div className="flex items-center gap-3 px-3.5 py-3 bg-white">
                                    {/* Avatar */}
                                    <div
                                        className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-100"
                                        style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
                                    >
                                        {restaurant.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={restaurant.avatar_url} alt={restaurant.display_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-semibold"
                                                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                                            >
                                                {restaurant.display_name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name + distance */}
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className="font-semibold text-gray-900 truncate text-sm"
                                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', letterSpacing: '-0.01em' }}
                                        >
                                            {restaurant.display_name}
                                        </p>
                                        <p className="text-[11px] text-gray-400 truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                                            {distance !== null
                                                ? distance < 0.1
                                                    ? `${Math.round(distance * 5280)}ft away`
                                                    : `${distance.toFixed(1)}mi away`
                                                : restaurant.address || 'View menu'}
                                        </p>
                                    </div>

                                    {/* View Menu pill */}
                                    <span
                                        className="flex-shrink-0 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full"
                                        style={{
                                            background: 'linear-gradient(135deg, #FF6259, #E8453C)',
                                            boxShadow: '0 2px 8px rgba(232,69,60,0.3)',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        View Menu
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
