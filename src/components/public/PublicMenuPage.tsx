'use client'

import { useState, useMemo, useEffect, useTransition, useDeferredValue, memo, useCallback, useRef } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDown, X, Filter } from 'lucide-react'
import { Profile, MenuCategory, MenuItem, Tag as TagType } from '@/lib/supabase'

interface MenuItemWithTags extends MenuItem {
  menu_categories?: { name: string }
  menu_item_tags?: { tags: { id: number; name: string } }[]
}

interface PublicMenuPageProps {
  profile: Profile
  categories: MenuCategory[]
  menuItems: MenuItemWithTags[]
  tags: TagType[]
}

const DEFAULT_MENU_BACKGROUND_COLOR = '#F4F2EE'
const DEFAULT_MENU_FONT = 'Plus Jakarta Sans'
const MAX_TITLE_FONT_SIZE = 64
const MIN_TITLE_FONT_SIZE = 28
const FONT_FAMILY_MAP: Record<string, string> = {
  'Plus Jakarta Sans': '"Plus Jakarta Sans", sans-serif',
  'Fjalla One': '"Fjalla One", sans-serif',
  'Georgia': 'Georgia, serif',
  'Times New Roman': '"Times New Roman", serif',
  'Arial': 'Arial, sans-serif',
  'Courier New': '"Courier New", monospace',
}

