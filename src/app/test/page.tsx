'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DatabaseTest() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpassword123')
  const [username, setUsername] = useState('testuser')
  const [displayName, setDisplayName] = useState('Test User')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    setResult('')
    setLogs([])
    
    try {
      addLog('Testing database connection...')
      
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      // Test 1: Check if we can query profiles table
      addLog('Testing profiles table query...')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (profilesError) {
        throw new Error(`Profiles table error: ${profilesError.message}`)
      }
      addLog('✓ Profiles table accessible')

      // Test 2: Check if we can insert a test profile
      addLog('Testing profile insertion...')
      const testId = 'test-' + Date.now()
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: testId,
          username: 'testuser',
          display_name: 'Test User',
          bio: '',
          is_public: false,
          subscription_status: 'free'
        })

      if (insertError) {
        throw new Error(`Profile insertion error: ${insertError.message}`)
      }
      addLog('✓ Profile insertion successful')

      // Test 3: Clean up test data
      addLog('Cleaning up test data...')
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testId)
      addLog('✓ Test data cleaned up')

      setResult('✅ Database connection test passed!')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addLog(`❌ Error: ${errorMessage}`)
      setResult(`❌ Database test failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const testUserSignup = async () => {
    setLoading(true)
    setResult('')
    setLogs([])
    
    try {
      addLog('Testing user signup process...')
      
      if (!supabase) {
        throw new Error('Supabase client not configured')
      }

      // Test signup
      addLog('Attempting user signup...')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName
          }
        }
      })

      if (error) {
        throw new Error(`Signup error: ${error.message}`)
      }

      addLog('✓ User signup successful')
      addLog(`User ID: ${data.user?.id}`)
      addLog(`Email: ${data.user?.email}`)

      // Check if profile was created
      if (data.user) {
        addLog('Checking if profile was created...')
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          addLog(`❌ Profile not found: ${profileError.message}`)
          setResult('❌ User created but profile was not created automatically')
        } else {
          addLog('✓ Profile created successfully')
          addLog(`Profile username: ${profile.username}`)
          addLog(`Profile display name: ${profile.display_name}`)
          setResult('✅ User signup and profile creation successful!')
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addLog(`❌ Error: ${errorMessage}`)
      setResult(`❌ Signup test failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Test Suite</CardTitle>
            <CardDescription>
              Test database connection and user signup process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Database Connection Test */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Database Connection Test</h3>
              <Button 
                onClick={testDatabaseConnection}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Database Connection'}
              </Button>
            </div>

            {/* User Signup Test */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. User Signup Test</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={testUserSignup}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing Signup...' : 'Test User Signup'}
              </Button>
            </div>

            {/* Results */}
            {result && (
              <div className="p-4 bg-gray-100 rounded-lg">
                <h4 className="font-semibold mb-2">Result:</h4>
                <p className="text-sm">{result}</p>
              </div>
            )}

            {/* Logs */}
            {logs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Test Logs:</h4>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
