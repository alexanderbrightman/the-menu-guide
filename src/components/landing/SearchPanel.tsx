'use client'

import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRestaurantSearch } from '@/hooks/useRestaurantSearch'
import { useState } from 'react'

interface SearchPanelProps {
  onResultClick?: () => void
}

export function SearchPanel({ onResultClick }: SearchPanelProps) {
  const router = useRouter()
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useRestaurantSearch()
  const [loadingResult, setLoadingResult] = useState<string | null>(null)

  return (
    <div className="px-3 pb-5 pt-3">
      <label className="relative flex w-full items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-black/[0.035] px-4 py-3 transition-colors focus-within:border-black/[0.12] focus-within:bg-black/[0.05]">
        <Search className="h-[18px] w-[18px] flex-shrink-0 text-gray-400" />
        <Input
          type="text"
          autoComplete="off"
          autoFocus
          placeholder="Search restaurants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-auto flex-1 border-0 bg-transparent p-0 text-[16px] shadow-none focus-visible:ring-0"
        />
        <ArrowRight className="h-[18px] w-[18px] flex-shrink-0 text-gray-400" />
      </label>

      {searchQuery.trim().length > 0 && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl">
          {isSearching ? (
            <div className="p-6 text-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((restaurant) => (
                <Link
                  key={restaurant.username}
                  href={`/menu/${restaurant.username}`}
                  prefetch
                  onClick={() => {
                    setLoadingResult(restaurant.username)
                    onResultClick?.()
                  }}
                  onMouseEnter={() => router.prefetch(`/menu/${restaurant.username}`)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    loadingResult === restaurant.username ? 'bg-gray-100' : 'hover:bg-black/5'
                  }`}
                >
                  {restaurant.avatar_url ? (
                    <Image
                      src={restaurant.avatar_url}
                      alt={restaurant.display_name}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-medium">
                      {restaurant.display_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{restaurant.display_name}</p>
                    <p className="text-xs text-gray-500">@{restaurant.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-gray-400">No restaurants found</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Legacy inline search — kept for backwards compatibility */
export function SearchSection() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <SearchPanel />
    </div>
  )
}
