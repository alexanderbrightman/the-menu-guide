'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Edit, Link2, Plus, Scan, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, MenuCategory, MenuItem, Profile, Tag as TagType } from '@/lib/supabase'
import { useImageUpload } from '@/hooks/useImageUpload'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface MenuItemWithRelations extends MenuItem {
  menu_categories?: { name: string }
  menu_item_tags?: { tags: { id: number; name: string } }[]
}

type CategoryMap = Record<string, MenuItemWithRelations[]>

const DEFAULT_MENU_BACKGROUND_COLOR = '#F4F2EE'
const DEFAULT_MENU_FONT = 'Plus Jakarta Sans'
const FONT_FAMILY_MAP: Record<string, string> = {
  'Plus Jakarta Sans': '"Plus Jakarta Sans", sans-serif',
  'Fjalla One': '"Fjalla One", sans-serif',
  Georgia: 'Georgia, serif',
  'Times New Roman': '"Times New Roman", serif',
  Arial: 'Arial, sans-serif',
  'Courier New': '"Courier New", monospace',
}

const MAX_TITLE_FONT_SIZE = 64
const MIN_TITLE_FONT_SIZE = 28

const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#1f2937'
  const cleanHex = hexColor.replace('#', '')
  const normalizedHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((char) => char + char)
          .join('')
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
  const normalized =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((char) => char + char)
          .join('')
      : cleanHex

  if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`

  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getAllergenBorderColor = (tagName: string): string => {
  const colorMap: Record<string, string> = {
    'dairy-free': '#B5C1D9',
    'gluten-free': '#D48963',
    'nut-free': '#408250',
    pescatarian: '#F698A7',
    'shellfish-free': '#F6D98E',
    spicy: '#F04F68',
    vegan: '#A9CC66',
    vegetarian: '#3B91A2',
  }
  return colorMap[tagName.toLowerCase()] || ''
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
) => {
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

const mapItemCategory = (item: MenuItemWithRelations, categories: MenuCategory[]) => {
  if (!item.category_id) {
    return {
      ...item,
      menu_categories: undefined,
    }
  }

  const category = categories.find((cat) => cat.id === item.category_id)
  if (!category) {
    return {
      ...item,
      menu_categories: undefined,
    }
  }

  return {
    ...item,
    menu_categories: { name: category.name },
  }
}

interface ItemFormState {
  title: string
  description: string
  price: string
  image_url: string
}

const EMPTY_ITEM_FORM: ItemFormState = {
  title: '',
  description: '',
  price: '',
  image_url: '',
}

interface PrivateMenuPageProps {
  onEditProfile?: () => void
}

export function PrivateMenuPage({ onEditProfile }: PrivateMenuPageProps) {
  const { user, profile } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItemWithRelations[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemWithRelations | null>(null)
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM)
  const [itemCategory, setItemCategory] = useState<string>('none')
  const [itemTags, setItemTags] = useState<number[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)

  const { uploading, progress, uploadImage, resetProgress } = useImageUpload()

  const menuFont = profile?.menu_font || DEFAULT_MENU_FONT
  const menuBackgroundColor = profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR
  const contrastColor = useMemo(() => getContrastColor(menuBackgroundColor), [menuBackgroundColor])
  const isDarkBackground = contrastColor === '#ffffff'
  const menuFontFamily = useMemo(
    () => FONT_FAMILY_MAP[menuFont] ?? menuFont,
    [menuFont]
  )

  const titleFontSize = useMemo(() => {
    if (!profile?.display_name) {
      return MIN_TITLE_FONT_SIZE
    }

    if (profile.display_name.length <= 10) {
      return MAX_TITLE_FONT_SIZE
    }

    const step = Math.max(MIN_TITLE_FONT_SIZE, MAX_TITLE_FONT_SIZE - Math.floor(profile.display_name.length / 2))
    return step
  }, [profile?.display_name])

  const primaryTextClass = isDarkBackground ? 'text-white' : 'text-slate-900'
  const secondaryTextClass = isDarkBackground ? 'text-gray-100/90' : 'text-slate-600'
  const mutedTextClass = isDarkBackground ? 'text-gray-200/80' : 'text-slate-500'
  const accentButtonClass = isDarkBackground
    ? 'border border-white/90 bg-transparent !text-white hover:bg-white/15'
    : 'border border-slate-900 bg-transparent !text-slate-900 hover:bg-slate-100'
  const outlineButtonClass = isDarkBackground
    ? 'border border-white/60 bg-transparent !text-white hover:bg-white/10'
    : 'border border-slate-400 bg-transparent !text-slate-900 hover:bg-slate-100'
  const focusRingClass = isDarkBackground
    ? 'focus-visible:ring-white/60 focus-visible:ring-offset-white/5'
    : 'focus-visible:ring-gray-800/25 focus-visible:ring-offset-gray-100'

  const setTransientMessage = useCallback((value: string) => {
    setMessage(value)
    if (!value) return
    const timeout = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timeout)
  }, [])

  const fetchMenuData = useCallback(async () => {
    if (!user) return
    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setTransientMessage('Error: Not authenticated')
        return
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
      }

      const [itemsRes, categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/menu-items', { headers }),
        fetch('/api/menu-categories', { headers }),
        fetch('/api/tags', { headers }),
      ])

      const [itemsData, categoriesData, tagsData] = await Promise.all([
        itemsRes.json(),
        categoriesRes.json(),
        tagsRes.json(),
      ])

      if (itemsRes.ok && Array.isArray(itemsData.items)) {
        setMenuItems(itemsData.items)
      } else if (!itemsRes.ok) {
        setTransientMessage(`Error: ${itemsData.error || 'Failed to load menu items'}`)
      }

      if (categoriesRes.ok && Array.isArray(categoriesData.categories)) {
        setCategories(categoriesData.categories)
      } else if (!categoriesRes.ok) {
        setTransientMessage(`Error: ${categoriesData.error || 'Failed to load categories'}`)
      }

      if (tagsRes.ok && Array.isArray(tagsData.tags)) {
        setTags(tagsData.tags)
      } else if (!tagsRes.ok) {
        setTransientMessage(`Error: ${tagsData.error || 'Failed to load tags'}`)
      }
    } catch (error) {
      console.error('Error fetching menu data:', error)
      setTransientMessage('Error fetching menu data')
    } finally {
      setLoading(false)
    }
  }, [user, setTransientMessage])

  useEffect(() => {
    fetchMenuData()
  }, [fetchMenuData])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const previousBodyBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = menuBackgroundColor

    return () => {
      document.body.style.backgroundColor = previousBodyBg
    }
  }, [menuBackgroundColor])

  const groupedItems = useMemo<CategoryMap>(() => {
    return menuItems.reduce<CategoryMap>((acc, item) => {
      const key = item.category_id || 'uncategorized'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(mapItemCategory(item, categories))
      return acc
    }, {})
  }, [menuItems, categories])

  const uncategorizedItems = groupedItems['uncategorized'] || []
  const categorySections = useMemo(() => categories.map((category) => ({
    category,
    items: groupedItems[category.id] || [],
  })), [categories, groupedItems])

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }, [])

  const resetCategoryDialog = () => {
    setCategoryName('')
    setEditingCategory(null)
  }

  const openCreateCategory = () => {
    resetCategoryDialog()
    setIsCategoryDialogOpen(true)
  }

  const openEditCategory = (category: MenuCategory) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setIsCategoryDialogOpen(true)
  }

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!categoryName.trim()) return
    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setTransientMessage('Error: Not authenticated')
        return
      }

      const payload = {
        name: categoryName.trim(),
      }

      const response = await fetch('/api/menu-categories', {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(
          editingCategory
            ? { ...payload, id: editingCategory.id }
            : payload
        ),
      })

      const data = await response.json()

      if (response.ok) {
        setTransientMessage(
          editingCategory ? 'Category updated successfully' : 'Category created successfully'
        )
        setIsCategoryDialogOpen(false)
        resetCategoryDialog()
        await fetchMenuData()
      } else {
        setTransientMessage(`Error: ${data.error || 'Unable to save category'}`)
      }
    } catch (error) {
      console.error('Error saving category:', error)
      setTransientMessage('Error saving category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? Menu items will become uncategorized.')) {
      return
    }

    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setTransientMessage('Error: Not authenticated')
        return
      }

      const response = await fetch(`/api/menu-categories?id=${categoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setTransientMessage('Category deleted')
        await fetchMenuData()
      } else {
        const data = await response.json()
        setTransientMessage(`Error: ${data.error || 'Unable to delete category'}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setTransientMessage('Error deleting category')
    }
  }

  const startCreateItem = () => {
    setEditingItem(null)
    setItemForm(EMPTY_ITEM_FORM)
    setItemCategory('none')
    setItemTags([])
    setImageFile(null)
    setIsItemSheetOpen(true)
    resetProgress()
  }

  const startEditItem = (item: MenuItemWithRelations) => {
    setEditingItem(item)
    setItemForm({
      title: item.title,
      description: item.description || '',
      price: typeof item.price === 'number' ? item.price.toString() : '',
      image_url: item.image_url || '',
    })
    setItemCategory(item.category_id || 'none')
    const tagIds =
      item.menu_item_tags?.filter((entry) => entry?.tags?.id).map((entry) => entry.tags.id) || []
    setItemTags(tagIds)
    setImageFile(null)
    resetProgress()
    setIsItemSheetOpen(true)
  }

  const closeItemSheet = (open: boolean) => {
    if (!open) {
      setIsItemSheetOpen(false)
      setEditingItem(null)
      setItemForm(EMPTY_ITEM_FORM)
      setItemCategory('none')
      setItemTags([])
      setImageFile(null)
      resetProgress()
    } else {
      setIsItemSheetOpen(true)
    }
  }

  const toggleFormTag = (tagId: number) => {
    setItemTags((prev) => {
      const set = new Set(prev)
      if (set.has(tagId)) {
        set.delete(tagId)
      } else {
        set.add(tagId)
      }
      return Array.from(set)
    })
  }

  const upsertMenuItem = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!itemForm.title.trim()) {
      setTransientMessage('Title is required')
      return
    }

    if (!supabase || !user) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setTransientMessage('Error: Not authenticated')
        return
      }

      let imageUrl = itemForm.image_url

      if (imageFile) {
        try {
          const result = await uploadImage(imageFile, user.id, 'menu_items')
          imageUrl = result.url
        } catch (error) {
          console.error('Image upload failed:', error)
          setTransientMessage('Error uploading image')
          resetProgress()
          return
        }
      }

      const payload = {
        ...itemForm,
        price: itemForm.price ? Number(itemForm.price) : null,
        image_url: imageUrl,
        category_id: itemCategory === 'none' ? null : itemCategory,
        tag_ids: itemTags,
      }

      const response = await fetch('/api/menu-items', {
        method: editingItem ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(
          editingItem
            ? {
                id: editingItem.id,
                ...payload,
              }
            : payload
        ),
      })

      const data = await response.json()

      if (response.ok) {
        setTransientMessage(
          editingItem ? 'Menu item updated successfully' : 'Menu item created successfully'
        )
        closeItemSheet(false)
        await fetchMenuData()
      } else {
        setTransientMessage(`Error: ${data.error || 'Unable to save menu item'}`)
      }
    } catch (error) {
      console.error('Error saving menu item:', error)
      setTransientMessage('Error saving menu item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this menu item?')) {
      return
    }

    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setTransientMessage('Error: Not authenticated')
        return
      }

      const response = await fetch(`/api/menu-items?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        setTransientMessage('Menu item deleted')
        await fetchMenuData()
      } else {
        const data = await response.json()
        setTransientMessage(`Error: ${data.error || 'Unable to delete menu item'}`)
      }
    } catch (error) {
      console.error('Error deleting menu item:', error)
      setTransientMessage('Error deleting menu item')
    }
  }

  const profileData: Profile | null = profile || null
  const usernameLink =
    typeof window !== 'undefined' && profileData?.username
      ? `${window.location.origin}/menu/${profileData.username}`
      : null

  const handleOpenScanMenu = useCallback(() => {
    if (typeof window === 'undefined') return
    const event = new CustomEvent('open-scan-menu')
    window.dispatchEvent(event)
  }, [])

  const uncategorizedOpen = expandedCategories['uncategorized']

  return (
    <section
      className="w-full py-12"
      style={{
        backgroundColor: menuBackgroundColor,
        color: contrastColor,
        fontFamily: menuFontFamily,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {profileData?.avatar_url && (
                <Image
                  src={profileData.avatar_url}
                  alt={profileData.display_name || 'Menu photo'}
                  width={120}
                  height={120}
                  className="rounded-full object-cover h-24 w-24 border border-white/40 shadow-lg"
                />
              )}
              <h1
                className={`font-bold leading-tight ${primaryTextClass}`}
                style={{ fontSize: `${titleFontSize}px`, fontFamily: menuFontFamily }}
              >
                {profileData?.display_name || 'Your Restaurant'}
              </h1>
            </div>

            {profileData?.bio && (
              <p
                className={`max-w-2xl text-base sm:text-lg ${secondaryTextClass}`}
                style={{ fontFamily: menuFontFamily }}
              >
                {profileData.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              {user && (
                <Button
                  variant="outline"
                  className={`${outlineButtonClass} flex items-center gap-2`}
                  onClick={handleOpenScanMenu}
                >
                  <Scan className="h-4 w-4" />
                  Scan Menu
                </Button>
              )}
              {onEditProfile && (
                <Button
                  variant="outline"
                  className={`${outlineButtonClass} flex items-center gap-2`}
                  onClick={onEditProfile}
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
              {usernameLink && (
                <Button
                  variant="outline"
                  className={`${outlineButtonClass} flex items-center gap-2`}
                  onClick={() => window.open(usernameLink, '_blank')}
                >
                  <Link2 className="h-4 w-4" />
                  View Public Page
                </Button>
              )}
              <Button
                variant="outline"
                className={`${outlineButtonClass} flex items-center gap-2`}
                onClick={openCreateCategory}
              >
                <Plus className="h-4 w-4" />
                New Category
              </Button>
              <Button
                variant="outline"
                className={`${outlineButtonClass} flex items-center gap-2`}
                onClick={startCreateItem}
              >
                <Plus className="h-4 w-4" />
                New Item
              </Button>
            </div>

            {message && (
              <div
                className={`max-w-2xl rounded-md border px-4 py-2 text-sm ${
                  message.toLowerCase().includes('error')
                    ? isDarkBackground
                      ? 'border-red-400 text-red-200'
                      : 'border-red-500 text-red-700 bg-red-50/80'
                    : isDarkBackground
                      ? 'border-emerald-300 text-emerald-200'
                      : 'border-emerald-500 text-emerald-700 bg-emerald-50/80'
                }`}
                role="status"
              >
                {message}
              </div>
            )}
          </div>
        </header>

        <div className="mt-12 space-y-8">
          {loading ? (
            <div
              className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 py-20 ${
                isDarkBackground ? 'bg-white/5' : 'bg-white/60'
              }`}
            >
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              <p className={`mt-4 text-sm ${secondaryTextClass}`}>Loading your menu...</p>
            </div>
          ) : categorySections.length > 0 ? (
            categorySections.map(({ category, items }) => {
              const isOpen = expandedCategories[category.id]
              const itemCount = items.length

              return (
                <section
                  key={category.id}
                  className={`rounded-2xl border transition ${
                    isDarkBackground ? 'border-white/15 bg-white/5' : 'border-gray-200 bg-white/80'
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className={`w-full px-6 py-5 flex items-start justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass}`}
                    onClick={() => toggleCategory(category.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleCategory(category.id)
                      }
                    }}
                  >
                    <div>
                      <h2
                        className={`text-2xl font-semibold ${primaryTextClass}`}
                        style={{ fontFamily: menuFontFamily }}
                      >
                        {category.name}
                      </h2>
                      <p className={`text-sm mt-1 ${mutedTextClass}`}>
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineButtonClass} flex items-center gap-1`}
                        onClick={(event) => {
                          event.stopPropagation()
                          startCreateItem()
                          setItemCategory(category.id)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Item
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineButtonClass} flex items-center gap-1`}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditCategory(category)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineButtonClass} flex items-center gap-1`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteCategory(category.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-white/10 px-6 py-6 space-y-6">
                      {itemCount === 0 ? (
                        <div className={`text-sm ${mutedTextClass}`}>
                          No menu items yet. Use the New Item button to add your first dish.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                          {items.map((item) => (
                            <article
                              key={item.id}
                              className={`group overflow-hidden rounded-xl border ${
                                isDarkBackground
                                  ? 'border-white/10 bg-white/10'
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              {item.image_url && (
                                <div className="relative aspect-[3/2] w-full overflow-hidden">
                                  <Image
                                    src={item.image_url}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                </div>
                              )}
                              <div className="p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3
                                      className={`text-xl font-semibold ${primaryTextClass}`}
                                      style={{ fontFamily: menuFontFamily }}
                                    >
                                      {item.title}
                                    </h3>
                                    {typeof item.price === 'number' && (
                                      <p className={`mt-1 text-sm ${secondaryTextClass}`}>
                                        ${item.price.toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className={outlineButtonClass}
                                      onClick={() => startEditItem(item)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className={outlineButtonClass}
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {item.description && (
                                  <p className={`text-sm leading-relaxed ${secondaryTextClass}`}>
                                    {item.description}
                                  </p>
                                )}

                                {item.menu_item_tags && item.menu_item_tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {item.menu_item_tags.map((itemTag, index) => (
                                      <Badge
                                        key={`${item.id}-tag-${index}`}
                                        variant="outline"
                                        className="text-xs"
                                        style={buildTagStyles(itemTag.tags.name, {
                                          isDarkBackground,
                                        })}
                                      >
                                        {itemTag.tags.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })
          ) : uncategorizedItems.length > 0 ? (
            <section
              className={`rounded-2xl border ${
                isDarkBackground ? 'border-white/15 bg-white/5' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div>
                    <h2
                      className={`text-2xl font-semibold ${primaryTextClass}`}
                      style={{ fontFamily: menuFontFamily }}
                    >
                      Menu Items
                    </h2>
                    <p className={`text-sm mt-1 ${mutedTextClass}`}>
                      Organize with categories whenever you are ready.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className={outlineButtonClass}
                    onClick={startCreateItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {uncategorizedItems.map((item) => (
                    <article
                      key={item.id}
                      className={`group overflow-hidden rounded-xl border ${
                        isDarkBackground ? 'border-white/10 bg-white/10' : 'border-gray-200 bg-white'
                      }`}
                    >
                      {item.image_url && (
                        <div className="relative aspect-[3/2] w-full overflow-hidden">
                          <Image
                            src={item.image_url}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3
                              className={`text-xl font-semibold ${primaryTextClass}`}
                              style={{ fontFamily: menuFontFamily }}
                            >
                              {item.title}
                            </h3>
                            {typeof item.price === 'number' && (
                              <p className={`mt-1 text-sm ${secondaryTextClass}`}>
                                ${item.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className={outlineButtonClass}
                              onClick={() => startEditItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className={outlineButtonClass}
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {item.description && (
                          <p className={`text-sm leading-relaxed ${secondaryTextClass}`}>
                            {item.description}
                          </p>
                        )}

                        {item.menu_item_tags && item.menu_item_tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.menu_item_tags.map((itemTag, index) => (
                              <Badge
                                key={`${item.id}-uncat-${index}`}
                                variant="outline"
                                className="text-xs"
                                style={buildTagStyles(itemTag.tags.name, {
                                  isDarkBackground,
                                })}
                              >
                                {itemTag.tags.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <div
              className={`rounded-2xl border border-dashed py-16 text-center ${
                isDarkBackground ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-white/60'
              }`}
            >
              <h2 className={`text-2xl font-semibold ${primaryTextClass}`}>
                Organize your menu with categories
              </h2>
              <p className={`mt-2 text-sm ${mutedTextClass}`}>
                Create a menu category to get started. Menu items appear here once created.
              </p>
              <Button
                className={`mt-6 ${accentButtonClass}`}
                onClick={openCreateCategory}
              >
                Add your first category
              </Button>
            </div>
          )}

          {categorySections.length > 0 && uncategorizedItems.length > 0 && (
            <section
              className={`rounded-2xl border transition ${
                isDarkBackground ? 'border-white/12 bg-white/8' : 'border-gray-200 bg-white'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                className={`w-full px-6 py-5 flex items-start justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass}`}
                onClick={() =>
                  setExpandedCategories((prev) => ({
                    ...prev,
                    uncategorized: !prev.uncategorized,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setExpandedCategories((prev) => ({
                      ...prev,
                      uncategorized: !prev.uncategorized,
                    }))
                  }
                }}
              >
                <div>
                  <h2
                    className={`text-2xl font-semibold ${primaryTextClass}`}
                    style={{ fontFamily: menuFontFamily }}
                  >
                    Uncategorized
                  </h2>
                  <p className={`text-sm mt-1 ${mutedTextClass}`}>
                    {uncategorizedItems.length} item
                    {uncategorizedItems.length === 1 ? '' : 's'}
                  </p>
                </div>
                {uncategorizedOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>

              {uncategorizedOpen && (
                <div className="border-t border-white/10 px-6 py-6 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {uncategorizedItems.map((item) => (
                      <article
                        key={item.id}
                        className={`group overflow-hidden rounded-xl border ${
                          isDarkBackground ? 'border-white/10 bg-white/10' : 'border-gray-200 bg-white'
                        }`}
                      >
                        {item.image_url && (
                          <div className="relative aspect-[3/2] w-full overflow-hidden">
                            <Image
                              src={item.image_url}
                              alt={item.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3
                                className={`text-xl font-semibold ${primaryTextClass}`}
                                style={{ fontFamily: menuFontFamily }}
                              >
                                {item.title}
                              </h3>
                              {typeof item.price === 'number' && (
                                <p className={`mt-1 text-sm ${secondaryTextClass}`}>
                                  ${item.price.toFixed(2)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className={outlineButtonClass}
                                onClick={() => startEditItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className={outlineButtonClass}
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {item.description && (
                            <p className={`text-sm leading-relaxed ${secondaryTextClass}`}>
                              {item.description}
                            </p>
                          )}

                          {item.menu_item_tags && item.menu_item_tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.menu_item_tags.map((itemTag, index) => (
                                <Badge
                                  key={`${item.id}-uncat-tag-${index}`}
                                  variant="outline"
                                  className="text-xs"
                                  style={buildTagStyles(itemTag.tags.name, {
                                    isDarkBackground,
                                  })}
                                >
                                  {itemTag.tags.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open)
        if (!open) {
          resetCategoryDialog()
        }
      }}>
        <DialogContent
          className={`sm:max-w-md ${isDarkBackground ? 'border-white/15' : 'border-slate-200'}`}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category name. Menu items remain in the category.'
                : 'Create a category to group menu items.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="e.g. Starters"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={outlineButtonClass}
                onClick={() => {
                  setIsCategoryDialogOpen(false)
                  resetCategoryDialog()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className={accentButtonClass}>
                {editingCategory ? 'Save changes' : 'Create category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={isItemSheetOpen} onOpenChange={closeItemSheet}>
        <SheetContent
          side="right"
          className={`sm:max-w-lg overflow-hidden ${isDarkBackground ? 'border-white/15' : 'border-slate-200'}`}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: contrastColor }}>
              {editingItem ? 'Edit Menu Item' : 'Create Menu Item'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={upsertMenuItem} className="flex flex-col gap-5 px-4 pb-6 max-h-[75vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="item-title">Title</Label>
              <Input
                id="item-title"
                value={itemForm.title}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="e.g. Truffle Fries"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe the dish and highlight key details."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="item-price">Price</Label>
                <Input
                  id="item-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.price}
                  onChange={(event) =>
                    setItemForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="12.50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-category">Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger id="item-category">
                    <SelectValue placeholder="Assign a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary tags</Label>
              {tags.length === 0 ? (
                <p className={`text-sm ${mutedTextClass}`}>
                  Create tags in the Tags manager to categorize dietary preferences.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = itemTags.includes(tag.id)
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`flex items-center gap-2 border ${
                          isSelected ? 'border-primary' : 'border-slate-300'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(17,24,39,0.08)'
                            : 'transparent',
                          color: isDarkBackground ? '#ffffff' : '#1f2937',
                        }}
                        onClick={() => toggleFormTag(tag.id)}
                      >
                        {tag.name}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-image">Menu photo</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="item-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      setImageFile(file)
                    }
                  }}
                />
                {itemForm.image_url && !imageFile && (
                  <Button
                    type="button"
                    variant="outline"
                    className={outlineButtonClass}
                    onClick={() =>
                      setItemForm((prev) => ({
                        ...prev,
                        image_url: '',
                      }))
                    }
                  >
                    Remove existing
                  </Button>
                )}
              </div>
              {uploading && (
                <div className={`text-sm ${mutedTextClass}`}>
                  {progress.message} ({Math.round(progress.progress)}%)
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className={`${accentButtonClass} flex items-center gap-2`}>
                <Upload className="h-4 w-4" />
                {editingItem ? 'Save menu item' : 'Create menu item'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={outlineButtonClass}
                onClick={() => closeItemSheet(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  )
}

