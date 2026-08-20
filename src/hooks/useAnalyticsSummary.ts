'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSessionToken } from '@/lib/auth-utils'
import type { AnalyticsSummary } from '@/lib/analytics-types'

export function useAnalyticsSummary(enabled: boolean) {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await getSessionToken()
      if (!token) {
        setError('Please sign in again.')
        setData(null)
        return
      }
      const response = await fetch('/api/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Could not load analytics.')
        setData(null)
        return
      }
      setData(body as AnalyticsSummary)
    } catch {
      setError('Could not load analytics.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}
