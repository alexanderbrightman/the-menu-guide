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
            className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="relative w-full h-full md:h-[85vh] md:max-h-[800px] md:max-w-md lg:max-w-lg md:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-12 fade-in duration-300 isolate bg-black"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="special-item-heading"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/10"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Scroll Container */}
                <div className="h-full w-full overflow-y-auto no-scrollbar scroll-smooth">
                    {/* Image Section - Parallax Sticky */}
                    <div className="sticky top-0 z-0 h-[45vh] w-full backdrop-blur-xl bg-white/0">
                        {item.image_url && !itemImageError ? (
                            <div className="relative w-full h-full">
                                {/* Main Image */}
                                <div className="relative w-full h-full p-6">
                                    <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        fill
                                        className="object-contain drop-shadow-lg"
                                        sizes="(min-width: 768px) 600px, 100vw"
                                        priority
                                        onError={() => {
                                            console.warn(`Failed to load special item image in modal: ${item.image_url}`)
                                            setItemImageError(true)
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400 bg-black/5">
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <span className="text-4xl">🍽️</span>
                                    <span>No image available</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="relative z-10 -mt-6 rounded-t-[2rem] px-6 py-8 min-h-[60vh] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] border-t bg-white border-gray-200">
                        {/* Handle Indicator */}
                        <div className="w-12 h-1.5 rounded-full mx-auto mb-8 bg-gray-300" />

                        <div className="flex flex-col gap-6 pb-20">
                            {/* Header */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-4">
                                    <h2
                                        id="special-item-heading"
                                        className="text-2xl md:text-3xl font-bold leading-tight text-gray-900"
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
                            </div>

                            {/* Description */}
                            {item.description && (
                                <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-700">
                                    {item.description}
                                </p>
                            )}

                            {/* Restaurant Info */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                    From
                                </h3>
                                <Link
                                    href={`/menu/${restaurant.username}`}
                                    className="flex items-center gap-3 p-3 border border-black rounded-lg hover:bg-gray-50 transition-colors group"
                                >
                                    {restaurant.avatar_url && !avatarImageError ? (
                                        <Image
                                            src={restaurant.avatar_url}
                                            alt={restaurant.display_name}
                                            width={48}
                                            height={48}
                                            className="object-cover border border-black rounded"
                                            onError={() => {
                                                console.warn(`Failed to load restaurant avatar in modal: ${restaurant.avatar_url}`)
                                                setAvatarImageError(true)
                                            }}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-200 border border-black rounded flex items-center justify-center">
                                            <span className="text-gray-900 font-medium text-lg">
                                                {restaurant.display_name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 group-hover:underline">
                                            {restaurant.display_name}
                                        </p>
                                        {restaurant.address && (
                                            <p className="text-sm text-gray-600">{restaurant.address}</p>
                                        )}
                                        {distance !== null && (
                                            <p className="text-sm text-gray-500">
                                                {distance < 0.1
                                                    ? `${Math.round(distance * 5280)}ft away`
                                                    : `${distance.toFixed(1)}mi away`}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            </div>

                            <div className="mt-4 text-[10px] leading-tight opacity-50 text-gray-600">
                                Allergen info provided by restaurant, always notify your waiter
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
