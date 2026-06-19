'use client'

import { motion } from 'framer-motion'
import { glassPanelStyle } from '@/lib/glass-styles'

export type HomeTab = 'specials' | 'happy-hour' | 'prefxe'

const TABS: { id: HomeTab; label: string }[] = [
  { id: 'specials', label: 'Local Specials' },
  { id: 'happy-hour', label: 'Happy Hour' },
  { id: 'prefxe', label: 'Pre Fixe' },
]

interface HomeTabSwitcherProps {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
}

export function HomeTabSwitcher({ activeTab, onTabChange }: HomeTabSwitcherProps) {
  const activeIndex = TABS.findIndex((t) => t.id === activeTab)

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-1 pb-3 flex-shrink-0">
      <div
        className="relative flex rounded-full p-1 shadow-sm"
        style={glassPanelStyle}
        role="tablist"
      >
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
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 flex-1 py-2 px-1 text-[12px] sm:text-[13px] font-medium tracking-tight transition-colors duration-200 rounded-full text-center ${
              activeTab === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export { TABS }
