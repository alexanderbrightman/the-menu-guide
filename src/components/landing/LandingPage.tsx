'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthForm } from '@/components/auth/AuthForm'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { Badge } from '@/components/ui/badge'
import { X, ArrowRight, Loader2, Search } from 'lucide-react'

// Helper function to get border color for allergen tags
const getAllergenBorderColor = (tagName: string): string => {
  const colorMap: Record<string, string> = {
    'dairy-free': '#B5C1D9',
    'gluten-free': '#D48963',
    'nut-free': '#408250',
    'pescatarian': '#F698A7',
    'shellfish-free': '#F6D98E',
    'spicy': '#F04F68',
    'vegan': '#A9CC66',
    'vegetarian': '#3B91A2'
  }
  return colorMap[tagName.toLowerCase()] || ''
}

interface Restaurant {
  username: string
  display_name: string
  avatar_url?: string
}


export function LandingPage() {
  const router = useRouter()
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Restaurant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [loadingResult, setLoadingResult] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const heroSectionRef = useRef<HTMLDivElement>(null)
  const [arrowAnimationKey, setArrowAnimationKey] = useState(0)
  const titleCardRef = useRef<HTMLHeadingElement>(null)
  const [shinePosition, setShinePosition] = useState(50)

  // Handle shine effect based on mouse or gyroscope
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth } = window
      const x = e.clientX
      // Map cursor position to percentage (0-100)
      const position = (x / innerWidth) * 100
      setShinePosition(position)
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Gamma is left-to-right tilt in degrees [-90, 90]
      const gamma = e.gamma || 0
      // Map -45 to 45 degrees to 0-100% range for the shine
      // Clamped to avoid extreme values
      const position = Math.min(100, Math.max(0, ((gamma + 45) / 90) * 100))
      setShinePosition(position)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('deviceorientation', handleOrientation)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

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
            setArrowAnimationKey(prev => prev + 1)
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




  // Track scroll progress for blur and color transition with optimized performance
  useEffect(() => {
    let rafId: number | null = null
    let cachedHeroHeight: number | null = null
    let cachedViewportHeight: number | null = null

    const handleScroll = () => {
      if (rafId) return // Skip if already scheduled

      rafId = requestAnimationFrame(() => {
        if (!heroSectionRef.current) {
          rafId = null
          return
        }

        const scrollY = window.scrollY

        // Cache expensive calculations (only recalculate if needed)
        if (!cachedHeroHeight || !cachedViewportHeight) {
          cachedHeroHeight = heroSectionRef.current.offsetHeight
          cachedViewportHeight = window.innerHeight
        }

        const heroHeight = cachedHeroHeight
        const viewportHeight = cachedViewportHeight

        // Calculate progress: 0 when at top, 1 when hero section is fully scrolled past
        const progress = scrollY >= heroHeight - viewportHeight * 0.5
          ? 1
          : Math.min(1, Math.max(0, scrollY / (heroHeight - viewportHeight * 0.5)))

        // Direct update for immediate, seamless color transition
        setScrollProgress(progress)

        rafId = null
      })
    }

    // Recalculate cached values on resize
    const handleResize = () => {
      if (heroSectionRef.current) {
        cachedHeroHeight = heroSectionRef.current.offsetHeight
      }
      cachedViewportHeight = window.innerHeight
      // Trigger scroll update after resize
      handleScroll()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    handleScroll() // Initial calculation

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: 'var(--font-nunito)' }}>
      {/* Warm white gradient background */}
      <div
        className="fixed inset-0 transition-colors duration-300"
        style={{
          background: `linear-gradient(180deg, #F5F0EB 0%, #F0EBE5 50%, #EBE5DE 100%)`,
          opacity: 1 - scrollProgress * 0.3, // Fade out as user scrolls
          zIndex: 1,
        }}
      />

      {/* Outer Frame - Static but fades out */}
      <div
        className="fixed border border-black z-30 pointer-events-none transition-opacity duration-0"
        style={{
          inset: 'clamp(0.5rem, 2vw, 1.5rem)',
          borderRadius: '4px',
          opacity: 1 - scrollProgress * 3,
        }}
      />



      {/* Header bar with title */}
      <div
        className="fixed z-20 flex items-start justify-start"
        style={{
          top: 'clamp(0.5rem, 2vw, 1.5rem)',
          left: 'clamp(0.5rem, 2vw, 1.5rem)',
          right: 'clamp(0.5rem, 2vw, 1.5rem)',
          height: 'calc(clamp(5rem, 12vw, 6rem) - clamp(0.5rem, 2vw, 1.5rem))',
          transform: `translateY(-${scrollProgress * 100}px)`,
          opacity: 1 - scrollProgress * 1.5,
        }}
      >
        {/* Header Content Container */}
        <div className="relative w-full max-w-7xl flex items-start justify-start p-6">

          {/* Title in center */}
          <h1
            ref={titleCardRef}
            className="font-normal leading-none tracking-tight text-center select-none text-black"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              letterSpacing: '0em',
              paddingBottom: '0',
            }}
          >
            The Menu Guide
          </h1>
        </div>
      </div>

      {/* Footer bar with Login button */}
      <div
        className="fixed z-20 flex items-end justify-end"
        style={{
          bottom: 'clamp(0.5rem, 2vw, 1.5rem)',
          left: 'clamp(0.5rem, 2vw, 1.5rem)',
          right: 'clamp(0.5rem, 2vw, 1.5rem)',
          height: 'calc(clamp(5rem, 12vw, 6rem) - clamp(0.5rem, 2vw, 1.5rem))',
          transform: `translateY(${scrollProgress * 100}px)`,
          opacity: 1 - scrollProgress * 1.5,
        }}
      >
        <div className="relative w-full max-w-7xl flex items-end justify-end p-6">
          <Button
            onClick={() => setShowAuthForm(true)}
            variant="ghost"
            className="hover:bg-black/10 rounded-none text-xs sm:text-sm font-medium transition-all duration-300 px-6 py-2 h-auto border border-black text-black"
          >
            Log In
            <ArrowRight className="ml-2 h-3 w-3 text-black" />
          </Button>
        </div>
      </div>


      {/* Hero Layer */}
      <div
        ref={heroSectionRef}
        className="relative z-10 min-h-screen px-4 sm:px-6 lg:px-8"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + clamp(3rem, 8vw, 4.5rem)), clamp(3rem, 8vw, 4.5rem))',
        }}
      >

        {/* Search bar and images container - centered in viewport */}
        <div className="absolute top-1/2 left-1/2 w-full flex flex-col items-center" style={{
          width: 'min(85vw, 500px)',
          paddingLeft: '0',
          paddingRight: '0',
          transform: 'translate(-50%, calc(-100% + clamp(1.5rem, 4vw, 2.5rem)))'
        }}>
          {/* Meal images - positioned above search bar, slightly smaller than search bar */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8 md:mb-10 w-full">
            <div className="relative flex-1 aspect-[4/3] overflow-hidden border border-black">
              <Image
                src="/Breakfast.jpeg"
                alt="Breakfast"
                fill
                className="object-cover"
                sizes="(max-width: 640px) calc((100vw - 2rem - 0.5rem) / 3), (max-width: 768px) calc((min(100vw - 4rem, 500px) - 0.75rem) / 3), calc((min(100vw - 4rem, 500px) - 1rem) / 3)"
                priority
              />
            </div>
            <div className="relative flex-1 aspect-[4/3] overflow-hidden border border-black">
              <Image
                src="/Lunch.jpeg"
                alt="Lunch"
                fill
                className="object-cover"
                sizes="(max-width: 640px) calc((100vw - 2rem - 0.5rem) / 3), (max-width: 768px) calc((min(100vw - 4rem, 500px) - 0.75rem) / 3), calc((min(100vw - 4rem, 500px) - 1rem) / 3)"
                priority
              />
            </div>
            <div className="relative flex-1 aspect-[4/3] overflow-hidden border border-black">
              <Image
                src="/Dinner.jpeg"
                alt="Dinner"
                fill
                className="object-cover"
                sizes="(max-width: 640px) calc((100vw - 2rem - 0.5rem) / 3), (max-width: 768px) calc((min(100vw - 4rem, 500px) - 0.75rem) / 3), calc((min(100vw - 4rem, 500px) - 1rem) / 3)"
                priority
              />
            </div>
          </div>

          {/* Search bar - squared off design */}
          <div className="relative w-full">
            {/* Rainbow border wrapper - appears on focus, positioned behind */}
            <div
              id="rainbow-border-wrapper"
              className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 182, 193, 0.8) 0%, rgba(255, 218, 185, 0.8) 14%, rgba(255, 255, 182, 0.8) 28%, rgba(182, 255, 182, 0.8) 42%, rgba(185, 218, 255, 0.8) 57%, rgba(218, 185, 255, 0.8) 71%, rgba(255, 182, 218, 0.8) 85%, rgba(255, 182, 193, 0.8) 100%)',
                padding: '2px',
                zIndex: 0,
                margin: '-2px',
              }}
            >
              <div className="w-full h-full bg-transparent"></div>
            </div>

            {/* Search bar container - always visible */}
            <label
              id="search-bar-container"
              htmlFor="search-input"
              className="relative w-full flex items-center transition-all duration-500 ease-out backdrop-blur-xl border border-black cursor-text"
              style={{
                height: 'clamp(2.5rem, 5vw, 3.5rem)',
                paddingLeft: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                paddingRight: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.75) 100%)',
                boxShadow: `
                      0 8px 32px 0 rgba(0, 0, 0, 0.08),
                      0 2px 8px 0 rgba(0, 0, 0, 0.04),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                      inset 0 -1px 0 0 rgba(0, 0, 0, 0.01)
                    `,
                zIndex: 1,
              }}
              onMouseEnter={(e) => {
                const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                if (container) {
                  container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.85) 100%)';
                  container.style.boxShadow = `
                          0 12px 40px 0 rgba(0, 0, 0, 0.12),
                          0 4px 12px 0 rgba(0, 0, 0, 0.06),
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.4),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.01)
                        `;
                }
              }}
              onMouseLeave={(e) => {
                const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                if (container && rainbowBorder && rainbowBorder.style.opacity !== '1') {
                  container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.75) 100%)';
                  container.style.boxShadow = `
                          0 8px 32px 0 rgba(0, 0, 0, 0.08),
                          0 2px 8px 0 rgba(0, 0, 0, 0.04),
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.01)
                        `;
                }
              }}
            >
              <Search
                className="absolute text-gray-700 z-10 transition-all duration-300"
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
                placeholder="Explore menus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full !border-0 bg-transparent !focus-visible:ring-0 !focus-visible:border-0 focus:ring-0 focus:outline-none focus-visible:outline-none text-gray-900 placeholder:text-gray-600 h-auto py-2 font-medium"
                style={{
                  paddingLeft: 'clamp(2.5rem, 6vw, 3.5rem)',
                  paddingRight: 'clamp(2.5rem, 6vw, 3.5rem)',
                  fontSize: '16px',
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important',
                }}
                onFocus={(e) => {
                  const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                  const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                  if (container && rainbowBorder) {
                    container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)';
                    container.style.boxShadow = `
                          0 12px 40px 0 rgba(0, 0, 0, 0.12),
                          0 4px 12px 0 rgba(0, 0, 0, 0.06)
                        `;
                    rainbowBorder.style.opacity = '1';
                  }
                }}
                onBlur={(e) => {
                  const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                  const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                  if (container && rainbowBorder) {
                    container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0.75) 100%)';
                    container.style.boxShadow = `
                          0 8px 32px 0 rgba(0, 0, 0, 0.08),
                          0 2px 8px 0 rgba(0, 0, 0, 0.04),
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.3),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.01)
                        `;
                    rainbowBorder.style.opacity = '0';
                  }
                }}
              />
              <ArrowRight
                key={arrowAnimationKey}
                className={`absolute top-1/2 text-gray-700 z-10 transition-all duration-300 ${searchResults.length > 0 ? 'arrow-swing-animation text-gray-900' : ''
                  }`}
                style={{
                  right: 'clamp(0.75rem, 2.5vw, 1.5rem)',
                  width: 'clamp(1rem, 2vw, 1.5rem)',
                  height: 'clamp(1rem, 2vw, 1.5rem)',
                  transform: searchResults.length > 0 ? undefined : 'translateY(-50%)',
                  transformOrigin: 'center center',
                }}
              />
            </label>

            {/* Search results dropdown - squared off design */}
            {searchQuery.trim().length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-3 shadow-xl shadow-gray-300/12 border border-black bg-white/80 backdrop-blur-md max-h-96 overflow-y-auto z-30"
              >
                {isSearching ? (
                  <div className="p-8 text-center text-gray-900">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-900" />
                    <p className="text-gray-700">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((restaurant) => {
                      const isLoading = loadingResult === restaurant.username;
                      return (
                        <div
                          key={restaurant.username}
                          className={`relative transition-all duration-200 ${isLoading ? 'p-[1px]' : ''}`}
                        >
                          {/* Animated Rainbow Border Background */}
                          {isLoading && (
                            <div className="absolute inset-0 z-0 overflow-hidden rounded-sm">
                              <div
                                className="absolute inset-[-150%] w-[400%] h-[400%] animate-spin"
                                style={{
                                  background: 'conic-gradient(from 0deg, rgba(255, 182, 193, 0.8), rgba(255, 218, 185, 0.8), rgba(255, 255, 182, 0.8), rgba(182, 255, 182, 0.8), rgba(185, 218, 255, 0.8), rgba(218, 185, 255, 0.8), rgba(255, 182, 218, 0.8), rgba(255, 182, 193, 0.8))',
                                  animationDuration: '1s',
                                  left: '-150%',
                                  top: '-150%',
                                }}
                              />
                            </div>
                          )}

                          <Link
                            href={`/menu/${restaurant.username}`}
                            prefetch={true}
                            onClick={() => setLoadingResult(restaurant.username)}
                            className={`relative w-full px-4 py-3 text-left transition-colors flex items-center gap-4 z-10 ${isLoading ? 'bg-white/95' : 'hover:bg-gray-100 bg-transparent'
                              }`}
                            onMouseEnter={() => router.prefetch(`/menu/${restaurant.username}`)}
                          >
                            {restaurant.avatar_url ? (
                              <Image
                                src={restaurant.avatar_url}
                                alt={restaurant.display_name}
                                width={56}
                                height={56}
                                className="object-cover flex-shrink-0 border border-black"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-200 flex items-center justify-center flex-shrink-0 border border-black">
                                <span className="text-gray-900 font-medium text-base">
                                  {restaurant.display_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-gray-900 font-medium">{restaurant.display_name}</span>
                              <span className="text-gray-600 text-sm">@{restaurant.username}</span>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-700">
                    <p>No restaurants found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Information Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto w-full">
          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-black mb-4 sm:mb-6 tracking-tight">
              How Does The Menu Guide Help?
            </h2>
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-light text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Here's what your menu could look like — beautiful photos, clear descriptions, and dietary info that helps customers make informed choices.
            </p>
          </div>

          {/* Example menu cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-10 sm:mb-14 md:mb-16">
            {/* Duck Card */}
            <div className="group cursor-pointer border border-black bg-white">
              <div className="relative aspect-[3/2] overflow-hidden border-b border-black mb-3 bg-gray-100">
                <Image
                  src="/duck_homepg.png"
                  alt="Hudson Duck with White Asparagus"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">Hudson Duck with White Asparagus</h3>
                  <div className="text-gray-900 font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                    $32
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">
                  Hudson vally duck breast, with french white asparagus, wild rice, orange jus
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                </div>
              </div>
            </div>

            {/* Lobster Card */}
            <div className="group cursor-pointer border border-black bg-white">
              <div className="relative aspect-[3/2] overflow-hidden border-b border-black mb-3 bg-gray-100">
                <Image
                  src="/lobster_homepg.png"
                  alt="Lobster Thermidor"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">Lobster Thermidor</h3>
                  <div className="text-gray-900 font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                    $34
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">
                  Maine lobster with broiled gruyere cheese and turned potatoes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('pescatarian')
                    }}
                  >
                    pescatarian
                  </Badge>
                </div>
              </div>
            </div>

            {/* Scallops Card */}
            <div className="group cursor-pointer border border-black bg-white">
              <div className="relative aspect-[3/2] overflow-hidden border-b border-black mb-3 bg-gray-100">
                <Image
                  src="/scallop_homepg.png"
                  alt="Scallops with Apple Fennel Salad"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">Scallops with Apple Fennel Salad</h3>
                  <div className="text-gray-900 font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                    $29
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">
                  Seared scallops, vadauvan spice gravy, apple and fennel salad, charred leeks
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('pescatarian')
                    }}
                  >
                    pescatarian
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stew Card */}
            <div className="group cursor-pointer border border-black bg-white">
              <div className="relative aspect-[3/2] overflow-hidden border-b border-black mb-3 bg-gray-100">
                <Image
                  src="/stew_homepg.png"
                  alt="Pot au Feu"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 leading-tight">Pot au Feu</h3>
                  <div className="text-gray-900 font-semibold text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                    $28
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">
                  Beef shank stew with fresh market vegetables
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-gray-50 border text-gray-800 hover:border-gray-300 transition-colors rounded-none"
                    style={{
                      borderColor: getAllergenBorderColor('dairy-free')
                    }}
                  >
                    dairy-free
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Contact the Builder */}
          <div className="text-center mt-10 sm:mt-14 md:mt-18">
            <a
              href="https://www.instagram.com/alexanderbrightman/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-black hover:text-gray-700 transition-colors inline-flex items-center gap-1 hover:underline underline-offset-4"
            >
              Contact the Builder
            </a>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="shadow-xl shadow-gray-300/12 border border-black bg-white/90 backdrop-blur-md max-w-sm w-full max-h-[85vh] overflow-hidden"
          >
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-medium text-gray-900">Welcome to The Menu Guide</h2>
                  <p className="text-sm text-gray-700 mt-1">Sign in to your account or create a new one</p>
                </div>
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-none border border-black transition-colors group"
                >
                  <X className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
                </button>
              </div>
            </div>
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              <AuthForm
                onSuccess={() => setShowAuthForm(false)}
                onForgotPassword={() => {
                  setShowAuthForm(false)
                  setShowPasswordResetModal(true)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <PasswordResetModal onClose={() => setShowPasswordResetModal(false)} />
      )}
    </div>
  )
}
