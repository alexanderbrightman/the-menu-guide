'use client'

import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { glassPanelStyle, glassFabStyle, glassTokens } from '@/lib/glass-styles'
import type { HomeTab } from '@/components/landing/HomeTabSwitcher'

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

/**
 * Mobile-only labels are shorter than the desktop tab switcher
 * ("Specials" vs "Local Specials") so all three fit comfortably
 * in the pill at small viewport widths.
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
 * a closed-oval (pill) tab bar with a sliding selection indicator,
 * plus a circular search button fixed to its right.
 *
 * - Sits above the home indicator via safe-area-inset-bottom
 * - Tabs flex to fill available width (44pt+ touch targets)
 * - Hidden on md+ where the top HomeTabSwitcher takes over
 */
export function MobileTabBar({ activeTab, onTabChange, onSearchClick }: MobileTabBarProps) {
  const activeIndex = TABS.findIndex((t) => t.id === activeTab)

  return (
    <nav
      aria-label="Browse menus"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center gap-3">
        {/* Closed-oval tab bar */}
        <div
          role="tablist"
          className="relative flex h-[52px] min-w-0 flex-1 items-stretch rounded-full p-1"
          style={{ ...glassPanelStyle, boxShadow: glassTokens.shadowLg }}
        >
          {/* Sliding selection indicator */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
            initial={false}
            animate={{ left: `calc(4px + ${activeIndex} * ((100% - 8px) / ${TABS.length}))` }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ width: `calc((100% - 8px) / ${TABS.length})` }}
          />
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative z-10 min-w-0 flex-1 rounded-full px-1 text-center text-[13px] font-medium tracking-tight transition-colors duration-200 ${
                activeTab === tab.id ? 'text-gray-900' : 'text-gray-500'
              }`}
              style={{ fontFamily: APPLE_FONT }}
            >
              <span className="block truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search button fixed to the right of the bar */}
        <motion.button
          type="button"
          aria-label="Search restaurants"
          onClick={onSearchClick}
          className="flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-full"
          style={glassFabStyle}
          whileTap={{ scale: 0.92 }}
        >
          <Search className="h-5 w-5 text-gray-800" />
        </motion.button>
      </div>
    </nav>
  )
}
