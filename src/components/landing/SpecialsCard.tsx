'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

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

interface SpecialsCardProps {
    onItemClick: (special: Special) => void
    className?: string
}

export function SpecialsCard({ onItemClick, className }: SpecialsCardProps) {
    const [specials, setSpecials] = useState<Special[]>([])
    const [loading, setLoading] = useState(true)
    const [locationDenied, setLocationDenied] = useState(false)
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

    // Request location and fetch specials
    useEffect(() => {
        const fetchSpecials = async (latitude?: number, longitude?: number) => {
            try {
                const params = new URLSearchParams()
                if (latitude !== undefined && longitude !== undefined) {
                    params.append('lat', latitude.toString())
                    params.append('lng', longitude.toString())
                }

                const response = await fetch(`/api/specials?${params.toString()}`)
                const data = await response.json()

                if (response.ok && data.specials) {
                    setSpecials(data.specials)
                }
            } catch (error) {
                console.error('Error fetching specials:', error)
            } finally {
                setLoading(false)
            }
        }

        // Try to get user location
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchSpecials(position.coords.latitude, position.coords.longitude)
                },
                (error) => {
                    console.log('Location access denied or error:', error)
                    setLocationDenied(true)
                    // Fetch specials without location
                    fetchSpecials()
                }
            )
        } else {
            // Geolocation not supported, fetch without location
            fetchSpecials()
        }
    }, [])

    if (loading) {
        return (
            <div className={`rounded-lg p-8 flex items-center justify-center min-h-[200px] ${className || ''}`}>
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-900" />
                    <p className="text-gray-900 text-sm">Loading specials...</p>
                </div>
            </div>
        )
    }

    if (specials.length === 0) {
        return (
            <div className={`rounded-lg p-8 ${className || ''}`}>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Local Specials</h2>
                <p className="text-gray-600 text-center">
                    Looks like you need to ask your favorite restaurant to join The Menu Guide...
                </p>
            </div>
        )
    }

    return (
        <div className={`rounded-lg flex flex-col border border-black ${className || ''}`}>
            <div className="flex items-center justify-between px-6 pt-6 mb-4 flex-shrink-0">
                <h2 className="text-2xl font-light text-gray-900">Local Specials</h2>
                {locationDenied && (
                    <span className="text-xs text-gray-400">Showing all specials</span>
                )}
            </div>

            <div className="overflow-y-auto flex-1 px-2 custom-scrollbar">
                <div className="grid grid-cols-3 gap-3 pb-6">
                    {specials.map((special, index) => (
                        <button
                            key={`${special.item.id}-${index}`}
                            onClick={() => onItemClick(special)}
                            className="group cursor-pointer text-left w-full"
                        >
                            <div className="border border-black bg-white hover:opacity-80 transition-opacity duration-200">
                                {/* Image */}
                                <div className="relative aspect-[3/2] border-b border-black overflow-hidden bg-gray-100">
                                    {special.item.image_url && !failedImages.has(special.item.image_url) ? (
                                        <Image
                                            src={special.item.image_url}
                                            alt={special.item.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            onError={() => {
                                                console.warn(`Failed to load special item image: ${special.item.image_url}`)
                                                setFailedImages(prev => new Set(prev).add(special.item.image_url!))
                                            }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-2xl">
                                            🍽️
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <p className="font-bold text-sm text-gray-900 truncate mb-1" title={special.item.title}>
                                        {special.item.title}
                                    </p>
                                    <p className="text-xs text-gray-600 truncate" title={special.restaurant.display_name}>
                                        {special.restaurant.display_name}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #E5E7EB transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E5E7EB;
          border-radius: 20px;
        }
      `}</style>
        </div>
    )
}
