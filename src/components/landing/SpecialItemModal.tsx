'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Special {
    item: {
        id: string
        title: string
        description: string | null
        price: number | null
        image_url: string | null
        category: string | null
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
    const [avatarImageError, setAvatarImageError] = useState(false)

    // Format price
    const formatPrice = (price: number | null) => {
        if (price === null) return null
        return `$${price.toFixed(2)}`
    }

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md flex flex-col gap-4 animate-in slide-in-from-bottom-8 fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Image Card */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md border border-white/10 group">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/20"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {item.image_url && !itemImageError ? (
                        <div className="w-full h-full relative">
                            <Image
                                src={item.image_url}
                                alt={item.title}
                                fill
                                className="object-contain"
                                sizes="(min-width: 768px) 600px, 100vw"
                                priority
                                onError={() => {
                                    console.warn(`Failed to load special item image in modal: ${item.image_url}`)
                                    setItemImageError(true)
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                            <div className="flex flex-col items-center gap-2 opacity-50">
                                <span className="text-4xl">🍽️</span>
                                <span>No image available</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div
                    className="w-full rounded-2xl p-6 overflow-hidden relative"
                    style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
                    }}
                >
                    <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                            <h2
                                id="special-item-heading"
                                className="text-2xl font-bold leading-tight text-gray-900"
                            >
                                {item.title}
                            </h2>
                            {item.price !== null && (
                                <div className="text-xl font-semibold whitespace-nowrap text-gray-900">
                                    {formatPrice(item.price)}
                                </div>
                            )}
                        </div>

                        {item.category && (
                            <Badge
                                variant="secondary"
                                className="self-start border border-black bg-gray-100 text-gray-900"
                            >
                                {item.category}
                            </Badge>
                        )}

                        {/* Description */}
                        {item.description && (
                            <p className="text-sm md:text-base leading-relaxed text-gray-700">
                                {item.description}
                            </p>
                        )}

                        {/* Restaurant Link */}
                        <div className="pt-4 mt-2 border-t border-gray-100">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                From
                            </div>
                            <Link
                                href={`/menu/${restaurant.username}`}
                                className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors group"
                            >
                                {restaurant.avatar_url && !avatarImageError ? (
                                    <Image
                                        src={restaurant.avatar_url}
                                        alt={restaurant.display_name}
                                        width={40}
                                        height={40}
                                        className="object-cover rounded-full shadow-sm"
                                        style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
                                        onError={() => {
                                            console.warn(`Failed to load restaurant avatar in modal: ${restaurant.avatar_url}`)
                                            setAvatarImageError(true)
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
                                        style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}
                                    >
                                        <span className="text-gray-400 font-semibold text-base" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                                            {restaurant.display_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate group-hover:text-black transition-colors" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', letterSpacing: '-0.01em' }}>
                                        {restaurant.display_name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {distance !== null && (
                                            <span>
                                                {distance < 0.1
                                                    ? `${Math.round(distance * 5280)}ft away`
                                                    : `${distance.toFixed(1)}mi away`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span
                                    className="flex-shrink-0 text-white text-xs font-semibold px-4 py-2 rounded-full"
                                    style={{
                                        background: 'linear-gradient(135deg, #FF6259, #E8453C)',
                                        boxShadow: '0 2px 8px rgba(232,69,60,0.3)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    View Menu
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