const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#1f2937'
  const cleanHex = hexColor.replace('#', '')
  const normalizedHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex

  if (normalizedHex.length !== 6) return '#1f2937'

  const r = parseInt(normalizedHex.substring(0, 2), 16)
  const g = parseInt(normalizedHex.substring(2, 4), 16)
  const b = parseInt(normalizedHex.substring(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

// Helper function to get border color for allergen tags
const getAllergenBorderColor = (tagName: string): string => {
  const colorMap: Record<string, string> = {
    'dairy-free': '#B5C1D9',
    'gluten-free': '#D48963',
    'nut-free': '#F7EAE3',
    'pescatarian': '#F698A7',
    'shellfish-free': '#F6D98E',
    'spicy': '#F04F68',
    'vegan': '#A9CC66',
    'vegetarian': '#3B91A2'
  }
  return colorMap[tagName.toLowerCase()] || ''
}

const hexToRgba = (hexColor: string, alpha: number) => {
  const cleanHex = hexColor.replace('#', '')
  const normalized = cleanHex.length === 3
    ? cleanHex.split('').map((char) => char + char).join('')
    : cleanHex

  if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`

  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const buildTagStyles = (
  tagName: string,
  {
    isDarkBackground,
    isSelected = false,
  }: {
    isDarkBackground: boolean
    isSelected?: boolean
  }
): CSSProperties => {
  const borderColor = getAllergenBorderColor(tagName)

  if (!borderColor) {
    if (isDarkBackground) {
      return {
        borderColor: 'rgba(255,255,255,0.35)',
        color: 'rgba(255,255,255,0.92)',
        backgroundColor: isSelected ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
      }
    }

    return {
      borderColor: 'rgba(17,24,39,0.18)',
      color: '#1f2937',
      backgroundColor: isSelected ? 'rgba(17,24,39,0.08)' : 'transparent',
    }
  }

  return {
    borderColor,
    color: isDarkBackground ? borderColor : '#1f2937',
    backgroundColor: isSelected
      ? hexToRgba(borderColor, isDarkBackground ? 0.32 : 0.16)
      : isDarkBackground
        ? 'rgba(255,255,255,0.05)'
        : 'transparent',
  }
}

// Memoized menu item card component to prevent unnecessary re-renders
const MenuItemCard = memo(({
  item,
  onSelect,
  priceClass,
  descriptionClass,
  isDarkBackground,
  headingFontFamily,
}: {
  item: MenuItemWithTags
  onSelect: (item: MenuItemWithTags) => void
  priceClass: string
  descriptionClass: string
  isDarkBackground: boolean
  headingFontFamily: string
}) => (
  <div 
    className="cursor-pointer hover:scale-105 transform transition-transform duration-300"
    onClick={() => onSelect(item)}
  >
    {item.image_url && (
      <div className="relative aspect-[3/2] overflow-hidden rounded-lg mb-2">
        <Image
          src={item.image_url}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 hover:scale-110"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
    )}
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg" style={{ fontFamily: headingFontFamily }}>{item.title}</h3>
        {item.price && (
          <div className={`font-semibold text-xs whitespace-nowrap ml-2 ${priceClass}`}>
            ${item.price.toFixed(2)}
          </div>
        )}
      </div>
      
      {item.description && (
        <p className={`text-sm mb-3 line-clamp-2 ${descriptionClass}`}>
          {item.description}
        </p>
      )}
      
      {item.menu_item_tags && item.menu_item_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.menu_item_tags.map((itemTag, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="text-xs bg-transparent"
              style={buildTagStyles(itemTag.tags.name, { isDarkBackground })}
            >
              {itemTag.tags.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  </div>
))

MenuItemCard.displayName = 'MenuItemCard'

export function PublicMenuPage({ profile, categories, menuItems, tags }: PublicMenuPageProps) {
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItemWithTags | null>(null)
  const [isPending, startTransition] = useTransition()
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const [titleFontSize, setTitleFontSize] = useState<number>(MAX_TITLE_FONT_SIZE)

  const menuFont = profile.menu_font || DEFAULT_MENU_FONT
  const menuBackgroundColor = profile.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR
  const contrastColor = useMemo(() => getContrastColor(menuBackgroundColor), [menuBackgroundColor])
  const isDarkBackground = contrastColor === '#ffffff'
  const menuFontFamily = useMemo(
    () => FONT_FAMILY_MAP[menuFont] ?? menuFont,
    [menuFont]
  )

  const primaryTextClass = isDarkBackground ? 'text-white' : 'text-gray-900'
  const secondaryTextClass = isDarkBackground ? 'text-gray-100/90' : 'text-gray-600'
  const mutedTextClass = isDarkBackground ? 'text-gray-200/80' : 'text-gray-500'
  const subtleTextClass = isDarkBackground ? 'text-gray-100/70' : 'text-gray-700'
  const filterPanelClass = isDarkBackground ? 'bg-white/10 border border-white/20 backdrop-blur' : 'bg-white border border-gray-200'
  const dividerBorderClass = isDarkBackground ? 'border-white/10' : 'border-gray-200'

  const iconMutedClass = isDarkBackground ? 'text-gray-200/60' : 'text-gray-400'
  const linkAccentClass = isDarkBackground ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'

  const themeStyle = useMemo(() => ({
    backgroundColor: menuBackgroundColor,
    color: contrastColor,
    fontFamily: menuFontFamily,
  }), [menuBackgroundColor, contrastColor, menuFontFamily])

  const baseCategoryButtonClass =
    'flex-shrink-0 py-[3.74px] px-[7.48px] text-[9.9px] transition-colors'

  const fitTitleToContainer = useCallback(() => {
    const element = titleRef.current
    if (!element) return

    const container = element.parentElement
    if (!container) return

    const availableWidth = Math.max(container.clientWidth - 8, 0)
    if (availableWidth === 0) return

    let nextSize = MAX_TITLE_FONT_SIZE
    element.style.fontSize = `${nextSize}px`
    element.style.whiteSpace = 'nowrap'

    while (element.scrollWidth > availableWidth && nextSize > MIN_TITLE_FONT_SIZE) {
      nextSize -= 1
      element.style.fontSize = `${nextSize}px`
    }

    setTitleFontSize((prev) => (prev !== nextSize ? nextSize : prev))
  }, [])

  const getCategoryButtonClass = useCallback((isSelected: boolean) => {
    if (isDarkBackground) {
      if (isSelected) {
        return `${baseCategoryButtonClass} bg-white text-gray-900 border border-transparent hover:bg-white/90`
      }

      return `${baseCategoryButtonClass} text-white border border-white/35 bg-transparent hover:bg-white/10`
    }

    return baseCategoryButtonClass
  }, [isDarkBackground, baseCategoryButtonClass])

  // Pre-compute tag ID sets for each menu item (memoized for performance)
  const itemTagIdSets = useMemo(() => {
    const tagSets = new Map<string, Set<number>>()
    menuItems.forEach(item => {
      const tagIds = new Set(
        item.menu_item_tags?.map(t => t.tags.id) || []
      )
      tagSets.set(item.id, tagIds)
    })
    return tagSets
  }, [menuItems])

  // Use deferred values for smoother transitions
  const deferredSelectedTags = useDeferredValue(selectedTags)
  const deferredSelectedCategory = useDeferredValue(selectedCategory)
  
  // Convert selectedTags array to Set for O(1) lookups
  const selectedTagsSet = useMemo(
    () => new Set(deferredSelectedTags),
    [deferredSelectedTags]
  )

  // Optimized filtering with Set-based lookups
  const filteredItems = useMemo(() => {
    let filtered = menuItems

    // Filter by category first (faster to filter early)
    if (deferredSelectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === deferredSelectedCategory)
    }

    // Filter by tags using Set for O(1) lookups instead of O(n) array includes
    if (selectedTagsSet.size > 0) {
      filtered = filtered.filter(item => {
        const itemTagSet = itemTagIdSets.get(item.id)
        if (!itemTagSet || itemTagSet.size === 0) return false
        // Check if item has ALL selected tags using Set operations
        for (const tagId of selectedTagsSet) {
          if (!itemTagSet.has(tagId)) {
            return false
          }
        }
        return true
      })
    }

    return filtered
  }, [menuItems, deferredSelectedCategory, selectedTagsSet, itemTagIdSets])

  const toggleTag = useCallback((tagId: number) => {
    startTransition(() => {
      setSelectedTags(prev => {
        // Use Set for faster lookup, then convert back to array
        const prevSet = new Set(prev)
        if (prevSet.has(tagId)) {
          prevSet.delete(tagId)
        } else {
          prevSet.add(tagId)
        }
        return Array.from(prevSet)
      })
    })
  }, [])

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setSelectedTags([])
      setSelectedCategory('all')
    })
  }, [])

  const handleCategoryChange = useCallback((categoryId: string) => {
    startTransition(() => {
      setSelectedCategory(categoryId)
    })
  }, [])

  const handleItemSelect = useCallback((item: MenuItemWithTags) => {
    setSelectedItem(item)
  }, [])

  // Memoize selectedTagsSet for tag button checks
  const selectedTagsSetForButtons = useMemo(() => new Set(selectedTags), [selectedTags])

  const hasActiveFilters = selectedTags.length > 0 || selectedCategory !== 'all'

  // Close modal on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null)
      }
    }

    if (selectedItem) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedItem])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const runResize = () => {
      fitTitleToContainer()
    }

    runResize()
    window.addEventListener('resize', runResize)

    const element = titleRef.current
    let resizeObserver: ResizeObserver | null = null
    if (element && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(runResize)
      resizeObserver.observe(element)
      if (element.parentElement) {
        resizeObserver.observe(element.parentElement)
      }
    }

    let cancelled = false
    if ('fonts' in document) {
      ;(document as any).fonts.ready
        .then(() => {
          if (!cancelled) {
            runResize()
          }
        })
        .catch(() => {
          /* ignore font loading errors */
        })
    }

    return () => {
      cancelled = true
      window.removeEventListener('resize', runResize)
      resizeObserver?.disconnect()
    }
  }, [fitTitleToContainer, menuFontFamily, profile.display_name])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const previousBodyBg = document.body.style.backgroundColor
    const previousHtmlBg = document.documentElement.style.backgroundColor

    document.body.style.backgroundColor = menuBackgroundColor
    document.documentElement.style.backgroundColor = menuBackgroundColor

    return () => {
      document.body.style.backgroundColor = previousBodyBg
      document.documentElement.style.backgroundColor = previousHtmlBg
    }
  }, [menuBackgroundColor])

  return (
    <div className="min-h-screen transition-colors" style={themeStyle}>
      {/* Large Header Photo */}
      <header className="relative max-w-screen-2xl mx-auto w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="relative h-[20vh] w-full overflow-hidden rounded-lg bg-gray-100">
            {profile.avatar_url ? (
              <Image 
                src={profile.avatar_url} 
                alt={profile.display_name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="h-32 w-32">
                  <AvatarFallback className="text-6xl">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>
        
        {/* Restaurant Name - Large Title Below Photo */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <h1
            ref={titleRef}
            className={`text-6xl font-bold text-center whitespace-nowrap ${primaryTextClass}`}
            style={{ fontFamily: menuFontFamily, fontSize: `${titleFontSize}px`, lineHeight: 1.1 }}
          >
            {profile.display_name}
          </h1>
          
          {profile.bio && (
            <div className="mt-1 text-center">
              <div className={`text-sm inline-block ${subtleTextClass}`}>
                {profile.bio.length > 100 && !isBioExpanded ? (
                  <>
                    {profile.bio.substring(0, 100)}...
                    <button
                      onClick={() => setIsBioExpanded(true)}
                      className={`ml-1 inline-flex items-center ${linkAccentClass}`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    {profile.bio}
                    {profile.bio.length > 100 && isBioExpanded && (
                      <button
                        onClick={() => setIsBioExpanded(false)}
                        className={`ml-1 inline-flex items-center ${linkAccentClass}`}
                      >
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}
        <div className="mb-6">
          <div className={`space-y-1.5 rounded-lg p-4 ${filterPanelClass}`}>
            {/* Filter Menu Header */}
            <div className="mb-1.5">
              <h3
                className={`text-sm font-medium ${secondaryTextClass}`}
                style={{ fontFamily: menuFontFamily }}
              >
                Filter Menu
              </h3>
            </div>

            {/* Category Filter */}
            <div>
              <div className="overflow-x-auto scrollbar-hide scroll-smooth">
                <div className="flex flex-nowrap gap-1.5 pb-1.5">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryChange('all')}
                    className={getCategoryButtonClass(selectedCategory === 'all')}
                    disabled={isPending}
                  >
                    All Items
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCategoryChange(category.id)}
                      className={getCategoryButtonClass(selectedCategory === category.id)}
                      disabled={isPending}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dietary Tags Filter */}
            <div>
              <div className="overflow-x-auto scrollbar-hide scroll-smooth">
                <div className="flex flex-nowrap gap-1.5 pb-1.5">
                  {tags.map((tag) => {
                    const isSelected = selectedTagsSetForButtons.has(tag.id)
                    return (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        className={`cursor-pointer flex-shrink-0 py-[3.74px] px-[7.48px] text-[10.89px] transition-colors ${
                          isSelected ? 'font-semibold shadow-sm' : 'font-medium'
                        } ${isDarkBackground ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                        onClick={() => toggleTag(tag.id)}
                        disabled={isPending}
                        style={buildTagStyles(tag.name, { isDarkBackground, isSelected })}
                      >
                        {tag.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className={`pt-1.5 border-t ${dividerBorderClass}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className={`py-[3.74px] px-[7.48px] text-[9.9px]`}
                    style={isDarkBackground ? {
                      borderColor: 'rgba(255,255,255,0.35)',
                      color: '#ffffff',
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    } : undefined}
                    disabled={isPending}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2
              className={`text-2xl font-bold ${primaryTextClass}`}
              style={{ fontFamily: menuFontFamily }}
            >
              Menu
            </h2>
            <div className={`text-xs ${mutedTextClass}`}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className={`text-center py-12 border-t ${dividerBorderClass}`}>
              <div className={`mb-4 ${iconMutedClass}`}>
                <Filter className="h-12 w-12 mx-auto" />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${primaryTextClass}`}>No items found</h3>
              <p className={`mb-4 ${mutedTextClass}`}>
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more items.'
                  : 'This menu is empty.'
                }
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className={isDarkBackground ? 'text-white' : ''}
                  style={isDarkBackground ? {
                    borderColor: 'rgba(255,255,255,0.35)',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  } : undefined}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onSelect={handleItemSelect}
                  priceClass={primaryTextClass}
                  descriptionClass={secondaryTextClass}
                  isDarkBackground={isDarkBackground}
                  headingFontFamily={menuFontFamily}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-12 text-center text-sm ${mutedTextClass}`}>
          <Link
            href="/"
            className={`underline transition-colors ${isDarkBackground ? 'text-white hover:text-gray-100' : 'text-black hover:text-gray-800'}`}
          >
            Want to show off your food?
          </Link>
        </div>
      </div>

      {/* Expanded Menu Item Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-lg z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>

            {/* Content */}
            <div className="relative">
              {/* Large Image */}
              {selectedItem.image_url && (
                <div className="aspect-video overflow-hidden">
                  <Image 
                    src={selectedItem.image_url} 
                    alt={selectedItem.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 40vw, 90vw"
                    priority
                  />
                </div>
              )}

              <div className="p-6 md:p-8">
                {/* Title and Price */}
                <div className="flex items-start justify-between mb-4">
                  <h2
                    className="text-3xl font-bold text-gray-900"
                    style={{ fontFamily: menuFontFamily }}
                  >
                    {selectedItem.title}
                  </h2>
                  {selectedItem.price && (
                    <div className="text-base font-semibold text-gray-900">
                      ${selectedItem.price.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Category */}
                {selectedItem.menu_categories && (
                  <Badge variant="secondary" className="mb-4">
                    {selectedItem.menu_categories.name}
                  </Badge>
                )}

                {/* Description */}
                {selectedItem.description && (
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}

                {/* Dietary Tags */}
                {selectedItem.menu_item_tags && selectedItem.menu_item_tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Dietary Information</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.menu_item_tags.map((itemTag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-sm bg-transparent"
                          style={buildTagStyles(itemTag.tags.name, { isDarkBackground: false })}
                        >
                          {itemTag.tags.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
