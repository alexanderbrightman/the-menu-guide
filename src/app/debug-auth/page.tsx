'use client'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function DebugAuthPage() {
  const { user, profile, loading } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [apiTest, setApiTest] = useState<any>(null)

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setSessionInfo({ error: 'Supabase client is null' })
        return
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        setSessionInfo({ session, error })
      } catch (err) {
        setSessionInfo({ error: err })
      }
    }

    checkSession()
  }, [])

  const testApi = async () => {
    if (!supabase) {
      setApiTest({ error: 'Supabase client is null' })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setApiTest({ error: 'No access token' })
        return
      }

      const response = await fetch('/api/menu-categories', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      setApiTest({ status: response.status, data })
    } catch (err) {
      setApiTest({ error: err })
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Auth Context</h2>
          <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
          <p><strong>User:</strong> {user ? user.email : 'null'}</p>
          <p><strong>Profile:</strong> {profile ? profile.username : 'null'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Session Info</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">API Test</h2>
          <button 
            onClick={testApi}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-2"
          >
            Test Menu Categories API
          </button>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(apiTest, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
