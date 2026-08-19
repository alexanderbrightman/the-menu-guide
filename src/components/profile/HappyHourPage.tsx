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
import { getThemedGlassCardStyle, floatingImageShadow } from '@/lib/glass-styles'
import { formatScheduleBadge } from '@/lib/geo'

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
    : 'border-black/15 text-black bg-white/40 backdrop-blur-xl'
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
        alert('Could not save promotion. Please try again.')
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
      alert('Could not delete promotion. Please try again.')
    }
  }

  if (loading) {
    return <div className={`p-8 text-center ${mutedTextClass}`}>Loading...</div>
  }

  if (editing) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 lg:pb-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h2 className={`text-2xl font-semibold tracking-tight ${primaryTextClass}`}>
              {editing.id ? 'Edit Promotion' : 'New Promotion'}
            </h2>
            <p className={`text-sm ${mutedTextClass}`}>
              Schedule, description, and photos for the homepage.
            </p>
          </div>
          <Button
            variant="ghost"
            className={`h-10 px-3 ${primaryTextClass} hover:bg-transparent shrink-0`}
            onClick={() => setEditing(null)}
          >
            Cancel
          </Button>
        </div>

        <div className="rounded-[22px] overflow-hidden" style={cardStyle}>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <Label className={primaryTextClass}>Title</Label>
              <Input
                className={`h-11 ${inputClass}`}
                value={editing.title || ''}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className={primaryTextClass}>Description</Label>
              <Textarea
                className={inputClass}
                rows={4}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0 space-y-2">
                <Label className={primaryTextClass}>Start Time</Label>
                <Input
                  type="time"
                  className={`h-11 ${inputClass} w-full max-w-full`}
                  value={editing.start_time?.slice(0, 5) || '16:00'}
                  onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label className={primaryTextClass}>End Time</Label>
                <Input
                  type="time"
                  className={`h-11 ${inputClass} w-full max-w-full`}
                  value={editing.end_time?.slice(0, 5) || '18:00'}
                  onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label className={`block ${primaryTextClass}`}>Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors ${
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
            <div className="flex items-center gap-3 py-1">
              <Switch
                checked={editing.is_active !== false}
                onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
              />
              <Label className={primaryTextClass}>Active on homepage</Label>
            </div>
            <div className="space-y-2.5">
              <Label className={`block ${primaryTextClass}`}>Photos</Label>
              <div className="flex flex-wrap gap-3">
                {(editing.happy_hour_photos || []).map((photo, i) => (
                  <div
                    key={i}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden"
                    style={{ boxShadow: floatingImageShadow }}
                  >
                    <Image src={photo.image_url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full text-white"
                      onClick={() => setEditing({
                        ...editing,
                        happy_hour_photos: editing.happy_hour_photos?.filter((_, j) => j !== i),
                      })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <label
                  className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${uploadClass}`}
                >
                  <Upload className={`h-5 w-5 ${isDarkBackground ? 'text-white/70' : 'text-gray-500'}`} />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <Button
              onClick={saveMenu}
              disabled={saving || uploading}
              className={`w-full h-11 rounded-full ${accentButtonClass} border ${getBorderColor()}`}
            >
              {saving ? 'Saving...' : 'Save Promotion'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-28 lg:pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className={`text-2xl font-semibold tracking-tight ${primaryTextClass}`}>
            Promotions
          </h2>
          <p className={`text-sm ${mutedTextClass}`}>
            Featured on the homepage discover tab.
          </p>
        </div>
        <Button
          onClick={startNew}
          className={`h-11 rounded-full px-5 ${accentButtonClass} border ${getBorderColor()}`}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Promotion
        </Button>
      </header>

      {menus.length === 0 ? (
        <div
          className="rounded-[22px] px-6 py-14 text-center space-y-2"
          style={cardStyle}
        >
          <p className={`text-base font-medium ${primaryTextClass}`}>No promotions yet</p>
          <p className={`text-sm ${mutedTextClass} max-w-sm mx-auto`}>
            Add a menu with hours and photos to appear under Promotions on the homepage.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="rounded-[22px] p-5 sm:p-6 flex flex-col gap-5"
              style={cardStyle}
            >
              <div className="flex gap-4 sm:gap-5">
                <div
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 ${
                    isDarkBackground ? 'bg-white/10' : 'bg-black/[0.04]'
                  }`}
                  style={{ boxShadow: floatingImageShadow }}
                >
                  {menu.happy_hour_photos?.[0] ? (
                    <Image
                      src={menu.happy_hour_photos[0].image_url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-2xl opacity-70">
                      🍸
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                  <h3
                    className={`text-lg font-semibold tracking-tight truncate ${primaryTextClass}`}
                  >
                    {menu.title}
                  </h3>
                  <p className={`text-sm leading-snug ${mutedTextClass}`}>
                    {formatScheduleBadge(
                      menu.days_of_week || [],
                      menu.start_time,
                      menu.end_time
                    )}
                  </p>
                  {!menu.is_active && (
                    <span className="self-start text-[11px] font-semibold tracking-wide uppercase text-orange-500 mt-0.5">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5">
                <Button
                  variant="ghost"
                  className={`flex-1 h-10 rounded-full ${outlineButtonClass} border ${getBorderColor()}`}
                  onClick={() => setEditing(menu)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className={`h-10 w-10 rounded-full px-0 ${outlineButtonClass} border ${getBorderColor()}`}
                  onClick={() => deleteMenu(menu.id)}
                  aria-label={`Delete ${menu.title}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
