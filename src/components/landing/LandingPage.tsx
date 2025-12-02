'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthForm } from '@/components/auth/AuthForm'
import { PasswordResetModal } from '@/components/auth/PasswordResetModal'
import { X, ArrowRight, Loader2, Search } from 'lucide-react'

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
      {/* Top Section - Hero 1 */}
      <section 
        ref={heroSectionRef}
        className="relative w-full hero-background-section"
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          minHeight: '600px',
          backgroundImage: 'url(/hero1.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
        }}
      >

        {/* Login button - top right corner */}
        <div 
          className="absolute top-0 right-0 z-20 px-4 sm:px-6 lg:px-8"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px) + clamp(1.5rem, 4vw, 2rem), clamp(1.5rem, 4vw, 2rem))',
          }}
        >
          <Button
            onClick={() => setShowAuthForm(true)}
            variant="outline"
            className="rounded-xl text-xs font-medium transition-all duration-500 ease-out backdrop-blur-xl text-gray-900"
            style={{
              height: 'clamp(2rem, 5vw, 2.25rem)',
              paddingLeft: 'clamp(0.75rem, 2.5vw, 1rem)',
              paddingRight: 'clamp(0.75rem, 2.5vw, 1rem)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.85) 100%)',
              border: '1px solid #000000',
              boxShadow: `
                0 16px 48px -10px rgba(0, 0, 0, 0.2),
                0 6px 20px -6px rgba(0, 0, 0, 0.12),
                0 3px 10px -4px rgba(0, 0, 0, 0.08),
                0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                0 1px 2px rgba(0, 0, 0, 0.05) inset
              `,
            }}
            onMouseEnter={(e) => {
              const button = e.currentTarget;
              button.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)';
              button.style.boxShadow = `
                0 20px 60px -8px rgba(0, 0, 0, 0.25),
                0 8px 24px -6px rgba(0, 0, 0, 0.18),
                0 4px 12px -4px rgba(0, 0, 0, 0.12),
                0 0 0 1px rgba(255, 255, 255, 0.6) inset,
                0 1px 2px rgba(0, 0, 0, 0.05) inset
              `;
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget;
              button.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.85) 100%)';
              button.style.boxShadow = `
                0 16px 48px -10px rgba(0, 0, 0, 0.2),
                0 6px 20px -6px rgba(0, 0, 0, 0.12),
                0 3px 10px -4px rgba(0, 0, 0, 0.08),
                0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                0 1px 2px rgba(0, 0, 0, 0.05) inset
              `;
            }}
          >
            Log In
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>

        {/* Title - centered above search bar */}
        <div 
          className="absolute left-1/2 z-20 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8"
          style={{
            top: '22.5%',
            transform: 'translateX(-50%)',
          }}
        >
          <h1
            ref={titleCardRef}
            className="font-normal leading-none tracking-tight text-center"
            style={{
              fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)',
              letterSpacing: '-0.02em',
              color: '#000000',
              fontWeight: 700,
            }}
          >
            The Menu Guide
          </h1>
        </div>

        {/* Search bar container - positioned higher from top */}
        <div className="absolute left-1/2 w-full flex flex-col items-center z-20" style={{ 
          top: '34%',
          width: 'min(calc(100% - clamp(1rem, 4vw, 2rem)), 650px)',
          paddingLeft: 'clamp(0.5rem, 2vw, 1rem)',
          paddingRight: 'clamp(0.5rem, 2vw, 1rem)',
          transform: 'translateX(-50%)',
        }}>

          {/* Search bar - glassmorphism design */}
          <div className="relative w-full">
                {/* Rainbow border wrapper - appears on focus, positioned behind */}
                <div 
                  id="rainbow-border-wrapper"
                  className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 182, 193, 0.8) 0%, rgba(255, 218, 185, 0.8) 14%, rgba(255, 255, 182, 0.8) 28%, rgba(182, 255, 182, 0.8) 42%, rgba(185, 218, 255, 0.8) 57%, rgba(218, 185, 255, 0.8) 71%, rgba(255, 182, 218, 0.8) 85%, rgba(255, 182, 193, 0.8) 100%)',
                    padding: '2px',
                    borderRadius: '1rem',
                    zIndex: 0,
                    margin: '-2px',
                  }}
                >
                  <div className="w-full h-full rounded-2xl bg-transparent"></div>
                </div>
                
                {/* Search bar container - always visible */}
                <div 
                  id="search-bar-container"
                  className="relative rounded-2xl w-full flex items-center transition-all duration-500 ease-out backdrop-blur-xl"
                  style={{
                    height: 'clamp(2.5rem, 6vw, 2.75rem)',
                    paddingLeft: 'clamp(1rem, 3vw, 1.25rem)',
                    paddingRight: 'clamp(1rem, 3vw, 1.25rem)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.85) 100%)',
                    boxShadow: `
                      0 20px 60px -12px rgba(0, 0, 0, 0.25),
                      0 8px 24px -6px rgba(0, 0, 0, 0.15),
                      0 4px 12px -4px rgba(0, 0, 0, 0.1),
                      0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                      0 1px 2px rgba(0, 0, 0, 0.05) inset
                    `,
                    border: '1px solid #000000',
                    zIndex: 1,
                  }}
                    onMouseEnter={(e) => {
                      const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                      const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                      if (container) {
                        // Only change if not focused (rainbow border not active)
                        if (!rainbowBorder || rainbowBorder.style.opacity !== '1') {
                          container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0.9) 100%)';
                          container.style.boxShadow = `
                            0 24px 72px -8px rgba(0, 0, 0, 0.3),
                            0 12px 32px -8px rgba(0, 0, 0, 0.2),
                            0 6px 16px -4px rgba(0, 0, 0, 0.15),
                            0 0 0 1px rgba(255, 255, 255, 0.6) inset,
                            0 1px 2px rgba(0, 0, 0, 0.05) inset
                          `;
                          container.style.border = '1px solid #000000';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                      const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                      if (container && rainbowBorder && rainbowBorder.style.opacity !== '1') {
                        container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.85) 100%)';
                        container.style.boxShadow = `
                          0 20px 60px -12px rgba(0, 0, 0, 0.25),
                          0 8px 24px -6px rgba(0, 0, 0, 0.15),
                          0 4px 12px -4px rgba(0, 0, 0, 0.1),
                          0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                          0 1px 2px rgba(0, 0, 0, 0.05) inset
                        `;
                        container.style.border = '1px solid #000000';
                      }
                    }}
                  >
                  <Search 
                    className="absolute text-gray-700 z-10 transition-all duration-300"
                    style={{
                      left: 'clamp(0.75rem, 2.5vw, 1rem)',
                      width: 'clamp(1rem, 2.5vw, 1.25rem)',
                      height: 'clamp(1rem, 2.5vw, 1.25rem)',
                    }}
                  />
                  <Input
                    type="text"
                    name="search"
                    autoComplete="off"
                    placeholder="Explore menus..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full !border-0 bg-transparent rounded-2xl !focus-visible:ring-0 !focus-visible:border-0 focus:ring-0 focus:outline-none focus-visible:outline-none text-gray-900 placeholder:text-gray-600 h-full font-medium"
                    style={{
                      paddingLeft: 'clamp(2rem, 5vw, 2.5rem)',
                      paddingRight: 'clamp(2rem, 5vw, 2.5rem)',
                      paddingTop: '0',
                      paddingBottom: '0',
                      fontSize: 'clamp(1rem, 2vw, 1rem)',
                      height: '100%',
                      border: 'none !important',
                      outline: 'none !important',
                      boxShadow: 'none !important',
                    }}
                    onFocus={(e) => {
                      const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                      const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                      if (container && rainbowBorder) {
                        container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(255, 255, 255, 0.95) 100%)';
                        container.style.boxShadow = `
                          0 24px 72px -8px rgba(0, 0, 0, 0.35),
                          0 12px 32px -8px rgba(0, 0, 0, 0.25),
                          0 6px 16px -4px rgba(0, 0, 0, 0.2),
                          0 0 0 1px rgba(255, 255, 255, 0.7) inset,
                          0 1px 2px rgba(0, 0, 0, 0.05) inset
                        `;
                        container.style.border = 'none';
                        rainbowBorder.style.opacity = '1';
                      }
                    }}
                    onBlur={(e) => {
                      const container = e.currentTarget.closest('#search-bar-container') as HTMLElement;
                      const rainbowBorder = document.getElementById('rainbow-border-wrapper');
                      if (container && rainbowBorder) {
                        container.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.85) 100%)';
                        container.style.boxShadow = `
                          0 20px 60px -12px rgba(0, 0, 0, 0.25),
                          0 8px 24px -6px rgba(0, 0, 0, 0.15),
                          0 4px 12px -4px rgba(0, 0, 0, 0.1),
                          0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                          0 1px 2px rgba(0, 0, 0, 0.05) inset
                        `;
                        container.style.border = '1px solid #000000';
                        rainbowBorder.style.opacity = '0';
                      }
                    }}
                  />
                  <ArrowRight 
                    key={arrowAnimationKey}
                    className={`absolute top-1/2 text-gray-700 z-10 transition-all duration-300 ${
                      searchResults.length > 0 ? 'arrow-swing-animation text-gray-900' : ''
                    }`}
                    style={{
                      right: 'clamp(0.75rem, 2.5vw, 1rem)',
                      width: 'clamp(1rem, 2.5vw, 1.25rem)',
                      height: 'clamp(1rem, 2.5vw, 1.25rem)',
                      transform: searchResults.length > 0 ? undefined : 'translateY(-50%)',
                      transformOrigin: 'center center',
                    }}
                  />
                </div>

            {/* Search results dropdown - glassmorphism design with depth */}
            {searchQuery.trim().length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-3 rounded-2xl bg-white/90 backdrop-blur-xl max-h-96 overflow-y-auto z-30"
                style={{
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: `
                    0 24px 72px -8px rgba(0, 0, 0, 0.3),
                    0 12px 32px -8px rgba(0, 0, 0, 0.2),
                    0 6px 16px -4px rgba(0, 0, 0, 0.15),
                    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                    0 1px 2px rgba(0, 0, 0, 0.05) inset
                  `,
                }}
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
      </section>

      {/* Bottom Section - Hero 2 */}
      <section 
        className="relative w-full hero-background-section"
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          minHeight: '600px',
          backgroundImage: 'url(/hero2.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
        }}
      >

        {/* Contact the Builder */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 sm:pb-12 z-20">
          <a 
            href="https://www.instagram.com/alexanderbrightman/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-white hover:text-white/80 transition-colors inline-flex items-center gap-1 underline decoration-1 underline-offset-2"
            style={{
              textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            Contact the Builder
          </a>
        </div>
      </section>

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
