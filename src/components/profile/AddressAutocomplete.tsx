'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, X, Check } from 'lucide-react'
import type { AddressSuggestion } from '@/lib/geocoding'
import { glassCardStyle } from '@/lib/glass-styles'

const AddressMapPreview = dynamic(
  () => import('./AddressMapPreview').then((m) => m.AddressMapPreview),
  { ssr: false, loading: () => <div className="h-[160px] rounded-xl bg-gray-100 animate-pulse" /> }
)

interface AddressAutocompleteProps {
  value: string
  latitude: number | null
  longitude: number | null
  onChange: (address: string, coords: { latitude: number; longitude: number } | null) => void
  primaryTextClass?: string
  secondaryTextClass?: string
  borderClass?: string
}

export function AddressAutocomplete({
  value,
  latitude,
  longitude,
  onChange,
  primaryTextClass = 'text-gray-900',
  secondaryTextClass = 'text-gray-500',
  borderClass = 'border-gray-200',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AddressSuggestion | null>(
    value && latitude && longitude
      ? { displayName: value, latitude, longitude, street: '', city: '', state: '', postcode: '', country: '' }
      : null
  )
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value && latitude && longitude && !selected) {
      setSelected({
        displayName: value,
        latitude,
        longitude,
        street: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
      })
    }
  }, [value, latitude, longitude, selected])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setOpen(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (text: string) => {
    setQuery(text)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300)
  }

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelected(suggestion)
    setQuery('')
    setOpen(false)
    setSuggestions([])
    onChange(suggestion.displayName, {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    })
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    onChange('', null)
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {selected ? (
        <div
          className="rounded-xl p-3 flex items-start gap-3"
          style={glassCardStyle}
        >
          <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${primaryTextClass}`}>{selected.displayName}</p>
            <p className={`text-xs mt-0.5 ${secondaryTextClass}`}>
              {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search for your restaurant address..."
            className={`h-11 border rounded-lg ${borderClass} bg-white/60 backdrop-blur-md text-base pr-10`}
            onFocus={() => query.length >= 3 && setOpen(true)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
          {open && suggestions.length > 0 && (
            <ul
              className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-xl border border-white/40 max-h-60 overflow-y-auto"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {suggestions.map((s, i) => (
                <li key={`${s.latitude}-${s.longitude}-${i}`}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-black/5 transition-colors flex items-start gap-2"
                    onClick={() => handleSelect(s)}
                  >
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className={`text-sm ${primaryTextClass}`}>{s.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && !loading && query.length >= 3 && suggestions.length === 0 && (
            <div
              className="absolute z-50 w-full mt-1 rounded-xl p-4 text-sm text-center text-gray-500"
              style={glassCardStyle}
            >
              No results found. Try a more specific address.
            </div>
          )}
        </div>
      )}

      {selected && (
        <AddressMapPreview latitude={selected.latitude} longitude={selected.longitude} />
      )}

      {!selected && value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            setQuery(value)
            fetchSuggestions(value)
          }}
        >
          <Check className="h-3 w-3 mr-1" />
          Edit current address
        </Button>
      )}
    </div>
  )
}
