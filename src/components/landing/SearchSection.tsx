'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Restaurant {
    username: string
    display_name: string
    avatar_url?: string
}

export function SearchSection() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Restaurant[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [loadingResult, setLoadingResult] = useState<string | null>(null)
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const [arrowAnimationKey, setArrowAnimationKey] = useState(0)

    const performSearch = useCallback(async (query: string) => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        if (!query || query.trim().length < 1) {
            setSearchResults([])
            setIsSearching(false)
            return
        }

        // Create new abort controller for this request
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        setIsSearching(true)
        try {
            const response = await fetch(
                `/api/restaurants/search?q=${encodeURIComponent(query.trim())}`,
                { signal: abortController.signal }
            )
            const data = await response.json()

            // Only update state if this request wasn't aborted
            if (!abortController.signal.aborted) {
                if (response.ok) {
                    const restaurants = data.restaurants || []
                    setSearchResults(restaurants)
                    // Trigger arrow animation when results appear
                    if (restaurants.length > 0) {
                        setArrowAnimationKey((prev) => prev + 1)
                    }
                } else {
                    setSearchResults([])
                }
            }
        } catch (error) {
            // Ignore abort errors, they're expected
            if (error instanceof Error && error.name !== 'AbortError') {
                setSearchResults([])
            }
        } finally {
            // Only clear loading if this request wasn't aborted
            if (!abortController.signal.aborted) {
                setIsSearching(false)
            }
        }
    }, [])

    useEffect(() => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
            performSearch(searchQuery)
        }, 300)

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current)
            }
        }
    }, [searchQuery, performSearch])

    return (
        <div className="w-full">
            <div className="relative w-full max-w-2xl mx-auto">
                {/* Search bar container — frosted glass, Apple-inspired */}
                <label
                    htmlFor="search-input"
                    className="relative w-full flex items-center gap-2.5 transition-all duration-300 cursor-text rounded-2xl"
                    style={{
                        height: 'clamp(3rem, 5.5vw, 4rem)',
                        paddingLeft: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                        paddingRight: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                        background: 'rgba(255,255,255,0.72)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '0.5px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0.5px 1px rgba(0,0,0,0.04)',
                    }}
                >
                    <Search
                        className="flex-shrink-0 text-gray-400"
                        style={{
                            width: 'clamp(1rem, 2vw, 1.25rem)',
                            height: 'clamp(1rem, 2vw, 1.25rem)',
                        }}
                    />
                    <Input
                        id="search-input"
                        type="text"
                        name="search"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        placeholder="Search restaurants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 !border-0 bg-transparent !focus-visible:ring-0 !focus-visible:border-0 focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-400/60 h-auto py-0 px-0"
                        style={{
                            fontSize: '16px',
                            border: 'none !important',
                            outline: 'none !important',
                            boxShadow: 'none !important',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                            fontWeight: 400,
                            letterSpacing: '-0.01em',
                        }}
                    />
                    <ArrowRight
                        key={arrowAnimationKey}
                        className={`flex-shrink-0 text-gray-400 ${searchResults.length > 0 ? 'arrow-swing-animation' : ''}`}
                        style={{
                            width: 'clamp(1rem, 2vw, 1.25rem)',
                            height: 'clamp(1rem, 2vw, 1.25rem)',
                        }}
                    />
                </label>

                {/* Search results dropdown */}
                {searchQuery.trim().length > 0 && (
                    <div
                        className="absolute top-full left-0 right-0 mt-3 max-h-96 overflow-y-auto z-30 rounded-2xl"
                        style={{
                            background: 'rgba(255,255,255,0.88)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '0.5px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
                        }}
                    >
                        {isSearching ? (
                            <div className="p-8 text-center text-gray-500">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-500" />
                                <p className="text-gray-500">Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="py-2">
                                {searchResults.map((restaurant) => {
                                    const isLoading = loadingResult === restaurant.username
                                    return (
                                        <Link
                                            key={restaurant.username}
                                            href={`/menu/${restaurant.username}`}
                                            prefetch={true}
                                            onClick={() => setLoadingResult(restaurant.username)}
                                            className={`relative w-full px-4 py-3 text-left transition-colors flex items-center gap-4 ${isLoading ? 'bg-gray-100' : 'hover:bg-gray-50'
                                                }`}
                                            onMouseEnter={() => router.prefetch(`/menu/${restaurant.username}`)}
                                        >
                                            {restaurant.avatar_url ? (
                                                <Image
                                                    src={restaurant.avatar_url}
                                                    alt={restaurant.display_name}
                                                    width={56}
                                                    height={56}
                                                    className="object-cover flex-shrink-0 border border-gray-200 rounded-lg"
                                                    onError={(e) => {
                                                        console.warn(`Failed to load avatar for ${restaurant.username}: ${restaurant.avatar_url}`)
                                                        // Hide the image by setting display to none
                                                        e.currentTarget.style.display = 'none'
                                                        // Show the fallback div by finding the next sibling
                                                        const fallback = e.currentTarget.nextElementSibling
                                                        if (fallback) {
                                                            (fallback as HTMLElement).style.display = 'flex'
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-14 h-14 bg-gray-100 ${restaurant.avatar_url ? 'hidden' : 'flex'} items-center justify-center flex-shrink-0 border border-gray-200 rounded-lg`}>
                                                <span className="text-gray-900 font-medium text-base">
                                                    {restaurant.display_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-medium">
                                                    {restaurant.display_name}
                                                </span>
                                                <span className="text-gray-500 text-sm">@{restaurant.username}</span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-400">
                                <p>No restaurants found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
