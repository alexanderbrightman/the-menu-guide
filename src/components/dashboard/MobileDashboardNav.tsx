'use client'

import { SettingsDialog } from '@/components/profile/SettingsDialog'
import {
  Utensils,
  Wine,
  UtensilsCrossed,
  Plus,
  FolderPlus,
  Scan,
  Edit,
  Settings,
  QrCode,
} from 'lucide-react'

type ActiveView = 'menu' | 'happy-hour' | 'pre-fixe'

interface MobileDashboardNavProps {
  activeView: ActiveView
  onMenuView: () => void
  onHappyHour: () => void
  onPreFixe: () => void
  onNewItem: () => void
  onNewCategory: () => void
  onScanMenu: () => void
  onEditProfile: () => void
  backgroundColor: string
  contrastColor: string
  isDarkBackground: boolean
}

/**
 * Persistent mobile bottom navigation.
 *
 * Lives at the dashboard level (not inside any single page) so the restaurant
 * owner can always reach Menu, Happy Hour, and Pre Fixe — plus quick actions —
 * regardless of which view is open. Hidden on lg+ where the sidebar takes over.
 */
export function MobileDashboardNav({
  activeView,
  onMenuView,
  onHappyHour,
  onPreFixe,
  onNewItem,
  onNewCategory,
  onScanMenu,
  onEditProfile,
  backgroundColor,
  contrastColor,
  isDarkBackground,
}: MobileDashboardNavProps) {
  const borderColor = isDarkBackground ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'
  const activeBg = isDarkBackground ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'

  const views: { id: ActiveView; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    { id: 'menu', label: 'Menu', icon: <Utensils className="h-4 w-4" />, onClick: onMenuView },
    { id: 'happy-hour', label: 'Happy Hour', icon: <Wine className="h-4 w-4" />, onClick: onHappyHour },
    { id: 'pre-fixe', label: 'Pre Fixe', icon: <UtensilsCrossed className="h-4 w-4" />, onClick: onPreFixe },
  ]

  const tabClass =
    'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0 border transition-colors'

  const actionClass =
    'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0 border bg-transparent'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden overflow-x-auto scrollbar-hide border-t"
      style={{
        borderColor,
        backgroundColor,
        paddingBottom: 'env(safe-area-inset-bottom)',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x',
      }}
    >
      <div className="flex items-center gap-2 w-max px-4 py-3">
        {/* View switcher */}
        {views.map((view) => {
          const active = activeView === view.id
          return (
            <button
              key={view.id}
              type="button"
              onClick={view.onClick}
              className={tabClass}
              style={{
                color: contrastColor,
                borderColor: active ? contrastColor : borderColor,
                backgroundColor: active ? activeBg : 'transparent',
              }}
            >
              {view.icon}
              {view.label}
            </button>
          )
        })}

        {/* Divider */}
        <span className="h-6 w-px flex-shrink-0 mx-1" style={{ backgroundColor: borderColor }} />

        {/* Quick actions */}
        <button type="button" onClick={onNewItem} className={actionClass} style={{ color: contrastColor, borderColor }}>
          <Plus className="h-4 w-4" /> Add Item
        </button>
        <button type="button" onClick={onNewCategory} className={actionClass} style={{ color: contrastColor, borderColor }}>
          <FolderPlus className="h-4 w-4" /> Add Category
        </button>
        <button type="button" onClick={onScanMenu} className={actionClass} style={{ color: contrastColor, borderColor }}>
          <Scan className="h-4 w-4" /> Scan Menu
        </button>
        <button type="button" onClick={onEditProfile} className={actionClass} style={{ color: contrastColor, borderColor }}>
          <Edit className="h-4 w-4" /> Edit Profile
        </button>
        <SettingsDialog>
          <button type="button" className={actionClass} style={{ color: contrastColor, borderColor }}>
            <Settings className="h-4 w-4" /> Settings
          </button>
        </SettingsDialog>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-qr-code'))}
          className={actionClass}
          style={{ color: contrastColor, borderColor }}
        >
          <QrCode className="h-4 w-4" /> QR Code
        </button>
      </div>
    </div>
  )
}
