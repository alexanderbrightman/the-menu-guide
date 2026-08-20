'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScanLine, Upload, Crown } from 'lucide-react'
import { usePremiumFeature } from '@/hooks/usePremiumFeature'
import { Profile } from '@/lib/supabase'
import { useMenuTheme } from '@/hooks/useMenuTheme'
import { ExtrasEditor } from '@/components/menu/ExtrasEditor'
import {
  extraDraftsToPayload,
  extrasToDrafts,
  newDraftId,
  type ExtraDraft,
  type ScannedMenuItem,
} from '@/lib/menu-extras'

interface ScanMenuModalProps {
  userId: string
  onScanSuccess?: () => void
  hideTrigger?: boolean
  profile?: Profile | null
}

interface DraftItem {
  id: string
  included: boolean
  title: string
  description: string
  price: string
  category: string
  extras: ExtraDraft[]
}

const MAX_DRAFT_ITEMS = 50

function toDraftItems(items: ScannedMenuItem[]): DraftItem[] {
  return items.map((item) => ({
    id: newDraftId(),
    included: true,
    title: item.title,
    description: item.description || '',
    price: item.price == null ? '' : String(item.price),
    category: item.category || '',
    extras: extrasToDrafts(
      item.extras.map((extra) => ({
        id: newDraftId(),
        kind: extra.kind,
        name: extra.name,
        price: extra.price,
      }))
    ),
  }))
}

