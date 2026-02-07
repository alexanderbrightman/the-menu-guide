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
                {/* Search bar container */}
                <label
                    htmlFor="search-input"
                    className="relative w-full flex items-center transition-all duration-300 cursor-text rounded-2xl bg-white/10 backdrop-blur-md hover:bg-white/15 focus-within:bg-white/20 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 focus-within:shadow-black/40 border border-white/10 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20"
                    style={{
                        height: 'clamp(3rem, 5.5vw, 4rem)',
                        paddingLeft: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                        paddingRight: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                    }}
                >
                    <Search
                        className="absolute text-white z-10"
                        style={{
                            left: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                            width: 'clamp(1rem, 2vw, 1.5rem)',
                            height: 'clamp(1rem, 2vw, 1.5rem)',
                        }}
                    />
                    <Input
                        id="search-input"
                        type="text"
                        name="search"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        placeholder="Search for restaurants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full !border-0 bg-transparent !focus-visible:ring-0 !focus-visible:border-0 focus:ring-0 focus:outline-none text-white placeholder:text-white h-auto py-2 font-medium"
                        style={{
                            paddingLeft: 'clamp(2.5rem, 6vw, 3.5rem)',
                            paddingRight: 'clamp(2.5rem, 6vw, 3.5rem)',
                            fontSize: '16px',
                            border: 'none !important',
                            outline: 'none !important',
                            boxShadow: 'none !important',
                        }}
                    />
                    <ArrowRight
                        key={arrowAnimationKey}
                        className={`absolute top-1/2 -translate-y-1/2 text-white z-10 ${searchResults.length > 0 ? 'arrow-swing-animation' : ''
                            }`}
                        style={{
                            right: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                            width: 'clamp(1rem, 2vw, 1.5rem)',
                            height: 'clamp(1rem, 2vw, 1.5rem)',
                        }}
                    />
                </label>

                {/* Search results dropdown */}
                {searchQuery.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 shadow-xl shadow-black/40 border border-white/10 bg-black/80 backdrop-blur-md max-h-96 overflow-y-auto z-30 rounded-2xl">
                        {isSearching ? (
                            <div className="p-8 text-center text-white/70">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-white/70" />
                                <p className="text-white/70">Searching...</p>
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
                                            className={`relative w-full px-4 py-3 text-left transition-colors flex items-center gap-4 ${isLoading ? 'bg-white/10' : 'hover:bg-white/5'
                                                }`}
                                            onMouseEnter={() => router.prefetch(`/menu/${restaurant.username}`)}
                                        >
                                            {restaurant.avatar_url ? (
                                                <Image
                                                    src={restaurant.avatar_url}
                                                    alt={restaurant.display_name}
                                                    width={56}
                                                    height={56}
                                                    className="object-cover flex-shrink-0 border border-white/20 rounded-lg"
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
                                            <div className={`w-14 h-14 bg-white/10 ${restaurant.avatar_url ? 'hidden' : 'flex'} items-center justify-center flex-shrink-0 border border-white/20 rounded-lg`}>
                                                <span className="text-white font-medium text-base">
                                                    {restaurant.display_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">
                                                    {restaurant.display_name}
                                                </span>
                                                <span className="text-white/60 text-sm">@{restaurant.username}</span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-white/50">
                                <p>No restaurants found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
