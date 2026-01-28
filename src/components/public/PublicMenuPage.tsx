'use client'

import { useState, useMemo, useEffect, useTransition, useDeferredValue, memo, useCallback } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { X, Filter, Instagram, Globe } from 'lucide-react'
import { Profile, MenuCategory, MenuItem, Tag as TagType } from '@/lib/supabase'
import { formatPrice } from '@/lib/currency'
import { getAllergenBorderColor, ALLERGEN_TAGS } from '@/lib/utils'
import { CategoryDivider } from './CategoryDivider'

interface MenuItemWithTags extends MenuItem {
  menu_categories?: { name: string }
  menu_item_tags?: { tags: { id: number; name: string } }[]
}

interface PublicMenuPageProps {
  profile: Profile
  categories: MenuCategory[]
  menuItems: MenuItemWithTags[]
  tags: TagType[]
  favoritedIds?: string[]
}

const DEFAULT_MENU_BACKGROUND_COLOR = '#F4F2EE'
const DEFAULT_MENU_FONT = 'Plus Jakarta Sans'
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
        borderColor: '#ffffff',
        color: 'rgba(255,255,255,0.92)',
        backgroundColor: isSelected ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
      }
    }

    return {
      borderColor: '#000000',
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
  showPrices,

  getBorderColor,
  currency,
}: {
  item: MenuItemWithTags
  onSelect: (item: MenuItemWithTags) => void
  priceClass: string
  descriptionClass: string
  isDarkBackground: boolean
  headingFontFamily: string
  showPrices: boolean
  getBorderColor: () => string
  currency?: string
}) => (
  <div
    className={`group relative flex flex-col cursor-pointer border ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${isDarkBackground ? 'bg-white/5' : 'bg-white'
      }`}
    onClick={() => onSelect(item)}
  >
    <div className={`relative aspect-[3/2] overflow-hidden border-b ${getBorderColor()}`}>
      <Image
        src={item.image_url || '/placeholder.jpg'}
        alt={item.title}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
      />
    </div>
    <div className="flex-1 flex flex-col p-2 sm:p-3">
      <div className="mb-2">
        <h3
          className={`font-semibold text-xs sm:text-sm md:text-base ${priceClass}`}
          style={{ fontFamily: headingFontFamily }}
        >
          {item.title}
        </h3>
        {showPrices && item.price && (
          <div className={`font-semibold text-xs mt-1 ${priceClass} notranslate`}>
            {formatPrice(item.price, currency)}
          </div>
        )}
      </div>
      {item.description && (
        <p className={`text-xs line-clamp-2 whitespace-pre-wrap ${descriptionClass}`}>
          {item.description}
        </p>
      )}
      {/* Allergen tags removed from cards - only show in modal */}
    </div>
  </div>
))

MenuItemCard.displayName = 'MenuItemCard'

