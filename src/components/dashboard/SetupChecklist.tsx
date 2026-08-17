'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Circle } from 'lucide-react'
import { Profile, supabase } from '@/lib/supabase'
import { hasAnyOpenDay, parseOpeningHours } from '@/lib/opening-hours'
import type { ProfileEditSection } from '@/components/profile/ProfileEditForm'

function dismissKey(profileId: string) {
  return `tmg-setup-dismissed:${profileId}`
}

interface SetupChecklistProps {
  profile: Profile
  isDark: boolean
  contrastColor: string
  backgroundColor: string
  borderClass: string
  onEditProfile: (section?: ProfileEditSection) => void
  onGoToMenu: () => void
}

export function SetupChecklist({
  profile,
  isDark,
  contrastColor,
  backgroundColor,
  borderClass,
  onEditProfile,
  onGoToMenu,
}: SetupChecklistProps) {
  const [specialCount, setSpecialCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey(profile.id)) === '1')
    } catch {
      // ignore
    }
  }, [profile.id])

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase
      .from('user_favorites')
      .select('menu_item_id')
      .eq('user_id', profile.id)
      .then(({ data }) => {
        if (!cancelled) setSpecialCount(data?.length ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [profile.id])

  const hours = parseOpeningHours(profile.opening_hours)
  const steps = [
    {
      id: 'photo',
      label: 'Add a restaurant photo',
      done: Boolean(profile.avatar_url),
      onClick: () => onEditProfile('photo'),
    },
    {
      id: 'address',
      label: 'Add your address',
      hint: 'So locals can find you on the homepage',
      done: Boolean(profile.address && profile.latitude != null),
      onClick: () => onEditProfile('address'),
    },
    {
      id: 'hours',
      label: 'Set your hours',
      hint: 'Different days can have different times',
      done: hasAnyOpenDay(hours),
      onClick: () => onEditProfile('hours'),
    },
    {
      id: 'contact',
      label: 'Add a phone number or reservation link',
      done: Boolean(profile.phone || profile.reservation_url),
      onClick: () => onEditProfile('contact'),
    },
    {
      id: 'special',
      label: 'Star a special',
      hint: 'Starred dishes show on The Menu Guide homepage',
      done: specialCount > 0,
      onClick: onGoToMenu,
    },
    {
      id: 'publish',
      label: profile.is_public ? 'Menu is public' : 'Publish your menu',
      hint: profile.is_public ? undefined : 'Guests can open it from your QR code',
      done: Boolean(profile.is_public),
      onClick: () => window.dispatchEvent(new Event('open-settings')),
    },
  ]

  const remainingSteps = steps.filter((s) => !s.done)
  const remaining = remainingSteps.length
  if (remaining === 0) return null

  const doneCount = steps.length - remaining
  const muted = isDark ? 'text-white/65' : 'text-black/55'

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className={`mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${borderClass}`}
        style={{ color: contrastColor }}
      >
        <span className="text-sm font-medium">
          Finish setup · {remaining} left
        </span>
        <ChevronRight className="h-4 w-4 opacity-50" />
      </button>
    )
  }

  return (
    <div
      className={`mx-4 mt-4 rounded-2xl border p-4 sm:p-5 ${borderClass}`}
      style={{ backgroundColor, color: contrastColor }}
    >
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Get on the map</h2>
          <p className={`mt-0.5 text-sm ${muted}`}>
            {remaining === 1 ? 'One thing left' : `${remaining} things left`} so locals can find you.
          </p>
        </div>
        <button
          type="button"
          className={`text-xs ${muted} hover:underline`}
          onClick={() => {
            try {
              localStorage.setItem(dismissKey(profile.id), '1')
            } catch {
              // ignore
            }
            setDismissed(true)
          }}
        >
          Later
        </button>
      </div>

      <div className={`mt-3 mb-4 h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
        <div
          className="h-full rounded-full bg-current opacity-80 transition-[width] duration-300"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-1">
        {remainingSteps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={step.onClick}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${
                isDark ? 'hover:bg-white/8' : 'hover:bg-black/4'
              }`}
            >
              <Circle className={`h-5 w-5 flex-shrink-0 ${muted}`} strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {step.label}
                </span>
                {step.hint && (
                  <span className={`block text-xs ${muted}`}>{step.hint}</span>
                )}
              </span>
              <ChevronRight className={`h-4 w-4 flex-shrink-0 ${muted}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
