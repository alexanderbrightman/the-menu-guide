'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Edit, Link2, Plus, Scan, Star, Trash2, Upload, X } from 'lucide-react'
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
import { SettingsDialog } from '@/components/profile/SettingsDialog'

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
  const [selectedItem, setSelectedItem] = useState<MenuItemWithRelations | null>(null)
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set())

  const { uploading, progress, uploadImage, resetProgress } = useImageUpload()

  const menuFont = profile?.menu_font || DEFAULT_MENU_FONT
  const menuBackgroundColor = profile?.menu_background_color || DEFAULT_MENU_BACKGROUND_COLOR
  const contrastColor = useMemo(() => getContrastColor(menuBackgroundColor), [menuBackgroundColor])
  const isDarkBackground = contrastColor === '#ffffff'
  const menuFontFamily = useMemo(
    () => FONT_FAMILY_MAP[menuFont] ?? menuFont,
    [menuFont]
  )

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

  const fetchMenuData = useCallback(async (showLoading = true) => {
    if (!user) return
    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    try {
      if (showLoading) {
        setLoading(true)
      }
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
        fetch('/api/menu-items', { 
          headers,
          cache: 'no-store',
        }),
        fetch('/api/menu-categories', { 
          headers,
          cache: 'no-store',
        }),
        fetch('/api/tags', { 
          headers,
          cache: 'no-store',
        }),
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
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [user, setTransientMessage])

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    if (!supabase) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
      }

      const response = await fetch('/api/favorites', {
        headers,
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok && Array.isArray(data.favoriteIds)) {
        setFavoritedIds(new Set(data.favoriteIds))
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    }
  }, [user])

  useEffect(() => {
    fetchMenuData()
    fetchFavorites()
  }, [fetchMenuData, fetchFavorites])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const previousBodyBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = menuBackgroundColor

    return () => {
      document.body.style.backgroundColor = previousBodyBg
    }
  }, [menuBackgroundColor])

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

  const toggleFavorite = useCallback(async (itemId: string) => {
    if (!user || !supabase) return

    const isFavorited = favoritedIds.has(itemId)

    // Optimistic update
    setFavoritedIds((prev) => {
      const newSet = new Set(prev)
      if (isFavorited) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        // Revert on error
        setFavoritedIds((prev) => {
          const newSet = new Set(prev)
          if (isFavorited) {
            newSet.add(itemId)
          } else {
            newSet.delete(itemId)
          }
          return newSet
        })
        return
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      }

      if (isFavorited) {
        // Remove favorite
        const response = await fetch(`/api/favorites?menu_item_id=${itemId}`, {
          method: 'DELETE',
          headers,
        })

        if (!response.ok) {
          // Revert on error
          setFavoritedIds((prev) => {
            const newSet = new Set(prev)
            newSet.add(itemId)
            return newSet
          })
        }
      } else {
        // Add favorite
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers,
          body: JSON.stringify({ menu_item_id: itemId }),
        })

        if (!response.ok) {
          // Revert on error
          setFavoritedIds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(itemId)
            return newSet
          })
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      // Revert on error
      setFavoritedIds((prev) => {
        const newSet = new Set(prev)
        if (isFavorited) {
          newSet.add(itemId)
        } else {
          newSet.delete(itemId)
        }
        return newSet
      })
    }
  }, [user, favoritedIds])

  const groupedItems = useMemo<CategoryMap>(() => {
    const grouped = menuItems.reduce<CategoryMap>((acc, item) => {
      const key = item.category_id || 'uncategorized'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(mapItemCategory(item, categories))
      return acc
    }, {})

    // Add favorites group
    const favoritedItems = menuItems.filter((item) => favoritedIds.has(item.id))
    if (favoritedItems.length > 0) {
      grouped['favorites'] = favoritedItems.map((item) => mapItemCategory(item, categories))
    }

    return grouped
  }, [menuItems, categories, favoritedIds])

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

    // Optimistic update: remove category from state immediately
    const categoryToDelete = categories.find((cat) => cat.id === categoryId)
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        // Restore on error
        if (categoryToDelete) {
          setCategories((prev) => [...prev, categoryToDelete])
        }
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
        // Refresh data in background to ensure consistency (silent, no loading indicator)
        fetchMenuData(false)
      } else {
        // Restore on error
        if (categoryToDelete) {
          setCategories((prev) => [...prev, categoryToDelete])
        }
        const data = await response.json()
        setTransientMessage(`Error: ${data.error || 'Unable to delete category'}`)
      }
    } catch (error) {
      // Restore on error
      if (categoryToDelete) {
        setCategories((prev) => [...prev, categoryToDelete])
      }
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

      // Close the sheet immediately for better UX
      const currentItem = editingItem
      closeItemSheet(false)
      
      // Optimistically update the UI with form data (for edits only)
      if (currentItem) {
        setMenuItems(prevItems => 
          prevItems.map(item => 
            item.id === currentItem.id 
              ? {
                  ...item,
                  title: itemForm.title,
                  description: itemForm.description,
                  price: itemForm.price ? Number(itemForm.price) : undefined,
                  category_id: itemCategory === 'none' ? undefined : itemCategory,
                }
              : item
          )
        )
      }

      // Start background upload and save process
      const savePromise = (async () => {
        let imageUrl: string | null = null

        // Upload image in background if file is selected
        if (imageFile) {
          try {
            const result = await uploadImage(imageFile, user.id, 'menu_items')
            imageUrl = result.url
          } catch (error) {
            console.error('Image upload failed:', error)
            setTransientMessage('Error uploading image. The menu item was saved but image upload failed.')
            // Continue with save even if image upload fails
          }
        } else if (itemForm.image_url && itemForm.image_url.trim()) {
          // Use existing image URL if provided and not empty
          imageUrl = itemForm.image_url.trim()
        }
        // If no image file and no existing URL, imageUrl stays null

        const payload = {
          title: itemForm.title,
          description: itemForm.description || null,
          price: itemForm.price ? Number(itemForm.price) : null,
          image_url: imageUrl, // Will be null if no image, or a valid URL string
          category_id: itemCategory === 'none' ? null : itemCategory,
          tag_ids: itemTags,
        }

        const response = await fetch('/api/menu-items', {
          method: currentItem ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(
            currentItem
              ? {
                  id: currentItem.id,
                  ...payload,
                }
              : payload
          ),
        })

        const data = await response.json()

        if (response.ok) {
          // Update the menu items with the server response (includes complete data)
          setMenuItems(prevItems => {
            if (currentItem) {
              // Update existing item
              return prevItems.map(item => 
                item.id === currentItem.id ? {
                  ...item,
                  ...data.item,
                  // Ensure tags and category are preserved
                  menu_item_tags: data.item.menu_item_tags || item.menu_item_tags,
                  menu_categories: data.item.menu_categories || item.menu_categories,
                } : item
              )
            } else {
              // Add new item at the beginning
              return [data.item, ...prevItems]
            }
          })
          
          setTransientMessage(
            currentItem ? 'Menu item updated successfully' : 'Menu item created successfully'
          )
          
          // Refresh data in background to ensure consistency (silent, no loading indicator)
          fetchMenuData(false)
        } else {
          // Revert optimistic update on error
          if (currentItem) {
            setMenuItems(prevItems => 
              prevItems.map(item => 
                item.id === currentItem.id ? currentItem : item
              )
            )
          }
          setTransientMessage(`Error: ${data.error || 'Unable to save menu item'}`)
        }
      })()

      // Don't await - let it run in background
      // Optionally show a toast notification when complete
      savePromise.catch(error => {
        console.error('Error saving menu item:', error)
        setTransientMessage('Error saving menu item')
      })

    } catch (error) {
      console.error('Error in menu item save:', error)
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

    // Optimistic update: remove item from state immediately
    const itemToDelete = menuItems.find((item) => item.id === itemId)
    setMenuItems((prev) => prev.filter((item) => item.id !== itemId))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        // Restore on error
        if (itemToDelete) {
          setMenuItems((prev) => [...prev, itemToDelete])
        }
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
        // Refresh data in background to ensure consistency (silent, no loading indicator)
        fetchMenuData(false)
      } else {
        // Restore on error
        if (itemToDelete) {
          setMenuItems((prev) => [...prev, itemToDelete])
        }
        const data = await response.json()
        setTransientMessage(`Error: ${data.error || 'Unable to delete menu item'}`)
      }
    } catch (error) {
      // Restore on error
      if (itemToDelete) {
        setMenuItems((prev) => [...prev, itemToDelete])
      }
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

  // Helper to get border color based on background
  const getBorderColor = () => {
    return isDarkBackground ? 'border-white' : 'border-black'
  }

  return (
    <section
      className="w-full py-4 sm:py-6 md:py-8"
      style={{
        backgroundColor: menuBackgroundColor,
        color: contrastColor,
        fontFamily: menuFontFamily,
      }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <header className="space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              {profileData?.avatar_url && (
                <Image
                  src={profileData.avatar_url}
                  alt={profileData.display_name || 'Menu photo'}
                  width={120}
                  height={120}
                  className="object-cover h-20 w-20 sm:h-24 sm:w-24"
                />
              )}
              <h1
                className={`font-bold leading-tight ${primaryTextClass}`}
                style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontFamily: menuFontFamily }}
              >
                {profileData?.display_name || 'Your Restaurant'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 w-full px-4">
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                  onClick={handleOpenScanMenu}
                >
                  <Scan className="h-4 w-4" />
                  <span className="hidden sm:inline">Scan Menu</span>
                  <span className="sm:hidden">Scan</span>
                </Button>
              )}
              {onEditProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                  onClick={onEditProfile}
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              )}
              <SettingsDialog triggerClassName={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`} />
              {usernameLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                  onClick={() => window.open(usernameLink, '_blank')}
                >
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">View Menu</span>
                  <span className="sm:hidden">Menu</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                onClick={openCreateCategory}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Category</span>
                <span className="sm:hidden">Category</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`${outlineButtonClass} flex items-center gap-[3px] border ${getBorderColor()}`}
                onClick={startCreateItem}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Item</span>
                <span className="sm:hidden">Item</span>
              </Button>
            </div>

            {message && (
              <div
                className={`max-w-2xl border px-3 sm:px-4 py-2 text-xs sm:text-sm ${getBorderColor()} ${
                  message.toLowerCase().includes('error')
                    ? isDarkBackground
                      ? 'bg-red-900/30 text-red-200'
                      : 'bg-red-50 text-red-700'
                    : isDarkBackground
                      ? 'bg-emerald-900/30 text-emerald-200'
                      : 'bg-emerald-50 text-emerald-700'
                }`}
                role="status"
              >
                {message}
              </div>
            )}
          </div>
        </header>

        <div className="mt-6 sm:mt-8 md:mt-12 space-y-4 sm:space-y-6 md:space-y-8">
          {loading ? (
            <div
              className={`flex flex-col items-center justify-center border border-dashed ${getBorderColor()} py-12 sm:py-16 md:py-20 ${
                isDarkBackground ? 'bg-white/5' : 'bg-white/60'
              }`}
            >
              <div className={`h-8 w-8 sm:h-12 sm:w-12 animate-spin border ${getBorderColor()} border-t-transparent`}></div>
              <p className={`mt-3 sm:mt-4 text-xs sm:text-sm ${secondaryTextClass}`}>Loading your menu...</p>
            </div>
          ) : (
            <>
              {/* Our Favorites Section */}
              {groupedItems['favorites'] && groupedItems['favorites'].length > 0 && (
                <section
                  className={`border ${getBorderColor()} ${
                    isDarkBackground ? 'bg-white/5' : 'bg-white/80'
                  }`}
                >
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
                    <button
                      type="button"
                      className={`w-full flex items-start justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass}`}
                      onClick={() => toggleCategory('favorites')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleCategory('favorites')
                        }
                      }}
                    >
                      <div>
                        <h2
                          className={`text-lg sm:text-xl md:text-2xl font-semibold ${primaryTextClass}`}
                          style={{ fontFamily: menuFontFamily }}
                        >
                          Our Favorites
                        </h2>
                        <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>
                          {groupedItems['favorites'].length} item{groupedItems['favorites'].length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="mt-1">
                        {expandedCategories['favorites'] ? (
                          <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </span>
                    </button>
                  </div>

                  {expandedCategories['favorites'] && (
                    <div className={`border-t ${getBorderColor()} px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6`}>
                      {groupedItems['favorites'].length === 0 ? (
                        <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                          No favorited items.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                          {groupedItems['favorites'].map((item) => (
                            <div
                              key={item.id}
                              className={`group relative flex flex-col cursor-pointer border ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${
                                isDarkBackground ? 'bg-white/5' : 'bg-white'
                              }`}
                              onClick={() => setSelectedItem(item)}
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
                                    className={`font-semibold text-xs sm:text-sm md:text-base ${primaryTextClass}`}
                                    style={{ fontFamily: menuFontFamily }}
                                  >
                                    {item.title}
                                  </h3>
                                </div>
                                <div className="flex items-center justify-between gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleFavorite(item.id)
                                    }}
                                    className={`p-1 transition-colors ${primaryTextClass} hover:opacity-70`}
                                    aria-label={favoritedIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <Star
                                      className={`h-3 w-3 sm:h-4 sm:w-4 ${favoritedIds.has(item.id) ? 'fill-current' : ''}`}
                                    />
                                  </button>
                                  <div className="flex gap-1 sm:gap-2">
                                    <Button
                                      size="icon-sm"
                                      variant="outline"
                                      className={`${outlineButtonClass} border ${getBorderColor()}`}
                                      onClick={() => startEditItem(item)}
                                    >
                                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="outline"
                                      className={`${outlineButtonClass} border ${getBorderColor()}`}
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Regular Categories */}
              {categorySections.length > 0 && (
                categorySections.map(({ category, items }) => {
              const isOpen = expandedCategories[category.id]
              const itemCount = items.length

              return (
                <section
                  key={category.id}
                  className={`border ${getBorderColor()} ${
                    isDarkBackground ? 'bg-white/5' : 'bg-white/80'
                  }`}
                >
                  <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
                    <button
                      type="button"
                      className={`w-full flex items-start justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass}`}
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
                          className={`text-lg sm:text-xl md:text-2xl font-semibold ${primaryTextClass}`}
                          style={{ fontFamily: menuFontFamily }}
                        >
                          {category.name}
                        </h2>
                        <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>
                          {itemCount} item{itemCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="mt-1">
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineButtonClass} flex items-center gap-1 border ${getBorderColor()}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          startCreateItem()
                          setItemCategory(category.id)
                        }}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Item</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineButtonClass} flex items-center gap-1 border ${getBorderColor()}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditCategory(category)
                        }}
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`${outlineButtonClass} flex items-center gap-1 border ${getBorderColor()}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteCategory(category.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Delete</span>
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className={`border-t ${getBorderColor()} px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6`}>
                      {itemCount === 0 ? (
                        <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                          No menu items yet. Use the New Item button to add your first dish.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className={`group relative flex flex-col cursor-pointer border ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${
                                isDarkBackground ? 'bg-white/5' : 'bg-white'
                              }`}
                              onClick={() => setSelectedItem(item)}
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
                                    className={`font-semibold text-xs sm:text-sm md:text-base ${primaryTextClass}`}
                                    style={{ fontFamily: menuFontFamily }}
                                  >
                                    {item.title}
                                  </h3>
                                </div>
                                <div className="flex items-center justify-between gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleFavorite(item.id)
                                    }}
                                    className={`p-1 transition-colors ${primaryTextClass} hover:opacity-70`}
                                    aria-label={favoritedIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                                  >
                                    <Star
                                      className={`h-3 w-3 sm:h-4 sm:w-4 ${favoritedIds.has(item.id) ? 'fill-current' : ''}`}
                                    />
                                  </button>
                                  <div className="flex gap-1 sm:gap-2">
                                    <Button
                                      size="icon-sm"
                                      variant="outline"
                                      className={`${outlineButtonClass} border ${getBorderColor()}`}
                                      onClick={() => startEditItem(item)}
                                    >
                                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="outline"
                                      className={`${outlineButtonClass} border ${getBorderColor()}`}
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
                  )
                })
              )}

              {/* Uncategorized Section */}
              {uncategorizedItems.length > 0 && categorySections.length === 0 && (
            <section
              className={`border ${getBorderColor()} ${
                isDarkBackground ? 'bg-white/5' : 'bg-white'
              }`}
            >
              <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 md:gap-5 mb-4 sm:mb-5 md:mb-6">
                  <div>
                    <h2
                      className={`text-lg sm:text-xl md:text-2xl font-semibold ${primaryTextClass}`}
                      style={{ fontFamily: menuFontFamily }}
                    >
                      Menu Items
                    </h2>
                    <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>
                      Organize with categories whenever you are ready.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className={`${outlineButtonClass} border ${getBorderColor()}`}
                    onClick={startCreateItem}
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Add Item</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                  {uncategorizedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative flex flex-col cursor-pointer border ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${
                        isDarkBackground ? 'bg-white/5' : 'bg-white'
                      }`}
                      onClick={() => setSelectedItem(item)}
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
                        <div className="flex items-center justify-between mb-2">
                          <h3
                            className={`font-semibold text-xs sm:text-sm md:text-base flex-1 ${primaryTextClass}`}
                            style={{ fontFamily: menuFontFamily }}
                          >
                            {item.title}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(item.id)
                            }}
                            className={`p-1 transition-colors ${
                              favoritedIds.has(item.id)
                                ? isDarkBackground
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-yellow-600 hover:text-yellow-700'
                                : isDarkBackground
                                  ? 'text-white/40 hover:text-white/60'
                                  : 'text-slate-400 hover:text-slate-600'
                            }`}
                            aria-label={favoritedIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star
                              className={`h-3 w-3 sm:h-4 sm:w-4 ${favoritedIds.has(item.id) ? 'fill-current' : ''}`}
                            />
                          </button>
                        </div>
                        <div className="flex justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className={`${outlineButtonClass} border ${getBorderColor()}`}
                            onClick={() => startEditItem(item)}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className={`${outlineButtonClass} border ${getBorderColor()}`}
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
              )}

              {/* Empty State */}
              {categorySections.length === 0 && uncategorizedItems.length === 0 && (
                <div
                  className={`border border-dashed ${getBorderColor()} py-12 sm:py-14 md:py-16 text-center ${
                    isDarkBackground ? 'bg-white/5' : 'bg-white/60'
                  }`}
                >
                  <h2 className={`text-lg sm:text-xl md:text-2xl font-semibold ${primaryTextClass}`}>
                    Organize your menu with categories
                  </h2>
                  <p className={`mt-2 text-xs sm:text-sm ${mutedTextClass}`}>
                    Create a menu category to get started. Menu items appear here once created.
                  </p>
                  <Button
                    className={`mt-4 sm:mt-6 ${accentButtonClass} border ${getBorderColor()}`}
                    onClick={openCreateCategory}
                  >
                    Add your first category
                  </Button>
                </div>
              )}

              {/* Uncategorized section when there are categories */}
              {categorySections.length > 0 && uncategorizedItems.length > 0 && (
            <section
              className={`border ${getBorderColor()} ${
                isDarkBackground ? 'bg-white/5' : 'bg-white/80'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                className={`w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 flex items-start justify-between text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass}`}
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
                    className={`text-lg sm:text-xl md:text-2xl font-semibold ${primaryTextClass}`}
                    style={{ fontFamily: menuFontFamily }}
                  >
                    Uncategorized
                  </h2>
                  <p className={`text-xs sm:text-sm mt-1 ${mutedTextClass}`}>
                    {uncategorizedItems.length} item
                    {uncategorizedItems.length === 1 ? '' : 's'}
                  </p>
                </div>
                {uncategorizedOpen ? (
                  <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>

              {uncategorizedOpen && (
                <div className={`border-t ${getBorderColor()} px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6`}>
                  {uncategorizedItems.length === 0 ? (
                    <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                      No uncategorized items.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                      {uncategorizedItems.map((item) => (
                        <div
                          key={item.id}
                          className={`group relative flex flex-col cursor-pointer border ${getBorderColor()} hover:opacity-80 transition-opacity duration-200 ${
                            isDarkBackground ? 'bg-white/5' : 'bg-white'
                          }`}
                          onClick={() => setSelectedItem(item)}
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
                            <div className="flex items-center justify-between mb-2">
                              <h3
                                className={`font-semibold text-xs sm:text-sm md:text-base flex-1 ${primaryTextClass}`}
                                style={{ fontFamily: menuFontFamily }}
                              >
                                {item.title}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavorite(item.id)
                                }}
                                className={`p-1 transition-colors ${
                                  favoritedIds.has(item.id)
                                    ? isDarkBackground
                                      ? 'text-yellow-400 hover:text-yellow-300'
                                      : 'text-yellow-600 hover:text-yellow-700'
                                    : isDarkBackground
                                      ? 'text-white/40 hover:text-white/60'
                                      : 'text-slate-400 hover:text-slate-600'
                                }`}
                                aria-label={favoritedIds.has(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Star
                                  className={`h-3 w-3 sm:h-4 sm:w-4 ${favoritedIds.has(item.id) ? 'fill-current' : ''}`}
                                />
                              </button>
                            </div>
                            <div className="flex justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon-sm"
                                variant="outline"
                                className={`${outlineButtonClass} border ${getBorderColor()}`}
                                onClick={() => startEditItem(item)}
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="outline"
                                className={`${outlineButtonClass} border ${getBorderColor()}`}
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
              )}
            </>
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
          className={`sm:max-w-md border ${getBorderColor()}`}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <DialogHeader className="pb-0">
            <DialogTitle className="text-base sm:text-lg">{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm pb-0">
              {editingCategory
                ? 'Update the category name. Menu items remain in the category.'
                : 'Create a category to group menu items.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="pt-0 space-y-2 sm:space-y-3">
            <Input
              id="category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="e.g. Starters"
              required
              className="border"
              style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={`${outlineButtonClass} border ${getBorderColor()}`}
                onClick={() => {
                  setIsCategoryDialogOpen(false)
                  resetCategoryDialog()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className={`${accentButtonClass} border ${getBorderColor()}`}>
                {editingCategory ? 'Save changes' : 'Create category'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={isItemSheetOpen} onOpenChange={closeItemSheet}>
        <SheetContent
          side="right"
          className={`!w-full sm:!w-3/4 sm:max-w-lg overflow-hidden border-l ${getBorderColor()}`}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <SheetHeader className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 border-b" style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
            <SheetTitle className="text-base sm:text-lg md:text-xl" style={{ color: contrastColor }}>
              {editingItem ? 'Edit Menu Item' : 'Create Menu Item'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={upsertMenuItem} className="flex flex-col gap-4 sm:gap-5 md:gap-6 px-3 sm:px-4 md:px-6 pb-6 sm:pb-8 max-h-[85vh] sm:max-h-[75vh] overflow-y-auto">
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="item-title" className="text-sm sm:text-base font-medium">Title</Label>
              <Input
                id="item-title"
                value={itemForm.title}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="e.g. Truffle Fries"
                required
                className="h-10 sm:h-12 text-sm sm:text-base border"
                style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="item-description" className="text-sm sm:text-base font-medium">Description</Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Describe the dish and highlight key details."
                rows={5}
                className="text-sm sm:text-base min-h-[100px] sm:min-h-[120px] border"
                style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="item-price" className="text-sm sm:text-base font-medium">Price</Label>
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
                  className="h-10 sm:h-12 text-sm sm:text-base border"
                  style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                />
              </div>

              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="item-category" className="text-sm sm:text-base font-medium">Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger id="item-category" className="h-10 sm:h-12 text-sm sm:text-base border" style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
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

            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm sm:text-base font-medium">Dietary tags</Label>
              {tags.length === 0 ? (
                <p className={`text-xs sm:text-sm ${mutedTextClass}`}>
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
                        className={`flex items-center gap-2 border ${getBorderColor()}`}
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

            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="item-image" className="text-sm sm:text-base font-medium">Menu photo</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
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
                  className="h-10 sm:h-12 text-xs sm:text-sm border"
                  style={{ borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}
                />
                {itemForm.image_url && !imageFile && (
                  <Button
                    type="button"
                    variant="outline"
                    className={`${outlineButtonClass} h-10 sm:h-12 px-3 sm:px-4 border ${getBorderColor()}`}
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
                <div className={`text-xs sm:text-sm ${mutedTextClass}`}>
                  {progress.message} ({Math.round(progress.progress)}%)
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4">
              <Button type="submit" className={`${accentButtonClass} flex items-center justify-center gap-2 h-10 sm:h-12 text-sm sm:text-base font-medium border ${getBorderColor()}`}>
                <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                {editingItem ? 'Save menu item' : 'Create menu item'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`${outlineButtonClass} h-10 sm:h-12 text-sm sm:text-base font-medium border ${getBorderColor()}`}
                onClick={() => closeItemSheet(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Menu Item Details Popup */}
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
            className="relative border shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            style={{
              backgroundColor: menuBackgroundColor,
              color: contrastColor,
              borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-heading"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-2 border ${getBorderColor()} transition-colors z-10 ${
                isDarkBackground 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              aria-label="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Content */}
            <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className={`relative h-48 sm:h-64 w-full md:h-full md:min-h-[24rem] border-b md:border-b-0 md:border-r ${getBorderColor()}`}>
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
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2">
                    <h2
                      id="menu-item-heading"
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
                          borderColor: isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                        }}
                      >
                        {selectedItem.menu_categories.name}
                      </Badge>
                    )}
                  </div>
                  {typeof selectedItem.price === 'number' && (
                    <div className={`text-lg sm:text-xl font-semibold ${primaryTextClass}`}>
                      ${selectedItem.price.toFixed(2)}
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
                          className="text-xs border"
                          style={buildTagStyles(itemTag.tags.name, { isDarkBackground })}
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
    </section>
  )
}

