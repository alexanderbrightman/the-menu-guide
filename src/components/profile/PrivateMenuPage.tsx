
'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, MenuCategory, MenuItemWithRelations, Tag as TagType } from '@/lib/supabase'
import { formatPrice } from '@/lib/currency'
import { useImageUpload } from '@/hooks/useImageUpload'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Tag } from 'lucide-react'
import { X, Upload, AlertCircle, Check } from 'lucide-react'

import { useMenuTheme } from '@/hooks/useMenuTheme'
import { MenuHeader } from './menu-blocks/MenuHeader'
import { MenuCategorySection } from './menu-blocks/MenuCategorySection'
import { getAllergenBorderColor } from '@/lib/utils'

// Drag and Drop Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { SortableItem } from '@/components/ui/sortable-item';

type CategoryMap = Record<string, MenuItemWithRelations[]>

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

  const { uploading, uploadImage, resetProgress } = useImageUpload()

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    type: 'item' | 'category'
    id: string
    title: string
  }>({ isOpen: false, type: 'item', id: '', title: '' })

  // Sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Enable drag after moving 10px
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Press and hold for 250ms to activate
        tolerance: 8, // Allow 8px movement during hold
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use the new theme hook
  const theme = useMenuTheme(profile)
  const {
    menuBackgroundColor,
    contrastColor,
    menuFontFamily,
    primaryTextClass,
    secondaryTextClass,
    mutedTextClass,
    accentButtonClass,
    outlineButtonClass,
    getBorderColor,
    isDarkBackground,
  } = theme

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setTransientMessage = useCallback((value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setMessage(value)
    if (!value) return

    // Show errors for longer
    const duration = value.startsWith('Error') ? 10000 : 6000

    timeoutRef.current = setTimeout(() => {
      setMessage('')
      timeoutRef.current = undefined
    }, duration)
  }, [])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
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
        Authorization: `Bearer ${session.access_token} `,
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
        // Sort items by sort_order
        const sortedItems = itemsData.items.sort((a: MenuItemWithRelations, b: MenuItemWithRelations) =>
          (a.sort_order || 0) - (b.sort_order || 0)
        )
        setMenuItems(sortedItems)
      } else if (!itemsRes.ok) {
        setTransientMessage(`Error: ${itemsData.error || 'Failed to load menu items'} `)
      }

      if (categoriesRes.ok && Array.isArray(categoriesData.categories)) {
        // Sort categories by sort_order
        const sortedCategories = categoriesData.categories.sort((a: MenuCategory, b: MenuCategory) =>
          (a.sort_order || 0) - (b.sort_order || 0)
        )
        setCategories(sortedCategories)
      } else if (!categoriesRes.ok) {
        setTransientMessage(`Error: ${categoriesData.error || 'Failed to load categories'} `)
      }

      if (tagsRes.ok && Array.isArray(tagsData.tags)) {
        setTags(tagsData.tags)
      } else if (!tagsRes.ok) {
        setTransientMessage(`Error: ${tagsData.error || 'Failed to load tags'} `)
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
        Authorization: `Bearer ${session.access_token} `,
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

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Get session for auth token
    if (!supabase) {
      console.error('Supabase client not available')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      console.error('No active session')
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token} `
    }

    // Check if it's a category
    const activeCategoryIndex = categories.findIndex(c => c.id === active.id)
    const overCategoryIndex = categories.findIndex(c => c.id === over.id)

    if (activeCategoryIndex !== -1 && overCategoryIndex !== -1) {
      // Reordering categories
      const oldIndex = categories.findIndex((item) => item.id === active.id)
      const newIndex = categories.findIndex((item) => item.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(categories, oldIndex, newIndex)
        setCategories(newItems)

        // Prepare updates for API
        const updates = newItems.map((item, index) => ({
          id: item.id,
          sort_order: index
        }))

        // Call API in background
        fetch('/api/reorder', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'category', updates })
        }).then(async res => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error('Failed to save category order:', errorData.error || res.statusText)
            // Optionally revert state here
          }
        }).catch(console.error)
      }
      return
    }

    // Check if it's a menu item
    const activeItem = menuItems.find(i => i.id === active.id)
    const overItem = menuItems.find(i => i.id === over.id)

    if (activeItem && overItem) {
      // Ensure they are in the same category (or both uncategorized)
      const activeCatId = activeItem.category_id || 'uncategorized'
      const overCatId = overItem.category_id || 'uncategorized'

      if (activeCatId === overCatId) {
        const categoryItems = menuItems.filter(i => (i.category_id || 'uncategorized') === activeCatId)
        const oldSubsetIndex = categoryItems.findIndex(i => i.id === active.id)
        const newSubsetIndex = categoryItems.findIndex(i => i.id === over.id)

        if (oldSubsetIndex !== -1 && newSubsetIndex !== -1) {
          const newSubset = arrayMove(categoryItems, oldSubsetIndex, newSubsetIndex)

          // Prepare updates
          const updates = newSubset.map((item, index) => ({
            id: item.id,
            sort_order: index
          }))

          const newSortOrderMap = new Map(updates.map(u => [u.id, u.sort_order]))

          const nextItems = menuItems.map(item => {
            if (newSortOrderMap.has(item.id)) {
              return { ...item, sort_order: newSortOrderMap.get(item.id) }
            }
            return item
          })

          // Sort the whole list to ensure consistency
          const sortedNextItems = nextItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          setMenuItems(sortedNextItems)

          // Call API
          fetch('/api/reorder', {
            method: 'POST',
            headers,
            body: JSON.stringify({ type: 'item', updates })
          }).then(async res => {
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}))
              console.error('Failed to save item order:', errorData.error || res.statusText)
            }
          }).catch(console.error)
        }
      }
    }
  }, [categories, menuItems])

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
        Authorization: `Bearer ${session.access_token} `,
      }

      if (isFavorited) {
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

  const toggleAvailability = useCallback(async (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId)
    if (!item) return

    const newStatus = !(item.is_available ?? true)

    // Optimistic update
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_available: newStatus } : i)))

    if (!supabase || !user) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        // Revert
        setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_available: !newStatus } : i)))
        setTransientMessage('Error: Not authenticated')
        return
      }

      const response = await fetch('/api/menu-items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token} `,
        },
        body: JSON.stringify({ id: itemId, is_available: newStatus }),
      })

      if (!response.ok) {
        // Revert
        setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_available: !newStatus } : i)))
        const data = await response.json()
        setTransientMessage(`Error: ${data.error || 'Unable to update status'} `)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      // Revert
      setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_available: !newStatus } : i)))
      setTransientMessage('Error updating status')
    }
  }, [menuItems, user, setTransientMessage])

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
          Authorization: `Bearer ${session.access_token} `,
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
        setTransientMessage(`Error: ${data.error || 'Unable to save category'} `)
      }
    } catch (error) {
      console.error('Error saving category:', error)
      setTransientMessage('Error saving category')
    }
  }

  const handleRenameCategory = async (categoryId: string, newName: string) => {
    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      return
    }

    // Optimistic update
    const originalCategories = [...categories]
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, name: newName } : cat
    ))

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setCategories(originalCategories)
        setTransientMessage('Error: Not authenticated')
        return
      }

      const response = await fetch('/api/menu-categories', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token} `,
        },
        body: JSON.stringify({
          id: categoryId,
          name: newName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setCategories(originalCategories)
        setTransientMessage(`Error: ${data.error || 'Unable to rename category'} `)
      } else {
        setTransientMessage('Category renamed')
        // Background refresh to ensure consistency
        fetchMenuData(false)
      }
    } catch (error) {
      console.error('Error renaming category:', error)
      setCategories(originalCategories)
      setTransientMessage('Error renaming category')
    }
  }

  const promptDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return
    setDeleteConfirmation({
      isOpen: true,
      type: 'category',
      id: categoryId,
      title: category.name
    })
  }

  const executeDeleteCategory = async (categoryId: string) => {
    // Optimistic update: remove category from state immediately
    const categoryToDelete = categories.find((cat) => cat.id === categoryId)
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))

    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      if (categoryToDelete) setCategories((prev) => [...prev, categoryToDelete])
      return
    }

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
        console.error('Delete category failed:', data)
        setTransientMessage(`Error: ${data.error || 'Unable to delete category'} `)
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
            Authorization: `Bearer ${session.access_token} `,
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
          setTransientMessage(`Error: ${data.error || 'Unable to save menu item'} `)
        }
      })()

      // Don't await - let it run in background
      savePromise.catch(error => {
        console.error('Error saving menu item:', error)
        setTransientMessage('Error saving menu item')
      })

    } catch (error) {
      console.error('Error in menu item save:', error)
      setTransientMessage('Error saving menu item')
    }
  }

  const promptDeleteItem = (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId)
    if (!item) return
    setDeleteConfirmation({
      isOpen: true,
      type: 'item',
      id: itemId,
      title: item.title
    })
  }

  const executeDeleteItem = async (itemId: string) => {
    // Optimistic update: remove item from state immediately
    const itemToDelete = menuItems.find((item) => item.id === itemId)
    setMenuItems((prev) => prev.filter((item) => item.id !== itemId))

    if (!supabase) {
      setTransientMessage('Error: Supabase client not available')
      if (itemToDelete) setMenuItems((prev) => [...prev, itemToDelete])
      return
    }

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
        console.error('Delete item failed:', data)
        setTransientMessage(`Error: ${data.error || 'Unable to delete menu item'} `)
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

  const handleOpenScanMenu = useCallback(() => {
    if (typeof window === 'undefined') return
    const event = new CustomEvent('open-scan-menu')
    window.dispatchEvent(event)
  }, [])

  const handleConfirmDelete = async () => {
    if (deleteConfirmation.type === 'category') {
      await executeDeleteCategory(deleteConfirmation.id)
    } else {
      await executeDeleteItem(deleteConfirmation.id)
    }
    setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <section
          className="w-full py-4 sm:py-6 md:py-8"
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
            fontFamily: menuFontFamily,
          }}
        >
          <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <MenuHeader
              profile={profile}
              user={user}
              onEditProfile={onEditProfile}
              onScanMenu={handleOpenScanMenu}
              onNewCategory={openCreateCategory}
              onNewItem={startCreateItem}
              message={message}
              theme={theme}
            />

            <div className="mt-6 sm:mt-8 md:mt-12 space-y-4 sm:space-y-6 md:space-y-8">
              {loading ? (
                <div
                  className={`flex flex - col items - center justify - center border border - dashed ${getBorderColor()} py - 12 sm: py - 16 md: py - 20 ${isDarkBackground ? 'bg-white/5' : 'bg-white/60'
                    } `}
                >
                  <div className={`h - 8 w - 8 sm: h - 12 sm: w - 12 animate - spin border ${getBorderColor()} border - t - transparent`}></div>
                  <p className={`mt - 3 sm: mt - 4 text - xs sm: text - sm ${secondaryTextClass} `}>Loading your menu...</p>
                </div>
              ) : (
                <>
                  {/* Our Favorites Section */}
                  {groupedItems['favorites'] && groupedItems['favorites'].length > 0 && (
                    <MenuCategorySection
                      id="favorites"
                      title="Specials"
                      items={groupedItems['favorites']}
                      isOpen={expandedCategories['favorites']}
                      onToggle={() => toggleCategory('favorites')}
                      onEditItem={startEditItem}
                      onDeleteItem={promptDeleteItem}
                      onToggleFavorite={toggleFavorite}
                      onToggleAvailability={toggleAvailability}
                      onItemClick={setSelectedItem}
                      favoritedIds={favoritedIds}
                      theme={theme}
                      emptyMessage="No favorited items."
                      isSortable={false} // Favorites are auto-generated, maybe not sortable manually? Or sortable within favorites? User didn't specify. Let's disable for now to be safe.
                    />
                  )}

                  {/* Regular Categories */}
                  {categorySections.length > 0 && (
                    <SortableContext
                      items={categorySections.map(c => c.category.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4 sm:space-y-6 md:space-y-8">
                        {categorySections.map(({ category, items }) => (
                          <SortableItem key={category.id} id={category.id}>
                            <MenuCategorySection
                              id={category.id}
                              title={category.name}
                              items={items}
                              isOpen={!!expandedCategories[category.id]}
                              onToggle={() => toggleCategory(category.id)}
                              onAddItem={() => {
                                setEditingItem(null)
                                setItemForm(EMPTY_ITEM_FORM)
                                setItemCategory(category.id)
                                setItemTags([])
                                setImageFile(null)
                                setIsItemSheetOpen(true)
                                resetProgress()
                              }}
                              onRenameCategory={handleRenameCategory}
                              onDeleteCategory={() => promptDeleteCategory(category.id)}
                              onEditItem={startEditItem}
                              onDeleteItem={promptDeleteItem}
                              onToggleFavorite={toggleFavorite}
                              onToggleAvailability={toggleAvailability}
                              onItemClick={(item) => setSelectedItem(item)}
                              favoritedIds={favoritedIds}
                              theme={theme}
                              emptyMessage="No menu items yet. Use the New Item button to add your first dish."
                              isSortable={true}
                            />
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  )}

                  {/* Uncategorized Section */}
                  {uncategorizedItems.length > 0 && categorySections.length === 0 && (
                    <MenuCategorySection
                      id="uncategorized"
                      title="Menu Items"
                      items={uncategorizedItems}
                      isOpen={true} // Always open if it's the only section
                      onToggle={() => { }} // No toggle
                      onAddItem={startCreateItem}
                      onEditItem={startEditItem}
                      onDeleteItem={promptDeleteItem}
                      onToggleFavorite={toggleFavorite}
                      onToggleAvailability={toggleAvailability}
                      onItemClick={setSelectedItem}
                      favoritedIds={favoritedIds}
                      theme={theme}
                      subtitle="Organize with categories whenever you are ready."
                      isSortable={true}
                    />
                  )}

                  {/* Empty State */}
                  {categorySections.length === 0 && uncategorizedItems.length === 0 && (
                    <div
                      className={`border border - dashed ${getBorderColor()} py - 12 sm: py - 14 md: py - 16 text - center ${isDarkBackground ? 'bg-white/5' : 'bg-white/60'
                        } `}
                    >
                      <h2 className={`text - lg sm: text - xl md: text - 2xl font - semibold ${primaryTextClass} `}>
                        Organize your menu with categories
                      </h2>
                      <p className={`mt - 2 text - xs sm: text - sm ${mutedTextClass} `}>
                        Create a menu category to get started. Menu items appear here once created.
                      </p>
                      <Button
                        className={`mt - 4 sm: mt - 6 ${accentButtonClass} border ${getBorderColor()} `}
                        onClick={openCreateCategory}
                      >
                        Add your first category
                      </Button>
                    </div>
                  )}

                  {/* Uncategorized section when there are categories */}
                  {categorySections.length > 0 && uncategorizedItems.length > 0 && (
                    <MenuCategorySection
                      id="uncategorized"
                      title="Uncategorized"
                      items={uncategorizedItems}
                      isOpen={expandedCategories['uncategorized']}
                      onToggle={() => toggleCategory('uncategorized')}
                      onEditItem={startEditItem}
                      onDeleteItem={promptDeleteItem}
                      onToggleFavorite={toggleFavorite}
                      onToggleAvailability={toggleAvailability}
                      onItemClick={setSelectedItem}
                      favoritedIds={favoritedIds}
                      theme={theme}
                      emptyMessage="No uncategorized items."
                      isSortable={true}
                    />
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
              className={`sm:max-w-md border ${getBorderColor()} p-0 gap-0 overflow-hidden`}
              showCloseButton={false}
              style={{
                backgroundColor: menuBackgroundColor,
                color: contrastColor,
              }}
            >
              <form onSubmit={handleCategorySubmit} className="flex flex-col w-full">
                {/* Header - Matches Item Sheet Design */}
                <div className={`flex items-center justify-between p-4 border-b ${getBorderColor()}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsCategoryDialogOpen(false)
                      resetCategoryDialog()
                    }}
                    className="text-base font-normal hover:bg-transparent px-2 -ml-2 sm:px-4 sm:ml-0"
                    style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
                  >
                    Cancel
                  </Button>

                  <DialogTitle className={`text-base sm:text-lg font-semibold ${primaryTextClass}`}>
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </DialogTitle>

                  <Button
                    type="submit"
                    variant="ghost"
                    className="text-base font-semibold hover:bg-transparent px-2 -mr-2 sm:px-4 sm:mr-0 text-blue-500 hover:text-blue-600"
                  >
                    Save
                  </Button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4">
                  <DialogDescription className="text-xs sm:text-sm hidden">
                    {editingCategory
                      ? 'Update the category name.'
                      : 'Create a category to group menu items.'}
                  </DialogDescription>

                  <div className="space-y-2">
                    <Label htmlFor="category-name" className={primaryTextClass}>Category Name</Label>
                    <Input
                      id="category-name"
                      value={categoryName}
                      onChange={(event) => setCategoryName(event.target.value)}
                      placeholder="e.g. Starters"
                      required
                      className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                    />
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Sheet open={isItemSheetOpen} onOpenChange={closeItemSheet}>
            <SheetContent
              side="bottom"
              className={`w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-4xl border-0 sm:border ${getBorderColor()} p-0 gap-0 sm:rounded-xl overflow-hidden transition-all duration-300 ease-in-out data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-bottom-10 sm:data-[state=open]:zoom-in-95 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 [&>button]:hidden flex flex-col`}
              style={{
                backgroundColor: menuBackgroundColor,
                color: contrastColor,
              }}
            >
              <form onSubmit={upsertMenuItem} className="flex flex-col flex-1 min-h-0 w-full">
                {/* Header - Mobile & Desktop Unified (Responsive) */}
                <div className={`flex items-center justify-between p-4 border-b ${getBorderColor()}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => closeItemSheet(false)}
                    className="text-base font-normal hover:bg-transparent px-2 -ml-2 sm:px-4 sm:ml-0"
                    style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
                  >
                    Cancel
                  </Button>

                  <SheetTitle className={`text-base sm:text-lg font-semibold ${primaryTextClass}`}>
                    {editingItem ? 'Edit Item' : 'New Item'}
                  </SheetTitle>

                  <Button
                    type="submit"
                    disabled={uploading}
                    variant="ghost"
                    className="text-base font-semibold hover:bg-transparent px-2 -mr-2 sm:px-4 sm:mr-0 text-blue-500 hover:text-blue-600"
                  >
                    {uploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                  <div className="max-w-5xl mx-auto w-full">
                    <div className="flex flex-col md:grid md:grid-cols-2 md:gap-8 lg:gap-12">

                      {/* Left Column (Desktop) / Top (Mobile) - Image */}
                      <div className="space-y-4">
                        <Label className={`${primaryTextClass} text-base font-medium`}>Image</Label>
                        <div className={`h-48 sm:h-auto sm:aspect-video md:aspect-[4/3] relative rounded-lg overflow-hidden border-2 border-dashed ${getBorderColor()} bg-secondary/20 hover:bg-secondary/30 transition-colors group cursor-pointer`}>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) setImageFile(file)
                            }}
                          />
                          {(imageFile || itemForm.image_url) ? (
                            <>
                              <Image
                                src={imageFile ? URL.createObjectURL(imageFile) : itemForm.image_url}
                                alt="Preview"
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="z-20 pointer-events-none" // Events handled by parent div input
                                >
                                  Change
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="z-20"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setImageFile(null)
                                    setItemForm({ ...itemForm, image_url: '' })
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                              <Upload className={`h-8 w-8 mb-2 ${mutedTextClass}`} />
                              <p className={`text-sm ${secondaryTextClass}`}>
                                Tap to upload image
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column (Desktop) / Bottom (Mobile) - Inputs */}
                      <div className="space-y-5 sm:space-y-6 mt-6 md:mt-0">
                        <div className="space-y-2">
                          <Label htmlFor="title" className={primaryTextClass}>Item Name *</Label>
                          <Input
                            id="title"
                            value={itemForm.title}
                            onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                            placeholder="e.g., Grilled Salmon"
                            required
                            className={`h-11 border ${getBorderColor()} bg-transparent text-base`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="price" className={primaryTextClass}>Price</Label>
                            <div className="relative">
                              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedTextClass}`}>$</span>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={itemForm.price}
                                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                placeholder="0.00"
                                className={`h-11 pl-7 border ${getBorderColor()} bg-transparent text-base`}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className={primaryTextClass}>Category</Label>
                            <Select value={itemCategory} onValueChange={setItemCategory}>
                              <SelectTrigger className={`h-11 border ${getBorderColor()} bg-transparent`}>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Category</SelectItem>
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
                          <Label htmlFor="description" className={primaryTextClass}>Description</Label>
                          <Textarea
                            id="description"
                            value={itemForm.description}
                            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                            placeholder="Describe your menu item..."
                            rows={4}
                            className={`resize-none border ${getBorderColor()} bg-transparent text-base`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className={primaryTextClass}>Dietary Tags</Label>
                          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-dashed" style={{ borderColor: getBorderColor() }}>
                            {tags.map((tag) => {
                              const isSelected = itemTags.includes(tag.id)
                              const borderColor = getAllergenBorderColor(tag.name)

                              return (
                                <Badge
                                  key={tag.id}
                                  variant="outline"
                                  className={`cursor-pointer transition-all px-3 py-1.5 text-sm select-none ${isSelected ? 'ring-1 ring-offset-1' : 'hover:opacity-70'}`}
                                  onClick={() => toggleFormTag(tag.id)}
                                  style={{
                                    borderColor: borderColor || (isDarkBackground ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
                                    backgroundColor: isSelected
                                      ? (borderColor || (isDarkBackground ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'))
                                      : 'transparent',
                                    color: contrastColor
                                  }}
                                >
                                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                                  {tag.name}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </SheetContent>
          </Sheet>

          {/* Item Detail Modal - Custom Implementation matching Public Page */}
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
                aria-labelledby="private-menu-item-heading"
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
                      <div className={`flex h-full w-full items-center justify-center text-xs sm:text-sm ${secondaryTextClass}`}>
                        Photo coming soon
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 md:p-6 lg:p-8 md:overflow-y-auto md:max-h-[calc(90vh-3rem)]">
                    {/* Title and Price */}
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2">
                        <h2
                          id="private-menu-item-heading"
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
                            {/* We know mapped items have name property on menu_categories */}
                            {selectedItem.menu_categories?.name || 'Category'}
                          </Badge>
                        )}
                      </div>
                      {typeof selectedItem.price === 'number' && (
                        <div className={`text-lg sm:text-xl font-semibold ${primaryTextClass} notranslate`}>
                          {formatPrice(selectedItem.price, profile?.currency)}
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
                          {selectedItem.menu_item_tags.map((tagEntry) => (
                            <Badge
                              key={tagEntry.tags.id}
                              variant="outline"
                              className="text-xs border"
                              style={{
                                borderColor: getAllergenBorderColor(tagEntry.tags.name) || (isDarkBackground ? '#ffffff' : '#000000'),
                                color: isDarkBackground ? (getAllergenBorderColor(tagEntry.tags.name) || '#ffffff') : '#1f2937',
                                backgroundColor: isDarkBackground ? 'rgba(255,255,255,0.05)' : 'transparent',
                              }}
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {tagEntry.tags.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={`mt-4 text-[10px] leading-tight ${mutedTextClass}`}>
                      Allergen info provided by restaurant, always notify your waiter
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </DndContext>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmation.isOpen} onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent
          className={`sm:max-w-md border ${getBorderColor()}`}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${primaryTextClass}`}>
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className={secondaryTextClass}>
              Are you sure you want to delete <span className="font-semibold">{deleteConfirmation.title}</span>?
              {deleteConfirmation.type === 'category' && ' All menu items in this category will become uncategorized.'}
              <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              className={`${outlineButtonClass} border ${getBorderColor()}`}
              onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
