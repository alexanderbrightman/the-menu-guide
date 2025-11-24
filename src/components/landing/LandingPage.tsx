'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthForm } from '@/components/auth/AuthForm'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { Badge } from '@/components/ui/badge'
import { X, ArrowRight, ChevronDown, Check, Loader2, Search } from 'lucide-react'

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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const heroSectionRef = useRef<HTMLDivElement>(null)
  const [arrowAnimationKey, setArrowAnimationKey] = useState(0)
  const titleCardRef = useRef<HTMLHeadingElement>(null)

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/restaurants/search?q=${encodeURIComponent(query.trim())}`)
      const data = await response.json()
      
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
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, performSearch])

  const handleRestaurantClick = (username: string) => {
    router.push(`/menu/${username}`)
  }


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
    <div className="min-h-screen relative overflow-hidden">
      {/* Warm white gradient background */}
      <div
        className="fixed inset-0 transition-colors duration-300"
        style={{
          background: `linear-gradient(180deg, #FDF8F3 0%, #FAF5F0 50%, #F7F0E8 100%)`,
          opacity: 1 - scrollProgress * 0.3, // Fade out as user scrolls
          zIndex: 1,
        }}
      />
      
      {/* Subtle pattern overlay for texture */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Hero Layer */}
      <div ref={heroSectionRef} className="relative z-10 flex flex-col min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Top bar with title and login button */}
        <div className="flex items-center justify-between pt-6 sm:pt-8 z-20">
          {/* Title in upper left */}
          <h1
            ref={titleCardRef}
            className="font-normal leading-none tracking-tight text-gray-900"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              letterSpacing: '-0.03em',
            }}
          >
            The Menu Guide
          </h1>
          
          {/* Login button */}
          <Button
            onClick={() => setShowAuthForm(true)}
            variant="outline"
            className="border border-gray-200/60 text-gray-900 hover:bg-white/80 bg-white/80 backdrop-blur-md rounded-xl text-sm font-medium transition-all duration-300 px-4 py-2"
          >
            Log In
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>

        {/* Main content centered - Search bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full mx-auto px-4 flex flex-col items-center" style={{ maxWidth: 'min(95vw, 900px)' }}>
            {/* Search bar - modern design */}
            <div className="relative w-full" style={{ maxWidth: '500px' }}>
                <div 
                  className="relative bg-white/80 backdrop-blur-md border border-gray-200/60 rounded-2xl shadow-lg shadow-gray-200/12 w-full flex items-center transition-all duration-300 hover:shadow-xl hover:shadow-gray-300/12 hover:border-gray-300/80 focus-within:shadow-xl focus-within:shadow-gray-300/12 focus-within:border-gray-400/80 h-11"
                >
                  <Search 
                    className="absolute left-5 text-gray-400 z-10 transition-colors duration-200"
                    style={{
                      width: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                      height: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-0 bg-transparent rounded-2xl focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-400 h-full font-medium"
                    style={{
                      paddingLeft: 'clamp(3rem, 8vw, 3.75rem)',
                      paddingRight: 'clamp(3rem, 8vw, 3.75rem)',
                      paddingTop: '0',
                      paddingBottom: '0',
                      fontSize: 'clamp(1rem, 2.2vw, 1.0625rem)',
                      height: '100%',
                    }}
                  />
                  <ArrowRight 
                    key={arrowAnimationKey}
                    className={`absolute right-5 top-1/2 text-gray-500 z-10 transition-colors duration-300 ${
                      searchResults.length > 0 ? 'arrow-swing-animation text-gray-700' : ''
                    }`}
                    style={{
                      width: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                      height: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                      transform: searchResults.length > 0 ? undefined : 'translateY(-50%)',
                      transformOrigin: 'center center',
                    }}
                  />
                </div>

            {/* Search results dropdown - glassmorphism design */}
            {searchQuery.trim().length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-3 rounded-2xl shadow-xl shadow-gray-300/12 border border-gray-200/60 bg-white/80 backdrop-blur-md max-h-96 overflow-y-auto z-30"
              >
                {isSearching ? (
                  <div className="p-8 text-center text-gray-900">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-900" />
                    <p className="text-gray-700">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((restaurant) => (
                      <button
                        key={restaurant.username}
                        onClick={() => handleRestaurantClick(restaurant.username)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-center gap-4"
                      >
                        {restaurant.avatar_url ? (
                          <Image
                            src={restaurant.avatar_url}
                            alt={restaurant.display_name}
                            width={56}
                            height={56}
                            className="rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-900 font-medium text-base">
                              {restaurant.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-gray-900 font-medium">{restaurant.display_name}</span>
                          <span className="text-gray-600 text-sm">@{restaurant.username}</span>
                        </div>
                      </button>
                    ))}
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

        {/* Scroll indicator at bottom */}
        <div className="flex flex-col items-center text-gray-700 pb-8 sm:pb-12">
          <span className="text-xs sm:text-sm font-light mb-2">Scroll to learn more</span>
          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 animate-bounce text-gray-700" />
        </div>
      </div>

      {/* Information Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto w-full">
          {/* Main heading */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-gray-900 mb-4 sm:mb-6 tracking-tight">
              How Does The Menu Guide Help?
            </h2>
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-light text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Here's what your menu could look like — beautiful photos, clear descriptions, and dietary info that helps customers make informed choices.
            </p>
          </div>

          {/* Example menu cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 mb-10 sm:mb-14 md:mb-16">
            {/* Duck Card */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-3 bg-gray-100">
                <Image 
                  src="/duck_homepg.png" 
                  alt="Hudson Duck with White Asparagus"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
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
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
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
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-3 bg-gray-100">
                <Image 
                  src="/lobster_homepg.png" 
                  alt="Lobster Thermidor"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
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
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
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
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-3 bg-gray-100">
                <Image 
                  src="/scallop_homepg.png" 
                  alt="Scallops with Apple Fennel Salad"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
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
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
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
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-3 bg-gray-100">
                <Image 
                  src="/stew_homepg.png" 
                  alt="Pot au Feu"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
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
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-gray-50 border-gray-200 text-gray-800 hover:border-gray-300 transition-colors"
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

          {/* Separator */}
          <div className="flex items-center justify-center my-10 sm:my-14 md:my-18">
            <div className="w-32 sm:w-40 md:w-48 h-px bg-gray-300"></div>
          </div>

          {/* Feature list */}
          <div className="mb-10 sm:mb-14 md:mb-16">
            <p className="text-center text-base sm:text-lg md:text-xl font-light text-gray-700 max-w-3xl mx-auto leading-relaxed mb-8 sm:mb-10 md:mb-12">
              The Menu Guide takes what you already do and makes it smoother, clearer, and more inviting. It's the bridge between your kitchen and your customers' expectations — with none of the hassle of building your own website
            </p>
            <ul className="space-y-4 sm:space-y-5 md:space-y-6 text-base sm:text-lg md:text-xl font-light text-gray-800 max-w-3xl mx-auto">
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-0.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center group-hover:bg-gray-300 group-hover:border-gray-400 transition-all duration-200">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-gray-900">Scan your existing menu to auto-populate items</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-0.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center group-hover:bg-gray-300 group-hover:border-gray-400 transition-all duration-200">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-gray-900">Upload your specials in seconds</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-0.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center group-hover:bg-gray-300 group-hover:border-gray-400 transition-all duration-200">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-gray-900">Add allergen tags so guests immediately know what's safe</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-0.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center group-hover:bg-gray-300 group-hover:border-gray-400 transition-all duration-200">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-gray-900">Share one simple QR code that drops customers right into your visual menu</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-0.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center group-hover:bg-gray-300 group-hover:border-gray-400 transition-all duration-200">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-gray-900">Reduce table-side questions and speed up ordering</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-0.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center group-hover:bg-gray-300 group-hover:border-gray-400 transition-all duration-200">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-gray-900">Give guests confidence in what they're choosing</span>
              </li>
            </ul>
          </div>

          {/* Call to action */}
          <div className="text-center space-y-4 mt-10 sm:mt-14 md:mt-18">
            <Button
              onClick={() => setShowAuthForm(true)}
              variant="outline"
              className="border border-gray-200/60 text-gray-900 hover:bg-white/80 bg-white/80 backdrop-blur-md rounded-xl shadow-lg shadow-gray-200/12 hover:shadow-xl hover:shadow-gray-300/12 text-sm sm:text-base md:text-lg font-medium transition-all duration-300 px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 md:py-4"
            >
              Start building your menu!
            </Button>
            
            {/* Contact the Builder */}
            <div className="mt-6">
              <a 
                href="https://www.instagram.com/alexanderbrightman/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors inline-flex items-center gap-1 underline decoration-1 underline-offset-2"
              >
                Contact the Builder
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="shadow-xl shadow-gray-300/12 border border-gray-200/60 bg-white/90 backdrop-blur-md max-w-sm w-full max-h-[85vh] overflow-hidden rounded-2xl"
          >
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-medium text-gray-900">Welcome to The Menu Guide</h2>
                  <p className="text-sm text-gray-700 mt-1">Sign in to your account or create a new one</p>
                </div>
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
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
