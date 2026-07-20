'use client'

import { glassPanelStyle } from '@/lib/glass-styles'

export type HomeTab = 'specials' | 'happy-hour' | 'prefxe'

const TABS: { id: HomeTab; label: string }[] = [
  { id: 'specials', label: 'Local Specials' },
  { id: 'happy-hour', label: 'Happy Hour' },
  { id: 'prefxe', label: 'Pre Fixe' },
]

const APPLE_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'

interface HomeTabSwitcherProps {
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
}

export function HomeTabSwitcher({ activeTab, onTabChange }: HomeTabSwitcherProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-2 pb-4 flex-shrink-0">
      <div className="flex gap-3" role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3 px-4 rounded-full text-[15px] font-medium tracking-tight text-center transition-colors duration-150 ${
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                fontFamily: APPLE_FONT,
                ...(isActive
                  ? {
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                      border: '0.5px solid rgba(255,255,255,0.8)',
                    }
                  : glassPanelStyle),
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { TABS }
