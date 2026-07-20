'use client'

import { Search } from 'lucide-react'
import { glassPanelStyle, glassFabStyle, glassTokens } from '@/lib/glass-styles'
import type { HomeTab } from '@/components/landing/HomeTabSwitcher'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

/**
 * Mobile-only labels are shorter than the desktop tab switcher
 * ("Specials" vs "Local Specials") so all three fit comfortably
 * at small viewport widths.
 */
const TABS: { id: HomeTab; label: string }[] = [
  { id: 'specials', label: 'Specials' },
  { id: 'happy-hour', label: 'Happy Hour' },
  { id: 'prefxe', label: 'Pre Fixe' },
]

interface MobileTabBarProps {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
  onSearchClick: () => void
}

/**
 * iOS-style bottom navigation for the mobile landing experience:
 * three discrete tab buttons plus a circular search button.
 *
 * - Sits above the home indicator via safe-area-inset-bottom
 * - Hidden on md+ where the top HomeTabSwitcher takes over
 */
export function MobileTabBar({ activeTab, onTabChange, onSearchClick }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Browse menus"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3">
        <div
          role="tablist"
          className="flex h-[52px] min-w-0 flex-1 items-stretch gap-1.5 rounded-full p-1"
          style={{ ...glassPanelStyle, boxShadow: glassTokens.shadowLg }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`min-w-0 flex-1 rounded-full px-1 text-center text-[13px] font-medium tracking-tight transition-colors duration-150 ${
                  isActive ? 'text-gray-900 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-gray-500'
                }`}
                style={{ fontFamily: APPLE_FONT }}
              >
                <span className="block truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          aria-label="Search restaurants"
          onClick={onSearchClick}
          className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full active:scale-95 transition-transform"
          style={glassFabStyle}
        >
          <Search className="h-5 w-5 text-gray-800" />
        </button>
      </div>
    </nav>
  )
}
