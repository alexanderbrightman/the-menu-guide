'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

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

export interface SpecialsCardProps {
    onItemClick: (special: Special) => void
    className?: string
    mobileFullHeight?: boolean
}

const ITEMS_PER_PAGE = 6

export function SpecialsCard({ onItemClick, className, mobileFullHeight }: SpecialsCardProps) {
    const [specials, setSpecials] = useState<Special[]>([])
    const [loading, setLoading] = useState(true)
    const [locationDenied, setLocationDenied] = useState(false)
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(0)

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

    const totalPages = Math.ceil(specials.length / ITEMS_PER_PAGE)
    const currentSpecials = specials.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    )

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(0, prev - 1))
    }

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
    }

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
        <div className={`rounded-lg flex flex-col h-full ${className || ''}`}>
            <div className="flex flex-col items-center justify-center pt-2 mb-4 flex-shrink-0 w-full">
                {/* Scroll Divider Title */}
                <div className="flex items-center justify-center gap-4 w-full overflow-hidden px-4">
                    {/* Left Side: Scroll -> Line */}
                    <div className="flex-1 flex items-center">
                        <svg
                            width="14"
                            height="12"
                            viewBox="0 0 14 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="flex-none"
                        >
                            <path
                                d="M12 6 C 6 6 2 9 4 11 C 6 13 10 9 8 5 C 6 1 1 3 1 6"
                                stroke="#000000"
                                strokeWidth="1"
                                fill="none"
                            />
                            <line x1="12" y1="6" x2="14" y2="6" stroke="#000000" strokeWidth="1" />
                        </svg>
                        <div className="flex-1 h-[1px] bg-black -ml-[1px]"></div>
                    </div>

                    <h2 className="text-[18px] font-medium tracking-widest uppercase whitespace-nowrap text-slate-900">
                        Local Specials
                    </h2>

                    {/* Right Side: Line -> Scroll */}
                    <div className="flex-1 flex items-center transform rotate-180">
                        <svg
                            width="14"
                            height="12"
                            viewBox="0 0 14 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="flex-none"
                        >
                            <path
                                d="M12 6 C 6 6 2 9 4 11 C 6 13 10 9 8 5 C 6 1 1 3 1 6"
                                stroke="#000000"
                                strokeWidth="1"
                                fill="none"
                            />
                            <line x1="12" y1="6" x2="14" y2="6" stroke="#000000" strokeWidth="1" />
                        </svg>
                        <div className="flex-1 h-[1px] bg-black -ml-[1px]"></div>
                    </div>
                </div>

                {locationDenied && (
                    <span className="text-xs text-gray-400 mt-2">Showing all specials</span>
                )}
            </div>

            <div className="flex-1 px-2 flex flex-col">
                <div className={`grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-3`}>
                    {currentSpecials.map((special, index) => (
                        <button
                            key={`${special.item.id}-${index}`}
                            onClick={() => onItemClick(special)}
                            className="group cursor-pointer text-left w-full h-full"
                        >
                            <div className="border border-black bg-white hover:opacity-80 transition-opacity duration-200 flex flex-col h-full">
                                {/* Image - smaller aspect ratio on mobile */}
                                <div className="relative aspect-[3/2] border-b border-black overflow-hidden bg-gray-100 flex-shrink-0">
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

                                {/* Info - reduced padding on mobile */}
                                <div className="p-1.5 md:p-3 flex flex-col flex-1">
                                    <p className="font-bold text-xs md:text-sm text-gray-900 truncate mb-0.5 md:mb-1" title={special.item.title}>
                                        {special.item.title}
                                    </p>

                                    {/* Description - hidden on mobile to save space */}
                                    {special.item.description && (
                                        <p className="hidden md:line-clamp-1 text-xs text-gray-500 mb-2 break-words">
                                            {special.item.description}
                                        </p>
                                    )}

                                    <div className="mt-auto pt-0.5 md:pt-1">
                                        <p className="text-[10px] md:text-xs font-medium text-gray-800 truncate" title={special.restaurant.display_name}>
                                            {special.restaurant.display_name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                    {/* Add empty placeholders to maintain grid structure if fewer than 6 items */}
                    {Array.from({ length: ITEMS_PER_PAGE - currentSpecials.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="hidden md:block" />
                    ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-2 pb-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                            className={`p-2 rounded-full transition-colors ${currentPage === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <span className="text-sm font-medium text-gray-600">
                            {currentPage + 1} / {totalPages}
                        </span>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages - 1}
                            className={`p-2 rounded-full transition-colors ${currentPage === totalPages - 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
