'use client'

import { SettingsDialog } from '@/components/profile/SettingsDialog'
import {
  Utensils,
  Wine,
  UtensilsCrossed,
  BarChart3,
  Plus,
  FolderPlus,
  Scan,
  Edit,
  Settings,
  QrCode,
} from 'lucide-react'

type ActiveView = 'menu' | 'happy-hour' | 'pre-fixe' | 'analytics'

interface MobileDashboardNavProps {
  activeView: ActiveView
  onMenuView: () => void
  onHappyHour: () => void
  onPreFixe: () => void
  onAnalytics: () => void
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
 * owner can always reach Menu, Promotions, and Pre Fixe — plus quick actions —
 * regardless of which view is open. Hidden on lg+ where the sidebar takes over.
 */
export function MobileDashboardNav({
  activeView,
  onMenuView,
  onHappyHour,
  onPreFixe,
  onAnalytics,
  onNewItem,
  onNewCategory,
  onScanMenu,
  onEditProfile,
  backgroundColor,
  contrastColor,
  isDarkBackground,
}: MobileDashboardNavProps) {
  const fill = isDarkBackground ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)'
  const activeFill = isDarkBackground ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'
  const hairline = isDarkBackground ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  const views: { id: ActiveView; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    { id: 'menu', label: 'Menu', icon: <Utensils className="h-4 w-4" />, onClick: onMenuView },
    { id: 'happy-hour', label: 'Promotions', icon: <Wine className="h-4 w-4" />, onClick: onHappyHour },
    { id: 'pre-fixe', label: 'Pre Fixe', icon: <UtensilsCrossed className="h-4 w-4" />, onClick: onPreFixe },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, onClick: onAnalytics },
  ]

  const tabClass =
    'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors'

  const actionClass =
    'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap flex-shrink-0'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden overflow-x-auto scrollbar-hide"
      style={{
        borderTop: `0.5px solid ${hairline}`,
        backgroundColor,
        paddingBottom: 'env(safe-area-inset-bottom)',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x',
      }}
    >
      <div className="flex items-center gap-2 w-max px-4 py-3">
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
                backgroundColor: active ? activeFill : 'transparent',
              }}
            >
              {view.icon}
              {view.label}
            </button>
          )
        })}

        <span className="h-6 w-px flex-shrink-0 mx-1" style={{ backgroundColor: hairline }} />

        <button type="button" onClick={onNewItem} className={actionClass} style={{ color: contrastColor, backgroundColor: fill }}>
          <Plus className="h-4 w-4" /> Add Item
        </button>
        <button type="button" onClick={onNewCategory} className={actionClass} style={{ color: contrastColor, backgroundColor: fill }}>
          <FolderPlus className="h-4 w-4" /> Add Category
        </button>
        <button type="button" onClick={onScanMenu} className={actionClass} style={{ color: contrastColor, backgroundColor: fill }}>
          <Scan className="h-4 w-4" /> Scan Menu
        </button>
        <button type="button" onClick={onEditProfile} className={actionClass} style={{ color: contrastColor, backgroundColor: fill }}>
          <Edit className="h-4 w-4" /> Edit Profile
        </button>
        <SettingsDialog>
          <button type="button" className={actionClass} style={{ color: contrastColor, backgroundColor: fill }}>
            <Settings className="h-4 w-4" /> Settings
          </button>
        </SettingsDialog>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-qr-code'))}
          className={actionClass}
          style={{ color: contrastColor, backgroundColor: fill }}
        >
          <QrCode className="h-4 w-4" /> QR Code
        </button>
      </div>
    </div>
  )
}