export function PublicMenuPage({ profile, categories, menuItems, tags, favoritedIds = [] }: PublicMenuPageProps) {
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MenuItemWithTags | null>(null)
  const [isPending, startTransition] = useTransition()




  // Create a Set for efficient lookup
  const favoritedIdsSet = useMemo(() => new Set(favoritedIds), [favoritedIds])

  // Get favorited items
  const favoritedItems = useMemo(() => {
    return menuItems.filter((item) => favoritedIdsSet.has(item.id))
  }, [menuItems, favoritedIdsSet])

  const menuFont = profile.menu_font || DEFAULT_MENU_FONT
  const menuBackgroundColor = profile.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR
  const showPrices = profile.show_prices !== false // default to true if undefined
  const contrastColor = useMemo(() => getContrastColor(menuBackgroundColor), [menuBackgroundColor])
  const isDarkBackground = contrastColor === '#ffffff'
  const menuFontFamily = useMemo(
    () => FONT_FAMILY_MAP[menuFont] ?? menuFont,
    [menuFont]
  )

  const primaryTextClass = isDarkBackground ? 'text-white' : 'text-slate-900'
  const secondaryTextClass = isDarkBackground ? 'text-gray-100/90' : 'text-slate-600'
  const mutedTextClass = isDarkBackground ? 'text-gray-200/80' : 'text-slate-500'
  const dividerBorderClass = isDarkBackground ? 'border-white' : 'border-black'

  const iconMutedClass = isDarkBackground ? 'text-gray-200/60' : 'text-gray-400'

  // Helper to get border color based on background (matching private page)
  const getBorderColor = () => {
    return isDarkBackground ? 'border-white' : 'border-black'
  }

  const themeStyle = useMemo(() => ({
    backgroundColor: menuBackgroundColor,
    color: contrastColor,
    fontFamily: menuFontFamily,
  }), [menuBackgroundColor, contrastColor, menuFontFamily])

  const baseCategoryButtonClass =
    'flex-shrink-0 py-[3.74px] px-[7.48px] text-[9.9px] transition-colors'

  const getCategoryButtonClass = useCallback(
    (isSelected: boolean) => {
      const emphasis = isSelected ? 'font-semibold shadow-sm' : 'font-medium'
      const hoverState = isDarkBackground ? 'hover:bg-white/12 text-white' : 'hover:bg-gray-100 text-gray-900'
      return `${baseCategoryButtonClass} cursor-pointer border rounded-lg ${emphasis} ${hoverState}`
    },
    [isDarkBackground, baseCategoryButtonClass]
  )

  const getCategoryButtonStyle = useCallback(
    (isSelected: boolean) => {
      const borderColor = isDarkBackground ? '#ffffff' : '#000000'
      const fillColor = isSelected
        ? isDarkBackground
          ? 'rgba(255,255,255,0.18)'
          : 'rgba(17,24,39,0.08)'
        : 'transparent'
      return {
        borderColor,
        backgroundColor: fillColor,
        color: isDarkBackground ? '#ffffff' : '#1f2937',
      }
    },
    [isDarkBackground]
  )

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

  // Create a lookup map for category sort orders (for efficient sorting)
  const categorySortOrderMap = useMemo(() => {
    const map = new Map<string, number>()
    categories.forEach((cat, index) => {
      // Use the category's sort_order if available, otherwise fall back to index
      map.set(cat.id, cat.sort_order ?? index)
    })
    return map
  }, [categories])

  // Optimized filtering with Set-based lookups
  const filteredItems = useMemo(() => {
    let filtered = menuItems

    // Filter by category first (faster to filter early)
    if (deferredSelectedCategory === 'favorites') {
      // Show only favorited items
      filtered = filtered.filter(item => favoritedIdsSet.has(item.id))
    } else if (deferredSelectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === deferredSelectedCategory)
    }
    // When viewing "all", show all items (including favorites in their categories)

    // Filter by tags
    if (selectedTagsSet.size > 0) {
      // Split selected tags into allergens (exclude) and lifestyle (include)
      const selectedAllergens = new Set<number>()
      const selectedLifestyle = new Set<number>()

      tags.forEach(tag => {
        if (selectedTagsSet.has(tag.id)) {
          // Case-insensitive check against known allergens
          if (ALLERGEN_TAGS.some(a => a.toLowerCase() === tag.name.toLowerCase())) {
            selectedAllergens.add(tag.id)
          } else {
            selectedLifestyle.add(tag.id)
          }
        }
      })

      filtered = filtered.filter(item => {
        const itemTagSet = itemTagIdSets.get(item.id) || new Set()

        // 1. Exclusion: If item has ANY of the selected allergens, hide it
        for (const tagId of selectedAllergens) {
          if (itemTagSet.has(tagId)) {
            return false
          }
        }

        // 2. Inclusion: Item must have ALL selected lifestyle tags
        for (const tagId of selectedLifestyle) {
          if (!itemTagSet.has(tagId)) {
            return false
          }
        }

        return true
      })
    }

    // Sort items by category order first, then by item sort_order within each category
    // This ensures "All Items" reflects the same order as set by restaurant owners
    filtered = [...filtered].sort((a, b) => {
      // Get category sort orders (items without a category go to the end)
      const catOrderA = a.category_id ? (categorySortOrderMap.get(a.category_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      const catOrderB = b.category_id ? (categorySortOrderMap.get(b.category_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER

      // First sort by category order
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB
      }

      // If same category, sort by item's sort_order
      const itemOrderA = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const itemOrderB = b.sort_order ?? Number.MAX_SAFE_INTEGER
      return itemOrderA - itemOrderB
    })

    return filtered
  }, [menuItems, deferredSelectedCategory, selectedTagsSet, itemTagIdSets, favoritedIdsSet, categorySortOrderMap])

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

  const handleTagClickFromModal = useCallback((tagId: number) => {
    // Close the modal
    setSelectedItem(null)
    // Set the selected tag filter
    startTransition(() => {
      setSelectedTags([tagId])
      setSelectedCategory('all') // Reset category to show all items with this tag
    })
    // Scroll to top of menu section after a brief delay to allow modal to close
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }, [])

  // Memoize selectedTagsSet for tag button checks
  const selectedTagsSetForButtons = useMemo(() => new Set(selectedTags), [selectedTags])

  const hasActiveFilters = selectedTags.length > 0 || selectedCategory !== 'all'

  // Close modal on Esc key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null)
      }
    }

    if (selectedItem) {
      // Lock body scroll when modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = originalStyle
        document.documentElement.style.overflow = originalStyle
      }
    }
  }, [selectedItem])

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
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" className="hidden"></div>

      <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-1">
        {/* TMG Header */}
        <div className="flex items-center justify-center gap-4 mb-6 w-full overflow-hidden">
          {/* Left Side: Scroll -> Line */}
          <div className="flex-1 flex items-center">
            <svg
              width="14"
              height="12"
              viewBox="0 0 14 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-none"
            >
              <path
                d="M12 6 C 6 6 2 9 4 11 C 6 13 10 9 8 5 C 6 1 1 3 1 6"
                stroke={isDarkBackground ? '#ffffff' : '#000000'}
                strokeWidth="1"
                fill="none"
              />
              <line x1="12" y1="6" x2="14" y2="6" stroke={isDarkBackground ? '#ffffff' : '#000000'} strokeWidth="1" />
            </svg>
            <div className={`flex-1 h-[1px] ${isDarkBackground ? 'bg-white' : 'bg-black'} -ml-[1px]`}></div>
          </div>

          <Link
            href="/"
            className={`text-lg font-medium hover:opacity-80 transition-opacity whitespace-nowrap px-2 ${primaryTextClass}`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            The Menu Guide
          </Link>

          {/* Right Side: Line -> Scroll (Rotated 180 of the Left Side) */}
          <div className="flex-1 flex items-center transform rotate-180">
            <svg
              width="14"
              height="12"
              viewBox="0 0 14 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-none"
            >
              <path
                d="M12 6 C 6 6 2 9 4 11 C 6 13 10 9 8 5 C 6 1 1 3 1 6"
                stroke={isDarkBackground ? '#ffffff' : '#000000'}
                strokeWidth="1"
                fill="none"
              />
              <line x1="12" y1="6" x2="14" y2="6" stroke={isDarkBackground ? '#ffffff' : '#000000'} strokeWidth="1" />
            </svg>
            <div className={`flex-1 h-[1px] ${isDarkBackground ? 'bg-white' : 'bg-black'} -ml-[1px]`}></div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex flex-row items-center sm:items-start gap-3 sm:gap-6 mb-6">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <div
              className={`relative h-28 w-28 sm:h-40 sm:w-40 overflow-hidden rounded-full`}
              style={{
                backgroundColor: menuBackgroundColor
              }}
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 112px, 160px"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                  <span className={`text-4xl sm:text-5xl font-bold opacity-30 ${primaryTextClass}`}>
                    {profile.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 text-left space-y-1.5 sm:space-y-3 pt-1 sm:pt-2">
            <div>
              <h1
                className={`text-2xl sm:text-4xl font-bold leading-tight ${primaryTextClass}`}
                style={{ fontFamily: menuFontFamily }}
              >
                {profile.display_name}
              </h1>
            </div>

            {profile.bio && (
              <p className={`text-xs sm:text-base max-w-lg whitespace-pre-wrap ${secondaryTextClass} line-clamp-2 sm:line-clamp-none`}>
                {profile.bio}
              </p>
            )}

            <div className="flex justify-start gap-3">
              {profile.instagram_url && (
                <a
                  href={profile.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkBackground ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
                  aria-label="Instagram"
                >
                  <Instagram size={16} className="sm:w-5 sm:h-5" />
                </a>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkBackground ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
                  aria-label="Website"
                >
                  <Globe size={16} className="sm:w-5 sm:h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Filters Section - Always Visible */}
        <div className="space-y-2 sm:space-y-4">
          {/* Category Filter */}
          <div>
            <div className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex flex-nowrap gap-2 pb-1 sm:pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCategoryChange('all')}
                  className={getCategoryButtonClass(selectedCategory === 'all')}
                  style={getCategoryButtonStyle(selectedCategory === 'all')}
                  disabled={isPending}
                >
                  All Items
                </Button>
                {favoritedItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCategoryChange('favorites')}
                    className={getCategoryButtonClass(selectedCategory === 'favorites')}
                    style={getCategoryButtonStyle(selectedCategory === 'favorites')}
                    disabled={isPending}
                  >
                    Specials
                  </Button>
                )}
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleCategoryChange(category.id)}
                    className={getCategoryButtonClass(selectedCategory === category.id)}
                    style={getCategoryButtonStyle(selectedCategory === category.id)}
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
            <div className="overflow-x-auto scrollbar-hide scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex flex-nowrap gap-2 pb-1 sm:pb-2">
                {tags.map((tag) => {
                  const isSelected = selectedTagsSetForButtons.has(tag.id)
                  return (
                    <Button
                      key={tag.id}
                      variant="outline"
                      size="sm"
                      className={`cursor-pointer flex-shrink-0 py-[3.74px] px-[7.48px] text-[10.89px] transition-colors rounded-lg ${isSelected ? 'font-semibold shadow-sm' : 'font-medium'
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
            <div className={`pt-2`}>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className={`h-7 text-[10px] rounded-lg px-3`}
                style={isDarkBackground ? {
                  borderColor: '#ffffff',
                  color: '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.05)'
                } : {
                  borderColor: '#000000',
                  color: '#1f2937',
                  backgroundColor: 'rgba(17,24,39,0.05)'
                }}
                disabled={isPending}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}


        {/* Menu Items */}
        <div className="space-y-6">


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
                  className={isDarkBackground ? 'text-white rounded-lg' : 'rounded-lg'}
                  style={isDarkBackground ? {
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  } : {
                    borderColor: '#000000',
                    backgroundColor: 'rgba(17,24,39,0.05)'
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Show section title when viewing favorites */}
              {selectedCategory === 'favorites' && (
                <h3
                  className={`text-xl font-semibold ${primaryTextClass}`}
                  style={{ fontFamily: menuFontFamily }}
                >
                  Specials
                </h3>
              )}

              {selectedCategory === 'all' ? (
                /* Grouped view for All Items */
                <div className="space-y-8">
                  {(() => {
                    // Group items by category (preserving the sort order from filteredItems)
                    const groupedItems = new Map<string, MenuItemWithTags[]>()
                    const uncategorizedItems: MenuItemWithTags[] = []

                    filteredItems.forEach(item => {
                      if (item.category_id && item.menu_categories) {
                        if (!groupedItems.has(item.category_id)) {
                          groupedItems.set(item.category_id, [])
                        }
                        groupedItems.get(item.category_id)?.push(item)
                      } else {
                        uncategorizedItems.push(item)
                      }
                    })

                    // We need to iterate in the order of categories
                    // filteredItems is already sorted by category order, so we can trust the order of appearance in the map keys
                    // valid only if we insert in order, which we do because filteredItems is sorted.

                    const sections = []

                    for (const [categoryId, items] of groupedItems.entries()) {
                      const categoryName = items[0].menu_categories?.name || 'Category'
                      sections.push(
                        <div key={categoryId}>
                          <CategoryDivider
                            title={categoryName}
                            isDarkBackground={isDarkBackground}
                            fontFamily={menuFontFamily}
                          />
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                            {items.map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                onSelect={handleItemSelect}
                                priceClass={primaryTextClass}
                                descriptionClass={secondaryTextClass}
                                isDarkBackground={isDarkBackground}
                                headingFontFamily={menuFontFamily}
                                showPrices={showPrices}
                                getBorderColor={getBorderColor}
                                currency={profile.currency}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    }

                    // Render uncategorized items at the end if any
                    if (uncategorizedItems.length > 0) {
                      sections.push(
                        <div key="uncategorized">
                          {sections.length > 0 && (
                            <CategoryDivider
                              title="Other Items"
                              isDarkBackground={isDarkBackground}
                              fontFamily={menuFontFamily}
                            />
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                            {uncategorizedItems.map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                onSelect={handleItemSelect}
                                priceClass={primaryTextClass}
                                descriptionClass={secondaryTextClass}
                                isDarkBackground={isDarkBackground}
                                headingFontFamily={menuFontFamily}
                                showPrices={showPrices}
                                getBorderColor={getBorderColor}
                                currency={profile.currency}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    }

                    return sections
                  })()}
                </div>
              ) : (
                /* Standard grid for single category view */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                  {filteredItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onSelect={handleItemSelect}
                      priceClass={primaryTextClass}
                      descriptionClass={secondaryTextClass}
                      isDarkBackground={isDarkBackground}
                      headingFontFamily={menuFontFamily}
                      showPrices={showPrices}
                      getBorderColor={getBorderColor}
                      currency={profile.currency}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-12 text-center text-[10px] ${mutedTextClass}`}>
          Allergen info provided by restaurant, always notify your waiter
        </div>
      </div>

      {/* Expanded Menu Item Modal */}
      {
        selectedItem && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            style={{
              width: '100vw',
              overflow: 'hidden',
            }}
            onClick={() => setSelectedItem(null)}
          >
            <div
              className={`w-full max-w-md flex flex-col gap-4 animate-in slide-in-from-bottom-8 fade-in duration-300`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Card */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-md border border-white/10 group">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 border border-white/20"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                {selectedItem.image_url ? (
                  <div className="w-full h-full relative">
                    <Image
                      src={selectedItem.image_url}
                      alt={selectedItem.title}
                      fill
                      className="object-contain"
                      sizes="(min-width: 768px) 600px, 100vw"
                      priority
                    />
                  </div>
                ) : (
                  <div className={`flex h-full w-full items-center justify-center text-sm ${mutedTextClass}`}>
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <span className="text-4xl">🍽️</span>
                      <span>No image available</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Card */}
              <div
                className="w-full rounded-2xl p-6 shadow-xl overflow-hidden relative"
                style={{
                  backgroundColor: menuBackgroundColor,
                  color: contrastColor,
                }}
              >
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <h2
                        id="public-menu-item-heading"
                        className={`text-2xl font-bold leading-tight ${primaryTextClass}`}
                        style={{ fontFamily: menuFontFamily }}
                      >
                        {selectedItem.title}
                      </h2>
                      {showPrices && typeof selectedItem.price === 'number' && (
                        <div className={`text-xl font-semibold whitespace-nowrap ${primaryTextClass} notranslate`}>
                          {formatPrice(selectedItem.price, profile.currency)}
                        </div>
                      )}
                    </div>

                    {selectedItem.menu_categories && (
                      <Badge
                        variant="secondary"
                        className="self-start border"
                        style={{
                          backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          color: contrastColor,
                          borderColor: getBorderColor(),
                        }}
                      >
                        {selectedItem.menu_categories.name}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {selectedItem.description && (
                    <p className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${primaryTextClass}`}>
                      {selectedItem.description}
                    </p>
                  )}

                  {/* Tags */}
                  {selectedItem.menu_item_tags && selectedItem.menu_item_tags.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedItem.menu_item_tags.map((itemTag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs border cursor-pointer hover:opacity-80 transition-opacity py-1.5 px-3"
                            style={buildTagStyles(itemTag.tags.name, { isDarkBackground })}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTagClickFromModal(itemTag.tags.id)
                            }}
                          >
                            {itemTag.tags.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`mt-2 text-[10px] leading-tight ${primaryTextClass}`}>
                    Allergen info provided by restaurant, always notify your waiter
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }


    </div >
  )
}
