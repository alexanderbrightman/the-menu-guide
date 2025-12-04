'use client'

import { useState, useMemo, useEffect, useTransition, useDeferredValue, memo, useCallback } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { X, Filter, Instagram, Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Profile, MenuCategory, MenuItem, Tag as TagType } from '@/lib/supabase'
import { formatPrice } from '@/lib/currency'

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

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
]

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
    'nut-free': '#408250',
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
    {item.image_url && (
      <div className={`relative aspect-[3/2] overflow-hidden border-b ${getBorderColor()}`}>
        <Image
          src={item.image_url}
          alt={item.title}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />
      </div>
    )}
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
        <p className={`text-xs line-clamp-2 ${descriptionClass}`}>
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
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

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
      return `${baseCategoryButtonClass} cursor-pointer border rounded-none ${emphasis} ${hoverState}`
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
  }, [menuItems, deferredSelectedCategory, selectedTagsSet, itemTagIdSets, favoritedIdsSet])

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

  useEffect(() => {
    // Initialize Google Translate
    // @ts-expect-error - Google Translate API adds properties to window
    window.googleTranslateElementInit = () => {
      // @ts-expect-error - Google Translate API is loaded at runtime
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      )
    }

    // Load the script
    const script = document.createElement('script')
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)

    // Add styles to hide the Google Translate banner and widget
    const style = document.createElement('style')
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate { display: none !important; }
      body { top: 0px !important; }
      .goog-te-gadget { display: none !important; }
      #google_translate_element { display: none !important; }
      .skiptranslate { display: none !important; }
    `
    document.head.appendChild(style)

    return () => {
      // Cleanup if needed
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleTranslate = useCallback((langCode: string) => {
    // Set the googtrans cookie which the script reads to determine target language
    // Format: /source_lang/target_lang
    document.cookie = `googtrans=/auto/${langCode}; path=/`
    window.location.reload()
  }, [])

  return (
    <div className="min-h-screen transition-colors" style={themeStyle}>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" className="hidden"></div>

      {/* Large Header Photo */}
      <header className="relative max-w-screen-2xl mx-auto w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div
            className="relative h-[20vh] w-full overflow-hidden border"
            style={{
              backgroundColor: menuBackgroundColor,
              borderColor: isDarkBackground ? '#ffffff' : '#000000'
            }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
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
        {profile.show_display_name !== false && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
            <h1
              className={`font-bold text-center whitespace-nowrap ${primaryTextClass}`}
              style={{ fontFamily: menuFontFamily, fontSize: '42px', lineHeight: 1.1 }}
            >
              {profile.display_name}
            </h1>
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}
        <div className="mb-6">
          <div className="space-y-2">
            {/* Filter Menu Header */}
            <div className="mb-0.5">
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
                <div className="flex flex-nowrap gap-1.5 pb-1">
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
                      Our Favorites
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
              <div className="overflow-x-auto scrollbar-hide scroll-smooth">
                <div className="flex flex-nowrap gap-1.5 pb-1">
                  {tags.map((tag) => {
                    const isSelected = selectedTagsSetForButtons.has(tag.id)
                    return (
                      <Button
                        key={tag.id}
                        variant="outline"
                        size="sm"
                        className={`cursor-pointer flex-shrink-0 py-[3.74px] px-[7.48px] text-[10.89px] transition-colors rounded-none ${isSelected ? 'font-semibold shadow-sm' : 'font-medium'
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
                  className={`py-[3.74px] px-[7.48px] text-[9.9px] rounded-none`}
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
        </div>

        {/* Menu Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2
              className={`text-2xl font-bold ${primaryTextClass}`}
              style={{ fontFamily: menuFontFamily }}
            >
              Menu
            </h2>
            <div className="flex items-center gap-2">
              {/* Translate Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="border rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                    style={{
                      width: '22px',
                      height: '22px',
                      borderColor: isDarkBackground ? '#ffffff' : '#000000',
                      color: isDarkBackground ? '#ffffff' : '#000000',
                    }}
                    aria-label="Translate menu"
                  >
                    <Globe className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => handleTranslate(lang.code)}
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {profile.bio && (
                <button
                  onClick={() => setIsInfoModalOpen(true)}
                  className="border rounded-full flex items-center justify-center text-[10px] font-medium transition-colors hover:opacity-70"
                  style={{
                    width: '22px',
                    height: '22px',
                    borderColor: isDarkBackground ? '#ffffff' : '#000000',
                    color: isDarkBackground ? '#ffffff' : '#000000',
                    fontFamily: 'Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 'normal'
                  }}
                  aria-label="Show restaurant information"
                >
                  i
                </button>
              )}
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
                  Our Favorites
                </h3>
              )}
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
            </>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          style={{
            width: '100vw',
            overflow: 'auto',
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className={`relative border shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${getBorderColor()}`}
            style={{
              backgroundColor: menuBackgroundColor,
              color: contrastColor,
              borderColor: isDarkBackground ? '#ffffff' : '#000000',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-menu-item-heading"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 border ${getBorderColor()} transition-colors z-10 ${isDarkBackground
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-white/80 hover:bg-white text-gray-700'
                }`}
              aria-label="Close"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>

            {/* Content */}
            <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div
                className="relative h-48 sm:h-64 w-full md:h-full md:min-h-[24rem] border-b md:border-b-0 md:border-r"
                style={{
                  borderColor: isDarkBackground ? '#ffffff' : '#000000'
                }}
              >
                {selectedItem.image_url ? (
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedItem.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 40vw, 90vw"
                  />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center text-xs sm:text-sm ${mutedTextClass}`}>
                    Photo coming soon
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 md:p-6 lg:p-8 md:overflow-y-auto md:max-h-[calc(90vh-3rem)]">
                {/* Title and Price */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    <h2
                      id="public-menu-item-heading"
                      className={`text-xl sm:text-2xl md:text-3xl font-bold ${primaryTextClass}`}
                      style={{ fontFamily: menuFontFamily }}
                    >
                      {selectedItem.title}
                    </h2>
                    {selectedItem.menu_categories && (
                      <Badge
                        variant="secondary"
                        className="self-start border"
                        style={{
                          backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          color: contrastColor,
                          borderColor: isDarkBackground ? '#ffffff' : '#000000',
                        }}
                      >
                        {selectedItem.menu_categories.name}
                      </Badge>
                    )}
                  </div>
                  {showPrices && typeof selectedItem.price === 'number' && (
                    <div className={`text-lg sm:text-xl font-semibold ${primaryTextClass} notranslate`}>
                      {formatPrice(selectedItem.price, profile.currency)}
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedItem.description && (
                  <div>
                    <p className={`text-sm sm:text-base leading-relaxed ${secondaryTextClass}`}>
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                {/* Dietary Tags */}
                {selectedItem.menu_item_tags && selectedItem.menu_item_tags.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.menu_item_tags.map((itemTag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border cursor-pointer hover:opacity-80 transition-opacity"
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {isInfoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          style={{
            width: '100vw',
            overflow: 'auto',
          }}
          onClick={() => setIsInfoModalOpen(false)}
        >
          <div
            className={`relative border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 ${getBorderColor()}`}
            style={{
              backgroundColor: menuBackgroundColor,
              color: contrastColor,
              borderColor: isDarkBackground ? '#ffffff' : '#000000',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-info-heading"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 border ${getBorderColor()} transition-colors z-10 ${isDarkBackground
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-white/80 hover:bg-white text-gray-700'
                }`}
              aria-label="Close"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>

            {/* Content */}
            <div className="flex flex-col">
              {/* Header Image - smaller size */}
              {profile.avatar_url && (
                <div className="relative h-32 sm:h-40 w-full overflow-hidden border-b" style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                  <Image
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 768px"
                  />
                </div>
              )}

              {/* Info Content - increased padding to maintain card size */}
              <div className="flex flex-col gap-3 sm:gap-4 p-6 sm:p-8 md:p-10 overflow-y-auto max-h-[calc(90vh-12rem)]">
                {/* Bio */}
                {profile.bio && (
                  <div className="text-center">
                    <p
                      className={`text-sm sm:text-base leading-relaxed ${secondaryTextClass}`}
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Social Links */}
                {(profile.instagram_url || profile.website_url) && (
                  <div className="flex justify-center items-center gap-4 pt-2">
                    {profile.instagram_url && (
                      <a
                        href={profile.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-opacity hover:opacity-70 ${secondaryTextClass}`}
                        aria-label="Instagram"
                      >
                        <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
                      </a>
                    )}
                    {profile.website_url && (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`transition-opacity hover:opacity-70 ${secondaryTextClass}`}
                        aria-label="Website"
                      >
                        <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
                      </a>
                    )}
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
