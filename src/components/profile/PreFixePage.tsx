'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Plus, Trash2, Upload, ChevronDown, ChevronRight, X, Search, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useAuth } from '@/contexts/AuthContext'
import { getAllergenBorderColor } from '@/lib/utils'
import { glassCardStyle } from '@/lib/glass-styles'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Tag { id: number; name: string }

interface PreFixeItem {
  id: string
  title: string
  description: string | null
  image_url: string | null
  prefxe_item_tags?: { tag_id: number; tags: Tag }[]
}

interface ExistingMenuItem {
  id: string
  title: string
  description: string | null
  image_url: string | null
  menu_item_tags?: { tags: Tag }[]
}

interface PreFixeCourse {
  id: string
  name: string
  sort_order: number
  prefxe_items: PreFixeItem[]
}

interface PreFixeMenu {
  id: string
  title: string
  description: string | null
  price: number | null
  start_time: string | null
  end_time: string | null
  days_of_week: number[]
  is_active: boolean
  prefxe_courses: PreFixeCourse[]
}

export function PreFixePage() {
  const { user } = useAuth()
  const { uploadImage, uploading } = useImageUpload()
  const [menus, setMenus] = useState<PreFixeMenu[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  const [itemSheet, setItemSheet] = useState<{ courseId: string; item?: PreFixeItem } | null>(null)
  const [itemForm, setItemForm] = useState({ title: '', description: '', image_url: '', tag_ids: [] as number[] })
  const [menuForm, setMenuForm] = useState<Partial<PreFixeMenu> | null>(null)
  const [existingItems, setExistingItems] = useState<ExistingMenuItem[]>([])
  const [existingItemsLoaded, setExistingItemsLoaded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase!.auth.getSession()
    return session?.access_token
  }

  // Initial load: only pre fixe menus + allergen tags. The full menu-item list
  // (for "Add from existing") is fetched lazily the first time the picker opens.
  const fetchData = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const [menuRes, tagRes] = await Promise.all([
      fetch('/api/prefxe', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/tags', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const menuData = await menuRes.json()
    const tagData = await tagRes.json()
    if (menuRes.ok) setMenus(menuData.menus || [])
    if (tagRes.ok) setTags(tagData.tags || [])
    setLoading(false)
  }, [])

  const loadExistingItems = useCallback(async () => {
    if (existingItemsLoaded) return
    setPickerLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch('/api/menu-items', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setExistingItems(data.items || [])
        setExistingItemsLoaded(true)
      }
    } finally {
      setPickerLoading(false)
    }
  }, [existingItemsLoaded])

  useEffect(() => { fetchData() }, [fetchData])

  const selectedMenu = menus.find((m) => m.id === selectedMenuId)

  // Helper: apply an updater to the courses of the currently selected menu.
  const updateSelectedMenuCourses = useCallback(
    (updater: (courses: PreFixeCourse[]) => PreFixeCourse[]) => {
      setMenus((prev) =>
        prev.map((m) =>
          m.id === selectedMenuId ? { ...m, prefxe_courses: updater(m.prefxe_courses || []) } : m
        )
      )
    },
    [selectedMenuId]
  )

  const resolveItemTags = useCallback(
    (tagIds: number[]) =>
      tagIds
        .map((tagId) => {
          const tag = tags.find((t) => t.id === tagId)
          return tag ? { tag_id: tag.id, tags: tag } : null
        })
        .filter((t): t is { tag_id: number; tags: Tag } => t !== null),
    [tags]
  )

  const saveMenuMeta = async () => {
    if (!menuForm?.title?.trim()) return
    const form = menuForm
    const token = await getToken()
    if (!token) return

    if (form.id) {
      // Optimistic edit: patch the menu in place immediately.
      const snapshot = menus
      setMenus((prev) => prev.map((m) => (m.id === form.id ? { ...m, ...form } as PreFixeMenu : m)))
      setMenuForm(null)
      const res = await fetch('/api/prefxe', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        setMenus(snapshot)
        alert('Could not save changes. Please try again.')
      }
    } else {
      // Create needs the server-generated id, so await the response, then
      // append it locally instead of refetching the whole list.
      const res = await fetch('/api/prefxe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        const newMenu: PreFixeMenu = { ...(data.menu), prefxe_courses: [] }
        setMenus((prev) => [...prev, newMenu])
        setSelectedMenuId(newMenu.id)
        setMenuForm(null)
      } else {
        alert('Could not create menu. Please try again.')
      }
    }
  }

  const addCourse = async () => {
    if (!selectedMenuId) return
    const name = prompt('Course name (e.g. Appetizer):')
    if (!name?.trim()) return
    const token = await getToken()
    if (!token) return

    // Optimistically add a placeholder course, then reconcile its real id.
    const tempId = `temp-${Date.now()}`
    const sortOrder = selectedMenu?.prefxe_courses?.length || 0
    updateSelectedMenuCourses((courses) => [
      ...courses,
      { id: tempId, name: name.trim(), sort_order: sortOrder, prefxe_items: [] },
    ])
    setExpandedCourses((prev) => new Set(prev).add(tempId))

    const res = await fetch('/api/prefxe/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_id: selectedMenuId, name: name.trim() }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.course) {
      updateSelectedMenuCourses((courses) =>
        courses.map((c) => (c.id === tempId ? { ...c, id: data.course.id } : c))
      )
      setExpandedCourses((prev) => {
        const next = new Set(prev)
        next.delete(tempId)
        next.add(data.course.id)
        return next
      })
    } else {
      updateSelectedMenuCourses((courses) => courses.filter((c) => c.id !== tempId))
      alert('Could not add course. Please try again.')
    }
  }

  const openItemSheet = (courseId: string, item?: PreFixeItem) => {
    setPickerOpen(false)
    setPickerQuery('')
    setItemSheet({ courseId, item })
    setItemForm(
      item
        ? {
            title: item.title,
            description: item.description || '',
            image_url: item.image_url || '',
            tag_ids: item.prefxe_item_tags?.map((t) => t.tag_id) || [],
          }
        : { title: '', description: '', image_url: '', tag_ids: [] }
    )
  }

  const closeItemSheet = () => {
    setItemSheet(null)
    setPickerOpen(false)
    setPickerQuery('')
  }

  const applyExistingItem = (existing: ExistingMenuItem) => {
    setItemForm({
      title: existing.title,
      description: existing.description || '',
      image_url: existing.image_url || '',
      tag_ids: existing.menu_item_tags?.map((t) => t.tags.id).filter((id): id is number => id != null) || [],
    })
    setPickerOpen(false)
    setPickerQuery('')
  }

  const saveItem = async () => {
    if (!itemSheet || !itemForm.title.trim() || savingItem) return
    const { courseId, item: editingItem } = itemSheet
    setSavingItem(true)

    const payload = {
      course_id: courseId,
      title: itemForm.title.trim(),
      description: itemForm.description,
      image_url: itemForm.image_url || null,
      tag_ids: itemForm.tag_ids,
    }
    const optimisticTags = resolveItemTags(itemForm.tag_ids)

    try {
      const token = await getToken()
      if (!token) return

      if (editingItem?.id) {
        // Optimistic edit
        const snapshot = menus
        updateSelectedMenuCourses((courses) =>
          courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  prefxe_items: c.prefxe_items.map((it) =>
                    it.id === editingItem.id
                      ? {
                          ...it,
                          title: payload.title,
                          description: payload.description,
                          image_url: payload.image_url,
                          prefxe_item_tags: optimisticTags,
                        }
                      : it
                  ),
                }
              : c
          )
        )
        closeItemSheet()
        const res = await fetch('/api/prefxe/items', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        })
        if (!res.ok) {
          setMenus(snapshot)
          alert('Could not save item. Please try again.')
        }
      } else {
        // Optimistic add with a temporary id, then swap in the real id.
        const tempId = `temp-${Date.now()}`
        const optimisticItem: PreFixeItem = {
          id: tempId,
          title: payload.title,
          description: payload.description,
          image_url: payload.image_url,
          prefxe_item_tags: optimisticTags,
        }
        updateSelectedMenuCourses((courses) =>
          courses.map((c) =>
            c.id === courseId ? { ...c, prefxe_items: [...c.prefxe_items, optimisticItem] } : c
          )
        )
        closeItemSheet()
        const res = await fetch('/api/prefxe/items', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.item) {
          updateSelectedMenuCourses((courses) =>
            courses.map((c) =>
              c.id === courseId
                ? {
                    ...c,
                    prefxe_items: c.prefxe_items.map((it) =>
                      it.id === tempId ? { ...it, id: data.item.id } : it
                    ),
                  }
                : c
            )
          )
        } else {
          updateSelectedMenuCourses((courses) =>
            courses.map((c) =>
              c.id === courseId
                ? { ...c, prefxe_items: c.prefxe_items.filter((it) => it.id !== tempId) }
                : c
            )
          )
          alert('Could not add item. Please try again.')
        }
      }
    } finally {
      setSavingItem(false)
    }
  }

  const deleteItem = async (id: string) => {
    const token = await getToken()
    if (!token) return
    // Optimistic remove with revert on failure.
    const snapshot = menus
    updateSelectedMenuCourses((courses) =>
      courses.map((c) => ({ ...c, prefxe_items: c.prefxe_items.filter((it) => it.id !== id) }))
    )
    const res = await fetch(`/api/prefxe/items?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setMenus(snapshot)
      alert('Could not delete item. Please try again.')
    }
  }

  const deleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`Delete the "${courseName}" course and all of its items? This cannot be undone.`)) return
    const token = await getToken()
    if (!token) return
    const snapshot = menus
    updateSelectedMenuCourses((courses) => courses.filter((c) => c.id !== courseId))
    const res = await fetch(`/api/prefxe/courses?id=${courseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setMenus(snapshot)
      alert('Could not delete course. Please try again.')
    }
  }

  const deleteMenu = async (id: string) => {
    const token = await getToken()
    if (!token) return
    const snapshot = menus
    setMenus((prev) => prev.filter((m) => m.id !== id))
    if (selectedMenuId === id) setSelectedMenuId(null)
    const res = await fetch(`/api/prefxe?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setMenus(snapshot)
      alert('Could not delete menu. Please try again.')
    }
  }

  const handleItemPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const result = await uploadImage(file, user.id, 'menu_items')
    setItemForm((f) => ({ ...f, image_url: result.url }))
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  if (menuForm) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-28 lg:pb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{menuForm.id ? 'Edit' : 'New'} Pre Fixe Menu</h2>
          <Button variant="ghost" onClick={() => setMenuForm(null)}>Cancel</Button>
        </div>
        <div className="p-4 space-y-4 rounded-xl" style={glassCardStyle}>
          <div><Label>Title</Label><Input value={menuForm.title || ''} onChange={(e) => setMenuForm({ ...menuForm, title: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea rows={3} value={menuForm.description || ''} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} /></div>
          <div><Label>Price ($)</Label><Input type="number" step="0.01" value={menuForm.price ?? ''} onChange={(e) => setMenuForm({ ...menuForm, price: parseFloat(e.target.value) || null })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start</Label><Input type="time" value={menuForm.start_time?.slice(0, 5) || ''} onChange={(e) => setMenuForm({ ...menuForm, start_time: e.target.value })} /></div>
            <div><Label>End</Label><Input type="time" value={menuForm.end_time?.slice(0, 5) || ''} onChange={(e) => setMenuForm({ ...menuForm, end_time: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => (
              <button key={label} type="button" onClick={() => {
                const days = menuForm.days_of_week || []
                setMenuForm({ ...menuForm, days_of_week: days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort() })
              }} className={`px-3 py-1 rounded-full text-xs border ${menuForm.days_of_week?.includes(i) ? 'bg-blue-500 text-white' : 'bg-white/60'}`}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={menuForm.is_active !== false} onCheckedChange={(v) => setMenuForm({ ...menuForm, is_active: v })} />
            <Label>Active on homepage</Label>
          </div>
          <Button onClick={saveMenuMeta} className="w-full">Save Menu</Button>
        </div>
      </div>
    )
  }

  if (!selectedMenuId || !selectedMenu) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-28 lg:pb-8">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold">Pre Fixe Menus</h2>
          <Button size="sm" onClick={() => setMenuForm({ title: '', description: '', price: null, days_of_week: [0, 1, 2, 3, 4, 5, 6], is_active: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {menus.map((m) => (
          <div key={m.id} className="rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-white/40" style={glassCardStyle} onClick={() => setSelectedMenuId(m.id)}>
            <div>
              <p className="font-semibold">{m.title}</p>
              {m.price != null && <p className="text-sm text-gray-500">${Number(m.price).toFixed(2)}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setMenuForm(m) }}>Edit</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteMenu(m.id) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
          </div>
        ))}
        {menus.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No pre fixe menus yet.</p>}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 pb-28 lg:pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelectedMenuId(null)}>← Back</Button>
        <h2 className="text-xl font-semibold flex-1 truncate">{selectedMenu.title}</h2>
        <Button variant="ghost" size="sm" onClick={() => setMenuForm(selectedMenu)}>Edit Info</Button>
      </div>

      {(selectedMenu.prefxe_courses || []).map((course) => {
        const expanded = expandedCourses.has(course.id)
        return (
          <div key={course.id} className="rounded-xl overflow-hidden" style={glassCardStyle}>
            <div className="flex items-center">
              <button
                type="button"
                className="flex-1 flex items-center gap-2 p-4 text-left font-semibold min-w-0"
                onClick={() => setExpandedCourses((prev) => {
                  const next = new Set(prev)
                  if (next.has(course.id)) next.delete(course.id)
                  else next.add(course.id)
                  return next
                })}
              >
                {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <span className="truncate">{course.name}</span>
                <span className="text-xs text-gray-400 font-normal ml-auto flex-shrink-0">{course.prefxe_items?.length || 0} items</span>
              </button>
              <button
                type="button"
                className="p-4 flex-shrink-0 text-red-500 hover:text-red-600"
                onClick={() => deleteCourse(course.id, course.name)}
                aria-label={`Delete ${course.name} course`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {expanded && (
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(course.prefxe_items || []).map((item) => (
                    <div key={item.id} className="rounded-lg border border-black/8 overflow-hidden bg-white/50">
                      <div className="relative aspect-square bg-gray-100">
                        {item.image_url ? <Image src={item.image_url} alt="" fill className="object-cover" /> : <div className="flex items-center justify-center h-full">🍽️</div>}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold truncate">{item.title}</p>
                        <div className="flex gap-1 mt-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => openItemSheet(course.id, item)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => deleteItem(item.id)} aria-label="Delete item"><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => openItemSheet(course.id)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
            )}
          </div>
        )
      })}

      <Button variant="outline" onClick={addCourse} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Course</Button>

      <Sheet open={!!itemSheet} onOpenChange={(open) => { if (!open) closeItemSheet() }}>
        <SheetContent
          side="bottom"
          className="w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:max-w-lg border-0 sm:border p-0 gap-0 sm:rounded-2xl overflow-hidden sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 [&>button]:hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-black/10 flex-shrink-0">
            <Button type="button" variant="ghost" className="px-2 -ml-2 text-base font-normal" onClick={closeItemSheet}>
              Cancel
            </Button>
            <SheetTitle className="text-base sm:text-lg font-semibold">
              {pickerOpen ? 'Choose Item' : itemSheet?.item ? 'Edit Item' : 'Add Item'}
            </SheetTitle>
            {pickerOpen ? (
              <Button type="button" variant="ghost" className="px-2 -mr-2 text-base font-normal" onClick={() => setPickerOpen(false)}>
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="px-2 -mr-2 text-base font-semibold text-blue-500 hover:text-blue-600"
                onClick={saveItem}
                disabled={uploading || savingItem || !itemForm.title.trim()}
              >
                {savingItem ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {pickerOpen ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    autoFocus
                    placeholder="Search your menu items..."
                    className="pl-9"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                  />
                </div>
                {pickerLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  </div>
                ) : existingItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No menu items found. Create items on your menu first.</p>
                ) : (
                  <div className="space-y-2">
                    {existingItems
                      .filter((it) => it.title.toLowerCase().includes(pickerQuery.toLowerCase()))
                      .map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => applyExistingItem(it)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg border border-black/8 bg-white/60 hover:bg-white text-left"
                        >
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                            {it.image_url ? (
                              <Image src={it.image_url} alt="" fill className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon className="h-5 w-5" /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{it.title}</p>
                            {it.description && <p className="text-xs text-gray-400 truncate">{it.description}</p>}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {!itemSheet?.item && (
                  <Button type="button" variant="outline" className="w-full" onClick={() => { setPickerQuery(''); setPickerOpen(true); loadExistingItems() }}>
                    <Plus className="h-4 w-4 mr-1" /> Add from existing menu
                  </Button>
                )}
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} placeholder="e.g. Caesar Salad" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={3} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Describe this course item..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Photo</Label>
                  {itemForm.image_url ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                      <Image src={itemForm.image_url} alt="" fill className="object-cover" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"
                        onClick={() => setItemForm({ ...itemForm, image_url: '' })}
                        aria-label="Remove photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex w-32 h-32 border-2 border-dashed rounded-lg items-center justify-center cursor-pointer hover:bg-gray-50">
                      {uploading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      ) : (
                        <Upload className="h-5 w-5 text-gray-400" />
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleItemPhoto} disabled={uploading} />
                    </label>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Allergens</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className={`cursor-pointer ${itemForm.tag_ids.includes(tag.id) ? 'bg-blue-50' : ''}`}
                        style={{ borderColor: getAllergenBorderColor(tag.name) }}
                        onClick={() => setItemForm({
                          ...itemForm,
                          tag_ids: itemForm.tag_ids.includes(tag.id)
                            ? itemForm.tag_ids.filter((id) => id !== tag.id)
                            : [...itemForm.tag_ids, tag.id],
                        })}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
