'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useAuth } from '@/contexts/AuthContext'
import { useMenuTheme } from '@/hooks/useMenuTheme'
import { getThemedGlassCardStyle } from '@/lib/glass-styles'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Photo {
  id?: string
  image_url: string
  sort_order: number
}

interface HappyHourMenu {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  days_of_week: number[]
  is_active: boolean
  happy_hour_photos: Photo[]
}

export function HappyHourPage() {
  const { user, profile } = useAuth()
  const theme = useMenuTheme(profile)
  const {
    isDarkBackground,
    primaryTextClass,
    mutedTextClass,
    outlineButtonClass,
    accentButtonClass,
    getBorderColor,
  } = theme
  const cardStyle = getThemedGlassCardStyle(isDarkBackground)
  const { uploadImage, uploading } = useImageUpload()
  const [menus, setMenus] = useState<HappyHourMenu[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<HappyHourMenu> | null>(null)
  const [saving, setSaving] = useState(false)

  const inputClass = isDarkBackground
    ? 'border-white/40 text-white placeholder:text-white/40 bg-white/5'
    : 'border-black/20 text-black bg-white/70'
  const dayUnselectedClass = isDarkBackground
    ? 'bg-white/10 text-white border-white/35'
    : 'bg-black/5 text-gray-700 border-black/15'
  const uploadClass = isDarkBackground
    ? 'border-white/35 hover:bg-white/10'
    : 'border-black/20 hover:bg-black/5'

  const getToken = async () => {
    const { data: { session } } = await supabase!.auth.getSession()
    return session?.access_token
  }

  const fetchMenus = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    const res = await fetch('/api/happy-hour', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) setMenus(data.menus || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMenus() }, [fetchMenus])

  const startNew = () => {
    setEditing({
      title: '',
      description: '',
      start_time: '16:00',
      end_time: '18:00',
      days_of_week: [1, 2, 3, 4, 5],
      is_active: true,
      happy_hour_photos: [],
    })
  }

  const toggleDay = (day: number) => {
    if (!editing) return
    const days = editing.days_of_week || []
    setEditing({
      ...editing,
      days_of_week: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !editing) return
    const result = await uploadImage(file, user.id, 'menu_items')
    setEditing({
      ...editing,
      happy_hour_photos: [
        ...(editing.happy_hour_photos || []),
        { image_url: result.url, sort_order: (editing.happy_hour_photos?.length || 0) },
      ],
    })
  }

  const saveMenu = async () => {
    if (!editing?.title?.trim() || saving) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) return

      const photos = (editing.happy_hour_photos || []).map((p, i) => ({
        image_url: p.image_url,
        sort_order: i,
      }))

      const payload = {
        title: editing.title,
        description: editing.description,
        start_time: editing.start_time,
        end_time: editing.end_time,
        days_of_week: editing.days_of_week,
        is_active: editing.is_active,
        photos,
      }

      const res = await fetch('/api/happy-hour', {
        method: editing.id ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editing.id ? { id: editing.id, ...payload } : payload),
      })

      if (!res.ok) {
        alert('Could not save happy hour. Please try again.')
        return
      }

      setEditing(null)
      fetchMenus()
    } finally {
      setSaving(false)
    }
  }

  const deleteMenu = async (id: string) => {
    const token = await getToken()
    if (!token) return
    const snapshot = menus
    setMenus((prev) => prev.filter((m) => m.id !== id))
    const res = await fetch(`/api/happy-hour?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setMenus(snapshot)
      alert('Could not delete happy hour. Please try again.')
    }
  }

  if (loading) {
    return <div className={`p-8 text-center ${mutedTextClass}`}>Loading...</div>
  }

  if (editing) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-28 lg:pb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className={`text-xl font-semibold ${primaryTextClass}`}>
            {editing.id ? 'Edit' : 'New'} Happy Hour
          </h2>
          <Button
            variant="ghost"
            className={`${primaryTextClass} hover:bg-transparent`}
            onClick={() => setEditing(null)}
          >
            Cancel
          </Button>
        </div>

        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className={primaryTextClass}>Title</Label>
              <Input
                className={inputClass}
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={primaryTextClass}>Description</Label>
              <Textarea
                className={inputClass}
                rows={4}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0 space-y-1.5">
                <Label className={primaryTextClass}>Start Time</Label>
                <Input
                  type="time"
                  className={`${inputClass} w-full max-w-full`}
                  value={editing.start_time?.slice(0, 5) || '16:00'}
                  onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label className={primaryTextClass}>End Time</Label>
                <Input
                  type="time"
                  className={`${inputClass} w-full max-w-full`}
                  value={editing.end_time?.slice(0, 5) || '18:00'}
                  onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className={`mb-2 block ${primaryTextClass}`}>Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      editing.days_of_week?.includes(i)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : dayUnselectedClass
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editing.is_active !== false}
                onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
              />
              <Label className={primaryTextClass}>Active on homepage</Label>
            </div>
            <div>
              <Label className={`mb-2 block ${primaryTextClass}`}>Photos</Label>
              <div className="flex flex-wrap gap-2">
                {(editing.happy_hour_photos || []).map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <Image src={photo.image_url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white"
                      onClick={() => setEditing({
                        ...editing,
                        happy_hour_photos: editing.happy_hour_photos?.filter((_, j) => j !== i),
                      })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label
                  className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${uploadClass}`}
                >
                  <Upload className={`h-5 w-5 ${isDarkBackground ? 'text-white/70' : 'text-gray-500'}`} />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <Button
              onClick={saveMenu}
              disabled={saving || uploading}
              className={`w-full ${accentButtonClass} border ${getBorderColor()}`}
            >
              {saving ? 'Saving...' : 'Save Happy Hour'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-28 lg:pb-8">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`text-xl font-semibold ${primaryTextClass}`}>Happy Hour Menus</h2>
        <Button onClick={startNew} size="sm" className={`${accentButtonClass} border ${getBorderColor()}`}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {menus.length === 0 ? (
        <p className={`${mutedTextClass} text-sm text-center py-8`}>
          No happy hour menus yet. Add one to appear on the homepage.
        </p>
      ) : (
        menus.map((menu) => (
          <div key={menu.id} className="rounded-xl p-4 flex gap-4" style={cardStyle}>
            <div
              className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ${
                isDarkBackground ? 'bg-white/10' : 'bg-gray-100'
              }`}
            >
              {menu.happy_hour_photos?.[0] ? (
                <Image src={menu.happy_hour_photos[0].image_url} alt="" fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-xl">🍸</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${primaryTextClass}`}>{menu.title}</p>
              <p className={`text-xs ${mutedTextClass}`}>
                {menu.start_time?.slice(0, 5)} – {menu.end_time?.slice(0, 5)}
              </p>
              {!menu.is_active && <span className="text-xs text-orange-500">Inactive</span>}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`${outlineButtonClass} border ${getBorderColor()}`}
                onClick={() => setEditing(menu)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`${outlineButtonClass} border ${getBorderColor()}`}
                onClick={() => deleteMenu(menu.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
