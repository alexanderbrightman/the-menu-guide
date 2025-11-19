'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'

interface MenuItem {
  image_url: string
  title?: string
}

interface MenuItemsCarouselProps {
  className?: string
  blurIntensity?: number
}

export function MenuItemsCarousel({ className = '', blurIntensity = 1.5 }: MenuItemsCarouselProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [columns, setColumns] = useState(2)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Calculate number of columns based on screen width
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 640) {
        setColumns(2) // Mobile
      } else if (width < 768) {
        setColumns(3) // Small tablet
      } else if (width < 1024) {
        setColumns(4) // Tablet
      } else if (width < 1280) {
        setColumns(5) // Small desktop
      } else {
        setColumns(6) // Large desktop
      }
      setViewportHeight(window.innerHeight)
    }

    updateColumns()
    const handleResize = () => {
      updateColumns()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await fetch('/api/menu-items/public')
        if (response.ok) {
          const data = await response.json()
          setMenuItems(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching menu items:', error)
      }
    }

    fetchMenuItems()
  }, [])

  // Calculate items needed per column (viewport height + buffer for seamless scrolling)
  const itemsPerColumn = useMemo(() => {
    if (!viewportHeight || menuItems.length === 0) return 0
    // Estimate card height: image (aspect 3/2) + text content + tags
    // Image height varies with column width, plus ~80px for text/padding/tags
    // For responsive sizing, estimate based on viewport
    const estimatedCardHeight = 200 // Approximate height per card (matches public page layout)
    // Calculate enough items to fill viewport + large buffer to ensure items scroll completely off
    // before reset. We need at least 2x viewport height worth of items for smooth scrolling
    const viewportItems = Math.ceil(viewportHeight / estimatedCardHeight)
    const itemsNeeded = viewportItems * 2 + 10 // 2x viewport + extra buffer
    // Ensure we have at least enough items, but don't exceed available menu items
    return Math.max(itemsNeeded, Math.max(15, Math.ceil(menuItems.length / columns)))
  }, [viewportHeight, menuItems.length, columns])

  // Inject keyframes styles into document head (must be called before any conditional returns)
  useEffect(() => {
    const styleId = 'menu-carousel-keyframes'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes scroll-vertical-0 {
        0% { transform: translateY(0); }
        100% { transform: translateY(-16.666%); }
      }
      @keyframes scroll-vertical-1 {
        0% { transform: translateY(0); }
        100% { transform: translateY(-16.666%); }
      }
      @keyframes scroll-vertical-2 {
        0% { transform: translateY(0); }
        100% { transform: translateY(-16.666%); }
      }
      @keyframes scroll-vertical-3 {
        0% { transform: translateY(0); }
        100% { transform: translateY(-16.666%); }
      }
      @keyframes scroll-vertical-4 {
        0% { transform: translateY(0); }
        100% { transform: translateY(-16.666%); }
      }
      @keyframes scroll-vertical-5 {
        0% { transform: translateY(0); }
        100% { transform: translateY(-16.666%); }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  // Generate column data with different scroll speeds
  const columnData = useMemo(() => {
    if (menuItems.length === 0 || itemsPerColumn === 0) return []

    const baseDuration = 70 // Base animation duration in seconds (faster scroll speed)
    const speedVariation = 5 // Variation in seconds

    return Array.from({ length: columns }, (_, colIndex) => {
      // Create a unique set of items for this column by cycling through the menu items
      const columnItems: MenuItem[] = []
      for (let i = 0; i < itemsPerColumn; i++) {
        const itemIndex = (colIndex * itemsPerColumn + i) % menuItems.length
        columnItems.push(menuItems[itemIndex])
      }
      // Duplicate items 6 times to create seamless scrolling
      // The animation moves -16.666% (one full set = 1/6) so items scroll completely off screen
      // before resetting, and when it resets, the next identical set continues seamlessly
      // Using 6 duplicates ensures enough content for smooth scrolling
      const duplicatedItems = [
        ...columnItems,
        ...columnItems,
        ...columnItems,
        ...columnItems,
        ...columnItems,
        ...columnItems
      ]

      // Each column has a slightly different speed
      const duration = baseDuration + (colIndex % speedVariation) * 2

      return {
        items: duplicatedItems,
        duration,
        columnIndex: colIndex,
      }
    })
  }, [menuItems, columns, itemsPerColumn])

  if (menuItems.length === 0) {
    return null
  }

  return (
    <div
      className={`absolute overflow-hidden ${className}`}
      style={{
        zIndex: 0,
        // Fill the entire parent container which extends to safe areas
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        filter: `blur(${blurIntensity}px)`,
        WebkitFilter: `blur(${blurIntensity}px)`,
        willChange: 'filter',
        transform: 'translateZ(0)', // Force GPU acceleration
        backfaceVisibility: 'hidden', // Improve performance
      }}
    >
      <div 
        className="flex w-full h-full"
      >
        {columnData.map(({ items, duration, columnIndex }) => (
          <div
            key={columnIndex}
            className="flex-1 flex flex-col"
            style={{
              animation: `scroll-vertical-${columnIndex % 6} ${duration}s linear infinite`,
              willChange: 'transform',
            }}
          >
            {items.map((item, itemIndex) => (
              <div
                key={`${columnIndex}-${itemIndex}`}
                className="w-full flex-shrink-0"
                style={{
                  padding: 'clamp(0.75rem, 2vw, 1.5rem)',
                }}
              >
                {item.image_url && (
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg">
                    <Image
                      src={item.image_url}
                      alt={item.title || 'Menu item'}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 20vw, (min-width: 640px) 25vw, 50vw"
                      quality={60}
                      loading="lazy"
                      unoptimized={false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

