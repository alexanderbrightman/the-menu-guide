'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

interface Tag {
  id: number
  name: string
}

interface MenuItemTag {
  tags: Tag
}

interface MenuItem {
  image_url: string
  title?: string
  description?: string
  price?: number
  menu_item_tags?: MenuItemTag[]
}

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

  // Calculate items needed per column (viewport height + 2 extra for seamless scrolling)
  const itemsPerColumn = useMemo(() => {
    if (!viewportHeight || menuItems.length === 0) return 0
    // Estimate card height: image (aspect 3/2) + text content + tags
    // Image height varies with column width, plus ~80px for text/padding/tags
    // For responsive sizing, estimate based on viewport
    const estimatedCardHeight = 200 // Approximate height per card (matches public page layout)
    const itemsNeeded = Math.ceil(viewportHeight / estimatedCardHeight) + 2
    return Math.min(itemsNeeded, Math.max(5, Math.ceil(menuItems.length / columns)))
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

    const baseDuration = 30 // Base animation duration in seconds
    const speedVariation = 5 // Variation in seconds

    return Array.from({ length: columns }, (_, colIndex) => {
      // Create a unique set of items for this column by cycling through the menu items
      const columnItems: MenuItem[] = []
      for (let i = 0; i < itemsPerColumn; i++) {
        const itemIndex = (colIndex * itemsPerColumn + i) % menuItems.length
        columnItems.push(menuItems[itemIndex])
      }
      // Duplicate items many times to ensure seamless scrolling
      // Duplicate 6 times to create a very long column that prevents any visible jumps
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
      className={`fixed overflow-hidden ${className}`}
      style={{
        zIndex: 0,
        // Extend to true edges including safe areas on iOS devices
        top: 'calc(-1 * env(safe-area-inset-top, 0px))',
        left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        right: 'calc(-1 * env(safe-area-inset-right, 0px))',
        bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
        filter: `blur(${blurIntensity}px)`,
        WebkitFilter: `blur(${blurIntensity}px)`,
        willChange: 'filter',
        transition: 'filter 0.1s ease-out',
      }}
    >
      <div className="flex h-full w-full">
        {columnData.map(({ items, duration, columnIndex }) => (
          <div
            key={columnIndex}
            className="flex-1 flex flex-col"
            style={{
              animation: `scroll-vertical-${columnIndex % 6} ${duration}s linear infinite`,
            }}
          >
            {items.map((item, itemIndex) => (
              <div
                key={`${columnIndex}-${itemIndex}`}
                className="w-full flex-shrink-0 px-1.5 py-1.5"
              >
                {item.image_url && (
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
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
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    {item.title && (
                      <h3 className="font-semibold text-base text-gray-900">
                        {item.title}
                      </h3>
                    )}
                    {item.price && (
                      <div className="text-gray-900 font-semibold text-xs whitespace-nowrap ml-2">
                        ${item.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {item.menu_item_tags && item.menu_item_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.menu_item_tags.map((itemTag, tagIndex) => {
                        const borderColor = getAllergenBorderColor(itemTag.tags.name)
                        return (
                          <Badge
                            key={tagIndex}
                            variant="outline"
                            className="text-xs bg-transparent"
                            style={{
                              borderColor: borderColor || 'rgba(17,24,39,0.18)',
                              color: borderColor || '#1f2937',
                            }}
                          >
                            {itemTag.tags.name}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

