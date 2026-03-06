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
        tags?: { id: number; name: string }[]
    }
    restaurant: {
        id: string
        username: string
        display_name: string
        avatar_url: string | null
        address: string | null
        latitude?: number | null
        longitude?: number | null
    }
    distance: number | null
}

export interface SpecialsCardProps {
    onItemClick: (special: Special) => void
    className?: string
    mobileFullHeight?: boolean
}

export function SpecialsCard({ onItemClick, className, mobileFullHeight }: SpecialsCardProps) {
    const [specials, setSpecials] = useState<Special[]>([])
    const [loading, setLoading] = useState(true)
    const [locationDenied, setLocationDenied] = useState(false)
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(0)
    const [itemsPerPage, setItemsPerPage] = useState(6)

    useEffect(() => {
        setItemsPerPage(6)
    }, [])

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

    const totalPages = Math.ceil(specials.length / itemsPerPage)
    const currentSpecials = specials.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
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
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-700" />
                    <p className="text-gray-500 text-sm">Loading specials...</p>
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
            <div className="flex flex-col items-center justify-center pt-1 mb-2 flex-shrink-0 w-full">
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
                                stroke="#374151"
                                strokeWidth="1"
                                fill="none"
                            />
                            <line x1="12" y1="6" x2="14" y2="6" stroke="#374151" strokeWidth="1" />
                        </svg>
                        <div className="flex-1 h-[1px] bg-gray-700 -ml-[1px]"></div>
                    </div>

                    <h2 className="text-[14px] font-medium tracking-widest uppercase whitespace-nowrap text-gray-900">
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
                                stroke="#374151"
                                strokeWidth="1"
                                fill="none"
                            />
                            <line x1="12" y1="6" x2="14" y2="6" stroke="#374151" strokeWidth="1" />
                        </svg>
                        <div className="flex-1 h-[1px] bg-gray-700 -ml-[1px]"></div>
                    </div>
                </div>

                {locationDenied && (
                    <span className="text-xs text-gray-400 mt-2">Showing all specials</span>
                )}
            </div>

            <div className="flex-1 px-2 flex flex-col min-h-0">
                <div className="flex-1 min-h-0">
                <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                    {currentSpecials.map((special, index) => (
                        <button
                            key={`${special.item.id}-${index}`}
                            onClick={() => onItemClick(special)}
                            className="group cursor-pointer text-left w-full h-full"
                        >
                            <div
                                className="rounded-xl overflow-hidden flex flex-col h-full transition-all duration-200 group-hover:scale-[0.98] group-active:scale-[0.96]"
                                style={{
                                    background: 'rgba(255,255,255,0.7)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: '0.5px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
                                }}
                            >
                                {/* Image */}
                                <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 flex-shrink-0">
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
                                        <div className="absolute inset-0 flex items-center justify-center text-xl text-gray-300">
                                            🍽️
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-1.5 flex flex-col flex-1">
                                    <p
                                        className="font-semibold text-[11px] text-gray-900 truncate"
                                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', letterSpacing: '-0.01em' }}
                                        title={special.item.title}
                                    >
                                        {special.item.title}
                                    </p>

                                    {/* Description - hidden on mobile */}
                                    {special.item.description && (
                                        <p className="hidden md:line-clamp-1 text-[11px] text-gray-500 mt-0.5 break-words">
                                            {special.item.description}
                                        </p>
                                    )}

                                    <div className="mt-auto pt-0.5">
                                        <p className="text-[9px] font-medium text-gray-400 truncate" title={special.restaurant.display_name}>
                                            {special.restaurant.display_name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                    {/* Empty placeholders to maintain grid structure */}
                    {Array.from({ length: itemsPerPage - currentSpecials.length }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                </div>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-2 pb-2 flex-shrink-0">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}
                            className={`p-1.5 rounded-full transition-all duration-200 ${currentPage === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            style={currentPage > 0 ? { background: 'rgba(0,0,0,0.04)' } : undefined}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <span
                            className="text-xs font-medium text-gray-400 tabular-nums"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                        >
                            {currentPage + 1} / {totalPages}
                        </span>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages - 1}
                            className={`p-1.5 rounded-full transition-all duration-200 ${currentPage === totalPages - 1
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                            style={currentPage < totalPages - 1 ? { background: 'rgba(0,0,0,0.04)' } : undefined}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
