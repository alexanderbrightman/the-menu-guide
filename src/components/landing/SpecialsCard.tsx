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
            <div className={`rounded-lg p-8 flex items-center justify-center min-h-[200px] ${className || ''}`} style={{ backgroundColor: '#AD7167', border: '1px solid #AD7167' }}>
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-white" />
                    <p className="text-white text-sm">Loading specials...</p>
                </div>
            </div>
        )
    }

    if (specials.length === 0) {
        return (
            <div className={`rounded-lg p-8 ${className || ''}`} style={{ backgroundColor: '#AD7167', border: '1px solid #AD7167' }}>
                <h2 className="text-2xl font-bold mb-4 text-white">Local Specials</h2>
                <p className="text-gray-100 text-center">
                    Looks like you need to ask your favorite restaurant to join The Menu Guide...
                </p>
            </div>
        )
    }

    return (
        <div className={`rounded-lg p-6 flex flex-col ${className || ''}`} style={{ backgroundColor: '#AD7167', border: '1px solid #AD7167' }}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-2xl font-light text-white">Local Specials</h2>
                {locationDenied && (
                    <span className="text-xs text-gray-200">Showing all specials</span>
                )}
            </div>

            <div className="overflow-y-auto flex-1 -mx-2 px-2 custom-scrollbar">
                <div className="grid grid-cols-3 gap-3 pb-2">
                    {specials.map((special, index) => (
                        <button
                            key={`${special.item.id}-${index}`}
                            onClick={() => onItemClick(special)}
                            className="group cursor-pointer transition-transform hover:scale-[1.02]"
                        >
                            <div className="border border-black overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow rounded-lg">
                                {/* Image */}
                                <div className="relative aspect-square bg-gray-100">
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
                                <div className="p-3 text-left">
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
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    )
}