export function ScanMenuModal({ userId, onScanSuccess, hideTrigger = false, profile }: ScanMenuModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const photoUrlsRef = useRef<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const premiumAccess = usePremiumFeature('menu scanning')

  const {
    menuBackgroundColor,
    contrastColor,
    primaryTextClass,
    secondaryTextClass,
    mutedTextClass,
    fieldClass,
    chipClass,
    groupedClass,
    accentButtonClass,
    hairline,
    fill,
    isDarkBackground,
  } = useMenuTheme(profile || null)

  const reviewing = draftItems.length > 0
  const includedCount = draftItems.filter((item) => item.included && item.title.trim()).length

  useEffect(() => {
    const openHandler = () => setShowModal(true)
    window.addEventListener('open-scan-menu', openHandler)
    return () => window.removeEventListener('open-scan-menu', openHandler)
  }, [])

  const clearPhotos = () => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    photoUrlsRef.current = []
    setPhotoUrls([])
  }

  const resetDraft = () => {
    setDraftItems([])
    setMessage(null)
    clearPhotos()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = (open: boolean) => {
    if (!open && !loading && !saving) {
      setShowModal(false)
      resetDraft()
    }
  }

  const scanFile = async (file: File) => {
    if (!supabase) return

    const url = URL.createObjectURL(file)
    photoUrlsRef.current.push(url)
    setPhotoUrls([...photoUrlsRef.current])
    setLoading(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Not authenticated. Please sign in again.')
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)

      const res = await fetch('/api/scan-menu', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Failed to scan menu. Please try again.')
        return
      }

      const scanned = Array.isArray(data.items) ? (data.items as ScannedMenuItem[]) : []
      setDraftItems((prev) => {
        const next = [...prev, ...toDraftItems(scanned)]
        return next.slice(0, MAX_DRAFT_ITEMS)
      })
    } catch (error) {
      console.error('Error scanning menu:', error)
      setMessage('An error occurred while scanning. Please try again.')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void scanFile(file)
  }

  const updateDraft = (id: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleSave = async () => {
    if (!supabase) return
    const items = draftItems
      .filter((item) => item.included && item.title.trim())
      .map((item) => ({
        title: item.title,
        description: item.description,
        price: item.price === '' ? null : Number(item.price),
        category: item.category || null,
        extras: extraDraftsToPayload(item.extras),
      }))

    if (items.length === 0) {
      setMessage('Select at least one item to add.')
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Not authenticated. Please sign in again.')
        setSaving(false)
        return
      }

      const res = await fetch('/api/scan-menu/commit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage(data.message || `Added ${data.itemsInserted || items.length} items.`)
        onScanSuccess?.()
        setTimeout(() => {
          setShowModal(false)
          resetDraft()
        }, 1400)
      } else {
        setMessage(data.error || 'Failed to save items. Please try again.')
      }
    } catch (error) {
      console.error('Error saving scanned menu:', error)
      setMessage('An error occurred while saving. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const latestPhoto = photoUrls[photoUrls.length - 1]
  const isErrorMessage = message ? /fail|error|not authenticated|select at least/i.test(message) : false

  return (
    <>
      {!hideTrigger && (
        <Button onClick={() => setShowModal(true)} className={accentButtonClass}>
          <ScanLine className="h-4 w-4 mr-2" />
          Scan Menu
        </Button>
      )}

      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent
          className={`w-[92vw] border-0 p-0 gap-0 rounded-[18px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.22)] [&>button]:hidden flex flex-col ${
            reviewing ? 'max-w-lg max-h-[90dvh]' : 'max-w-sm'
          }`}
          showCloseButton={false}
          style={{
            backgroundColor: menuBackgroundColor,
            color: contrastColor,
          }}
        >
          <div
            className="flex items-center justify-between p-4 shrink-0"
            style={{ borderBottom: `0.5px solid ${hairline}` }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={loading || saving}
              className="text-base font-normal hover:bg-transparent px-2 -ml-2"
              style={{ color: isDarkBackground ? '#ffffff' : '#000000' }}
            >
              Cancel
            </Button>
            <DialogTitle className={`text-[17px] font-semibold tracking-tight ${primaryTextClass}`}>
              {reviewing ? 'Review Scan' : 'Scan Menu'}
            </DialogTitle>
            <span className="w-[72px]" />
          </div>

          <div className={`flex-1 min-h-0 ${reviewing ? 'overflow-y-auto p-4 space-y-4' : 'p-6 flex flex-col justify-center space-y-6'}`}>
            {!premiumAccess.canAccess ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: fill }}
                >
                  <Crown className={`size-5 ${mutedTextClass}`} strokeWidth={1.75} />
                </div>
                <div className="space-y-1.5">
                  <h3
                    className={`text-[17px] font-semibold tracking-tight ${primaryTextClass}`}
                    style={{ letterSpacing: '-0.022em' }}
                  >
                    Premium Feature
                  </h3>
                  <p className={`text-[13px] leading-snug ${secondaryTextClass} max-w-[250px] mx-auto`}>
                    Upgrade to scan a printed menu with the camera.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2 pt-2">
                  <Button
                    onClick={async () => {
                      const endpoint = profile?.stripe_customer_id
                        ? '/api/stripe/customer-portal'
                        : '/api/stripe/create-checkout-session'

                      setLoading(true)
                      try {
                        if (!supabase) return
                        const { data: { session: authSession } } = await supabase.auth.getSession()
                        if (!authSession) return
                        const res = await fetch(endpoint, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${authSession.access_token}` },
                        })
                        const data = await res.json()
                        if (res.ok && data.url) window.location.href = data.url
                        else alert(data.error || 'Error starting upgrade.')
                      } catch (e) {
                        console.error(e)
                        alert('Error starting upgrade.')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    className={`w-full h-11 ${accentButtonClass}`}
                    disabled={loading}
                  >
                    {loading ? 'Loading…' : 'Upgrade'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowModal(false)} className={chipClass}>
                    Not Now
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Input
                  ref={fileInputRef}
                  id="menu-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!reviewing && !loading && (
                  <>
                    <div className={`space-y-3 text-center ${secondaryTextClass}`}>
                      <p
                        className={`text-[22px] font-semibold tracking-tight ${primaryTextClass}`}
                        style={{ letterSpacing: '-0.022em' }}
                      >
                        Snap a clear photo
                      </p>
                      <p className="text-[13px] leading-relaxed">
                        Nothing is added until you review it. Check names and prices against the photo, and leave a price blank if it looks wrong.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-[16px] p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-opacity active:opacity-80"
                      style={{ backgroundColor: fill }}
                    >
                      <Upload className={`h-7 w-7 ${mutedTextClass}`} strokeWidth={1.75} />
                      <span className={`text-[13px] font-medium ${secondaryTextClass}`}>
                        Tap to take or choose a photo
                      </span>
                    </button>
                  </>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    {latestPhoto && (
                      <div className="relative w-full h-28 mb-6 rounded-[16px] overflow-hidden opacity-60">
                        <Image src={latestPhoto} alt="Scanning" fill className="object-contain" unoptimized />
                      </div>
                    )}
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-35 mb-5" />
                    <p className={`text-[17px] font-semibold tracking-tight ${primaryTextClass}`}>Reading your menu…</p>
                    <p className={`text-[13px] mt-1.5 ${mutedTextClass}`}>Nothing is saved until you review it</p>
                  </div>
                )}

                {reviewing && !loading && (
                  <>
                    {latestPhoto && (
                      <div
                        className="relative w-full h-32 rounded-[16px] overflow-hidden shrink-0"
                        style={{ backgroundColor: fill }}
                      >
                        <Image
                          src={latestPhoto}
                          alt="Scanned menu"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                        {photoUrls.length > 1 && (
                          <span className="absolute bottom-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-black/55 text-white">
                            {photoUrls.length} pages
                          </span>
                        )}
                      </div>
                    )}

                    <p className={`text-[13px] ${mutedTextClass}`}>
                      Uncheck anything that does not belong. Fix a price if the photo disagrees.
                    </p>

                    <div className="space-y-3">
                      {draftItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 space-y-3 ${groupedClass} ${
                            item.included ? '' : 'opacity-45'
                          }`}
                        >
                          <label className={`flex items-center gap-2 text-[13px] font-medium ${primaryTextClass}`}>
                            <input
                              type="checkbox"
                              checked={item.included}
                              onChange={(event) => updateDraft(item.id, { included: event.target.checked })}
                              className="h-4 w-4 rounded"
                            />
                            Include this item
                          </label>
                          <Input
                            value={item.title}
                            onChange={(event) => updateDraft(item.id, { title: event.target.value })}
                            placeholder="Item name"
                            className={`${fieldClass} text-base`}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={item.category}
                              onChange={(event) => updateDraft(item.id, { category: event.target.value })}
                              placeholder="Category"
                              className={`${fieldClass} text-base`}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={(event) => updateDraft(item.id, { price: event.target.value })}
                              placeholder="Price"
                              className={`${fieldClass} text-base`}
                            />
                          </div>
                          <Textarea
                            value={item.description}
                            onChange={(event) => updateDraft(item.id, { description: event.target.value })}
                            placeholder="Description"
                            rows={2}
                            className={`${fieldClass} min-h-[4.5rem] h-auto resize-none py-2.5 text-sm`}
                          />
                          <ExtrasEditor
                            extras={item.extras}
                            onChange={(extras) => updateDraft(item.id, { extras })}
                            textClass={primaryTextClass}
                            mutedClass={mutedTextClass}
                            borderClass={`${fieldClass} h-9`}
                            disabled={!item.included}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {message && (
                  <div
                    className="rounded-[12px] px-4 py-3 text-center text-[13px] font-medium"
                    style={{
                      backgroundColor: isErrorMessage
                        ? isDarkBackground ? 'rgba(255,59,48,0.18)' : 'rgba(255,59,48,0.10)'
                        : isDarkBackground ? 'rgba(52,199,89,0.18)' : 'rgba(52,199,89,0.12)',
                      color: isErrorMessage
                        ? isDarkBackground ? '#FF8A80' : '#C41E12'
                        : isDarkBackground ? '#7DFFA6' : '#1B7A3A',
                    }}
                  >
                    {message}
                  </div>
                )}
              </>
            )}
          </div>

          {premiumAccess.canAccess && reviewing && !loading && (
            <div
              className="shrink-0 p-3 flex flex-wrap gap-2"
              style={{ borderTop: `0.5px solid ${hairline}` }}
            >
              <Button
                type="button"
                variant="ghost"
                disabled={saving || draftItems.length >= MAX_DRAFT_ITEMS}
                className={`${chipClass} flex-1 min-w-[140px] h-11`}
                onClick={() => fileInputRef.current?.click()}
              >
                Scan another page
              </Button>
              <Button
                type="button"
                disabled={saving || includedCount === 0}
                className={`${accentButtonClass} flex-1 min-w-[140px] h-11`}
                onClick={() => void handleSave()}
              >
                {saving ? 'Adding…' : `Add ${includedCount} item${includedCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
