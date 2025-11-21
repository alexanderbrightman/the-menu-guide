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

interface MenuItem {
  id: string
  image_url: string
  title?: string
  description?: string
  menu_item_tags?: { tags: { id: number; name: string } }[]
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [currentMenuItemIndex, setCurrentMenuItemIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

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

  // Fetch menu items for the rotating card
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('/api/menu-items/public')
        if (response.ok) {
          const data = await response.json()
          const items = data.items || []
          // Shuffle items for randomness
          const shuffled = [...items].sort(() => Math.random() - 0.5)
          setMenuItems(shuffled)
        }
      } catch (error) {
        console.error('Error fetching menu items:', error)
      }
    }

    fetchMenuItems()
  }, [])

  // Rotate menu items every 10 seconds with smooth animation
  useEffect(() => {
    if (menuItems.length === 0) return

    const interval = setInterval(() => {
      setIsAnimating(true)
      
      // Wait for fade out animation to complete, then change item
      setTimeout(() => {
        setCurrentMenuItemIndex((prev) => (prev + 1) % menuItems.length)
        // Small delay before fade in to ensure smooth transition
        setTimeout(() => {
          setIsAnimating(false)
        }, 20)
      }, 500) // Match transition duration
    }, 10000)

    return () => clearInterval(interval)
  }, [menuItems.length])

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
        {/* Top right login button */}
        <div className="absolute top-6 sm:top-8 right-4 sm:right-8 z-20">
          <Button
            onClick={() => setShowAuthForm(true)}
            variant="outline"
            className="border border-gray-300 text-gray-900 hover:bg-gray-100 bg-white rounded-lg text-sm font-medium transition-all duration-200 px-4 py-2"
          >
            Log In
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>

        {/* Main content centered - Title and Search bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full mx-auto px-4 flex flex-col items-center" style={{ maxWidth: 'min(95vw, 900px)' }}>
            {/* Title with rotating menu item card */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 mb-8 sm:mb-10 flex-wrap">
              {/* Rotating Menu Item Card - Scales proportionally with title */}
              <div 
                className="relative flex-shrink-0"
                style={{
                  width: 'clamp(5rem, 8.8vw, 12rem)',
                  minWidth: 'clamp(5rem, 8.8vw, 12rem)',
                }}
              >
                {menuItems.length > 0 && menuItems[currentMenuItemIndex] ? (
                  <div
                    style={{
                      opacity: isAnimating ? 0 : 1,
                      transform: isAnimating ? 'translateY(8px)' : 'translateY(0px)',
                      transition: 'opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      willChange: 'opacity, transform',
                    }}
                  >
                    {/* Image */}
                    {menuItems[currentMenuItemIndex].image_url && (
                      <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
                        <Image
                          src={menuItems[currentMenuItemIndex].image_url}
                          alt={menuItems[currentMenuItemIndex].title || 'Menu item'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 160px, 256px"
                          quality={85}
                        />
                      </div>
                    )}
                    
                    {/* Content */}
                    <div>
                      {/* Title */}
                      {menuItems[currentMenuItemIndex].title && (
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 
                            className="font-semibold text-gray-900"
                            style={{
                              fontSize: 'clamp(0.75rem, 1.1vw, 1rem)',
                            }}
                          >
                            {menuItems[currentMenuItemIndex].title}
                          </h3>
                        </div>
                      )}
                      
                      {/* Description */}
                      {menuItems[currentMenuItemIndex].description && (
                        <p 
                          className="mb-2 line-clamp-2 text-gray-700"
                          style={{
                            fontSize: 'clamp(0.625rem, 0.9vw, 0.875rem)',
                          }}
                        >
                          {menuItems[currentMenuItemIndex].description}
                        </p>
                      )}
                      
                      {/* Tags */}
                      {menuItems[currentMenuItemIndex].menu_item_tags && 
                       menuItems[currentMenuItemIndex].menu_item_tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {menuItems[currentMenuItemIndex].menu_item_tags.map((itemTag, index) => {
                            const tagName = itemTag.tags.name
                            const borderColor = getAllergenBorderColor(tagName)
                            return (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="bg-transparent"
                                style={{
                                  fontSize: 'clamp(0.25rem, 0.45vw, 0.375rem)',
                                  padding: 'clamp(0.125rem, 0.2vw, 0.25rem) clamp(0.25rem, 0.4vw, 0.375rem)',
                                  lineHeight: '1',
                                  borderWidth: '0.5px',
                                  borderColor: borderColor || 'rgba(0, 0, 0, 0.2)',
                                  color: borderColor || '#1f2937',
                                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                                }}
                              >
                                {tagName}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2 bg-gray-100 flex items-center justify-center">
                    <Image
                      src="/output-onlinepngtools.png"
                      alt="The Menu Guide Logo"
                      width={60}
                      height={60}
                      className="opacity-50"
                      style={{
                        width: '40%',
                        height: '40%',
                        objectFit: 'contain',
                        filter: 'brightness(0)',
                        WebkitFilter: 'brightness(0)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Title */}
              <h1
                ref={titleCardRef}
                className="font-normal leading-tight tracking-tight text-left text-gray-900"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(2rem, 8.8vw, 6.05rem)',
                  letterSpacing: '-0.03em',
                  lineHeight: '1.1',
                }}
              >
                <span className="block">The</span>
                <span className="block">Menu</span>
                <span className="block">Guide</span>
              </h1>
            </div>

            {/* Search bar - cleaner design */}
            <div className="relative w-full" style={{ maxWidth: '500px' }}>
                <div 
                  className="relative bg-white border border-gray-300 rounded-full shadow-sm w-full flex items-center transition-all duration-200 hover:border-gray-400 h-9"
                >
                  <Input
                    type="text"
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-0 bg-transparent rounded-full focus:ring-0 focus:outline-none text-gray-900 placeholder:text-gray-500 h-full"
                    style={{
                      paddingLeft: 'clamp(1rem, 3vw, 1.5rem)',
                      paddingRight: 'clamp(2.5rem, 5vw, 3.5rem)',
                      paddingTop: '0',
                      paddingBottom: '0',
                      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                      height: '100%',
                    }}
                  />
                  <ArrowRight 
                    key={arrowAnimationKey}
                    className={`absolute top-1/2 text-gray-600 z-10 transition-transform ${
                      searchResults.length > 0 ? 'arrow-swing-animation' : ''
                    }`}
                    style={{
                      right: 'clamp(1rem, 3vw, 1.5rem)',
                      width: 'clamp(1rem, 2.5vw, 1.25rem)',
                      height: 'clamp(1rem, 2.5vw, 1.25rem)',
                      transform: searchResults.length > 0 ? undefined : 'translateY(-50%)',
                      transformOrigin: 'center center',
                    }}
                  />
                </div>

            {/* Search results dropdown - cleaner design */}
            {searchQuery.trim().length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-3 rounded-lg shadow-lg border border-gray-200 bg-white max-h-96 overflow-y-auto z-30"
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
                        className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors flex items-center gap-3"
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
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-900 font-medium text-sm">
                              {restaurant.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-gray-900 font-medium">{restaurant.display_name}</span>
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
              className="border border-gray-300 text-gray-900 hover:bg-gray-100 bg-white rounded-lg text-sm sm:text-base md:text-lg font-medium transition-all duration-200 px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 md:py-4"
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
            className="shadow-xl border border-gray-200 bg-white max-w-sm w-full max-h-[85vh] overflow-hidden rounded-xl"
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
