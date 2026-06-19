'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface RestaurantSearchResult {
  username: string
  display_name: string
  avatar_url?: string
}

export function useRestaurantSearch() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RestaurantSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const performSearch = useCallback(async (query: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort()

    if (!query?.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setIsSearching(true)

    try {
      const response = await fetch(
        `/api/restaurants/search?q=${encodeURIComponent(query.trim())}`,
        { signal: abortController.signal }
      )
      const data = await response.json()
      if (!abortController.signal.aborted) {
        setSearchResults(response.ok ? data.restaurants || [] : [])
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setSearchResults([])
      }
    } finally {
      if (!abortController.signal.aborted) setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => performSearch(searchQuery), 300)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchQuery, performSearch])

  return { searchQuery, setSearchQuery, searchResults, isSearching }
}
