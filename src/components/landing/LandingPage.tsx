'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthForm } from '@/components/auth/AuthForm'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { Badge } from '@/components/ui/badge'
import { X, ArrowRight, ChevronDown, Check, Loader2 } from 'lucide-react'
import { MenuItemsCarousel } from '@/components/landing/MenuItemsCarousel'

// Helper function to get border color for allergen tags
const getAllergenBorderColor = (tagName: string): string => {
  const colorMap: Record<string, string> = {
    'dairy-free': '#B5C1D9',
    'gluten-free': '#D48963',
    'nut-free': '#408250',
    'pescatarian': '#F698A7',
    'shellfish-free': '#317987',
    'spicy': '#F04F68',
    'vegan': '#5F3196',
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
  const titleCardRef = useRef<HTMLDivElement>(null)
  const [titleWidth, setTitleWidth] = useState<number | null>(null)
  const [titleHeight, setTitleHeight] = useState<number | null>(null)

  // Measure title card dimensions to match search bar
  useEffect(() => {
    const updateTitleDimensions = () => {
      if (!titleCardRef.current) return
      
      requestAnimationFrame(() => {
        if (titleCardRef.current) {
          setTitleWidth(titleCardRef.current.offsetWidth)
          setTitleHeight(titleCardRef.current.offsetHeight)
        }
      })
    }
    
    const timeoutId = setTimeout(updateTitleDimensions, 100)
    window.addEventListener('resize', updateTitleDimensions, { passive: true })
    
    if (document.fonts) {
      document.fonts.ready.then(updateTitleDimensions)
    }
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateTitleDimensions)
    }
  }, [])

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
    } catch (error) {
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

  // Track scroll progress for blur and color transition with smooth animation
  useEffect(() => {
    let rafId: number | null = null

    const handleScroll = () => {
      if (rafId) return // Skip if already scheduled

      rafId = requestAnimationFrame(() => {
        if (!heroSectionRef.current) {
          rafId = null
          return
        }
        
        const heroHeight = heroSectionRef.current.offsetHeight
        const scrollY = window.scrollY
        const viewportHeight = window.innerHeight
        
        // Calculate progress: 0 when at top, 1 when hero section is fully scrolled past
        const progress = scrollY >= heroHeight - viewportHeight * 0.5 
          ? 1 
          : Math.min(1, Math.max(0, scrollY / (heroHeight - viewportHeight * 0.5)))
        
        // Smooth interpolation for less jarring updates
        setScrollProgress(prev => prev + (progress - prev) * 0.15)
        
        rafId = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background matching logo */}
      <div
        className="fixed inset-0"
        style={{
          background: '#000000',
        }}
      />

      {/* Menu Items Carousel - only behind hero section */}
      <div 
        className="fixed inset-0" 
        style={{ 
          // Extend to true edges including safe areas on iOS devices
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          zIndex: 1,
        }}
      >
        <MenuItemsCarousel blurIntensity={scrollProgress >= 1 ? 20 : 1.5 + scrollProgress * 3} />
        {/* Black overlay that increases with scroll */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: `rgba(0, 0, 0, ${scrollProgress * 0.9})`,
            zIndex: 1,
            willChange: 'opacity',
            transition: 'opacity 0.1s ease-out',
          }}
        />
      </div>

      {/* Hero Layer */}
      <div ref={heroSectionRef} className="relative z-10 flex flex-col min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Top right login button */}
        <div className="absolute top-8 right-4 sm:right-8 z-20">
          <Button
            onClick={() => setShowAuthForm(true)}
            variant="outline"
            className="border border-white/20 text-white hover:bg-white/30 bg-white/10 backdrop-blur-md rounded-lg text-sm font-light transition-all duration-300 px-4 py-2 shadow-lg shadow-black/10"
            style={{
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            }}
          >
            Log In
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>

        {/* Main content centered - Title and Search bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full mx-auto px-4 flex flex-col items-center" style={{ maxWidth: 'min(95vw, 800px)' }}>
            {/* Title above search bar, centered */}
            <div ref={titleCardRef} className="mb-6 relative inline-flex items-center" style={{ gap: 'clamp(0.5rem, 1.5vw, 1.5rem)', padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)', minWidth: 'fit-content', width: 'fit-content', maxWidth: '100%' }}>
              {/* Backdrop blur matching search bar */}
              <div
                className="absolute inset-0"
                style={{
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 'clamp(0.75rem, 2vw, 1.25rem)',
                  zIndex: -1,
                }}
              />
              {/* Logo */}
              <Image
                src="/output-onlinepngtools.png"
                alt="The Menu Guide Logo"
                width={90}
                height={90}
                className="flex-shrink-0"
                style={{
                  width: 'clamp(5rem, 9vw, 7rem)',
                  height: 'clamp(5rem, 9vw, 7rem)',
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)',
                  WebkitFilter: 'brightness(0) invert(1)',
                }}
              />
              {/* Glass text with backdrop blur effect */}
              <h1
                className="font-normal leading-none tracking-tight whitespace-nowrap relative flex-shrink-0 text-white"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                  letterSpacing: '-0.02em',
                }}
              >
                The Menu Guide
              </h1>
            </div>

            {/* Search bar with liquid glass styling - matching title width */}
            <div className="relative" style={{ width: titleWidth ? `${titleWidth}px` : 'fit-content' }}>
                <div 
                  className="relative backdrop-blur-md rounded-full shadow-lg border border-white/20 w-full flex items-center"
                  style={{
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                    height: titleHeight ? `${titleHeight / 2}px` : 'auto',
                    minHeight: titleHeight ? `${titleHeight / 2}px` : 'auto',
                  }}
                >
                  <Input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-0 bg-transparent rounded-full focus:ring-0 focus:outline-none text-white placeholder:text-white/70 h-full"
                    style={{
                      paddingLeft: 'clamp(1rem, 3vw, 2rem)',
                      paddingRight: 'clamp(2.5rem, 5vw, 4.5rem)',
                      paddingTop: 0,
                      paddingBottom: 0,
                      fontSize: 'clamp(0.875rem, 2.5vw, 1.25rem)',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  />
                  <ArrowRight 
                    key={arrowAnimationKey}
                    className={`absolute top-1/2 text-white/70 z-10 ${
                      searchResults.length > 0 ? 'arrow-swing-animation' : ''
                    }`}
                    style={{
                      right: 'clamp(1rem, 3vw, 2rem)',
                      width: 'clamp(1rem, 3vw, 1.5rem)',
                      height: 'clamp(1rem, 3vw, 1.5rem)',
                      transform: searchResults.length > 0 ? undefined : 'translateY(-50%)',
                      transformOrigin: 'center center',
                    }}
                  />
                </div>

            {/* Search results dropdown */}
            {searchQuery.trim().length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl shadow-black/20 border border-white/20 max-h-96 overflow-y-auto z-30"
                style={{
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.3) 100%)',
                }}
              >
                {isSearching ? (
                  <div className="p-8 text-center text-white">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-white" />
                    <p>Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((restaurant) => (
                      <button
                        key={restaurant.username}
                        onClick={() => handleRestaurantClick(restaurant.username)}
                        className="w-full px-4 py-3 text-left hover:bg-white/20 transition-colors flex items-center gap-3"
                      >
                        {restaurant.avatar_url ? (
                          <Image
                            src={restaurant.avatar_url}
                            alt={restaurant.display_name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {restaurant.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-white font-medium">{restaurant.display_name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-white">
                    <p>No restaurants found</p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Scroll indicator at bottom */}
        <div className="flex flex-col items-center text-white pb-8">
          <span className="text-sm font-light mb-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">Scroll to learn more</span>
          <ChevronDown className="h-5 w-5 animate-bounce drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" />
        </div>
      </div>

      {/* Information Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 sm:px-8 lg:px-12 py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto w-full">
          {/* Main heading */}
          <div className="text-center mb-6 sm:mb-10 md:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light text-white mb-3 sm:mb-5">
              How Does The Menu Guide Help?
            </h2>
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-light text-white/80 max-w-3xl mx-auto leading-relaxed">
              Here's what your menu could look like — beautiful photos, clear descriptions, and dietary info that helps customers make informed choices.
            </p>
          </div>

          {/* Example menu cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-10 md:mb-14">
            {/* Duck Card */}
            <div className="cursor-pointer hover:scale-105 transform transition-transform duration-300">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
                <Image 
                  src="/duck_homepg.png" 
                  alt="Hudson Duck with White Asparagus"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-white">Hudson Duck with White Asparagus</h3>
                  <div className="text-white font-semibold text-xs whitespace-nowrap ml-2">
                    $32
                  </div>
                </div>
                <p className="text-sm text-white/80 mb-3 line-clamp-2">
                  Hudson vally duck breast, with french white asparagus, wild rice, orange jus
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
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
            <div className="cursor-pointer hover:scale-105 transform transition-transform duration-300">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
                <Image 
                  src="/lobster_homepg.png" 
                  alt="Lobster Thermidor"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-white">Lobster Thermidor</h3>
                  <div className="text-white font-semibold text-xs whitespace-nowrap ml-2">
                    $34
                  </div>
                </div>
                <p className="text-sm text-white/80 mb-3 line-clamp-2">
                  Maine lobster with broiled gruyere cheese and turned potatoes
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
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
            <div className="cursor-pointer hover:scale-105 transform transition-transform duration-300">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
                <Image 
                  src="/scallop_homepg.png" 
                  alt="Scallops with Apple Fennel Salad"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-white">Scallops with Apple Fennel Salad</h3>
                  <div className="text-white font-semibold text-xs whitespace-nowrap ml-2">
                    $29
                  </div>
                </div>
                <p className="text-sm text-white/80 mb-3 line-clamp-2">
                  Seared scallops, vadauvan spice gravy, apple and fennel salad, charred leeks
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
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
            <div className="cursor-pointer hover:scale-105 transform transition-transform duration-300">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
                <Image 
                  src="/stew_homepg.png" 
                  alt="Pot au Feu"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                  sizes="(min-width: 1024px) 20vw, (min-width: 768px) 40vw, 80vw"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-white">Pot au Feu</h3>
                  <div className="text-white font-semibold text-xs whitespace-nowrap ml-2">
                    $28
                  </div>
                </div>
                <p className="text-sm text-white/80 mb-3 line-clamp-2">
                  Beef shank stew with fresh market vegetables
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('nut-free')
                    }}
                  >
                    nut-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
                    style={{
                      borderColor: getAllergenBorderColor('gluten-free')
                    }}
                  >
                    gluten-free
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-white/10 border-white/20 text-white"
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
          <div className="flex items-center justify-center my-8 sm:my-12 md:my-16 lg:my-20">
            <div className="w-24 sm:w-32 md:w-40 h-px bg-white/30"></div>
          </div>

          {/* Feature list */}
          <div className="mb-6 sm:mb-10 md:mb-14">
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-light text-white/80 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 md:mb-10">
              The Menu Guide takes what you already do and makes it smoother, clearer, and more inviting. It's the bridge between your kitchen and your customers' expectations — with none of the hassle of building your own website
            </p>
            <ul className="space-y-4 sm:space-y-5 md:space-y-6 text-base sm:text-lg md:text-xl lg:text-2xl font-light text-white/80 max-w-3xl mx-auto">
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-white">Scan your existing menu to auto-populate items</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-white">Upload your specials in seconds</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-white">Add allergen tags so guests immediately know what's safe</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-white">Share one simple QR code that drops customers right into your visual menu</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-white">Reduce table-side questions and speed up ordering</span>
              </li>
              <li className="flex items-start group">
                <div className="flex-shrink-0 mr-4 mt-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="flex-1 leading-relaxed text-white">Give guests confidence in what they're choosing</span>
              </li>
            </ul>
          </div>

          {/* Call to action */}
          <div className="text-center space-y-3 mt-8 sm:mt-12 md:mt-16 lg:mt-20">
            <Button
              onClick={() => setShowAuthForm(true)}
              variant="outline"
              className="border border-white/20 text-white hover:bg-white/30 bg-white/10 backdrop-blur-md rounded-lg text-sm sm:text-base md:text-lg font-light transition-all duration-300 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 shadow-lg shadow-black/10"
              style={{
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              }}
            >
              Start building your menu!
            </Button>
            
            {/* Contact the Builder */}
            <div>
              <a 
                href="https://www.instagram.com/alexanderbrightman/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm sm:text-base md:text-lg text-white/70 hover:text-white transition-colors inline-flex items-center gap-1 underline decoration-1 underline-offset-2"
              >
                Contact the Builder
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="shadow-xl border border-white/20 max-w-sm w-full max-h-[85vh] overflow-hidden"
            style={{
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              borderRadius: '0.625rem',
            }}
          >
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-medium text-white">Welcome to The Menu Guide</h2>
                  <p className="text-sm text-white/70 mt-1">Sign in to your account or create a new one</p>
                </div>
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors group"
                >
                  <X className="h-4 w-4 text-white/70 group-hover:text-white" />
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
