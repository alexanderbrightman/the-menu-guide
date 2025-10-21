'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'

export function SetupGuide() {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('')
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    // Check if environment variables are set
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (url && key && !url.includes('your_supabase_project_url')) {
      setIsConfigured(true)
    }
  }, [])

  if (isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-800">Setup Complete!</CardTitle>
            <CardDescription>
              Your Supabase configuration is ready. The app should work normally now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => window.location.reload()}
            >
              Continue to App
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Welcome to The Menu Guide!</CardTitle>
            <CardDescription className="text-lg">
              Let's get your restaurant's digital menu set up
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Setup Steps */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 Quick Setup</CardTitle>
              <CardDescription>Follow these steps to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Create Supabase Project</h4>
                <p className="text-sm text-gray-600">
                  Go to <a href="https://supabase.com" target="_blank" className="text-blue-600 hover:underline">supabase.com</a> and create a new project
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">2. Run Database Setup</h4>
                <p className="text-sm text-gray-600">
                  In your Supabase SQL Editor, run these files in order:
                </p>
                <ul className="text-sm text-gray-600 ml-4 space-y-1">
                  <li>• database/schema.sql</li>
                  <li>• database/storage.sql</li>
                  <li>• database/triggers.sql</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">3. Get Your Credentials</h4>
                <p className="text-sm text-gray-600">
                  From Settings → API in your Supabase dashboard
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">4. Configure Environment</h4>
                <p className="text-sm text-gray-600">
                  Update .env.local with your Supabase credentials
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Environment Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Environment Setup</CardTitle>
              <CardDescription>Configure your Supabase credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabase-url">Supabase Project URL</Label>
                <Input
                  id="supabase-url"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supabase-key">Supabase Anon Key</Label>
                <Input
                  id="supabase-key"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="font-semibold text-blue-800 mb-2">Manual Setup</h4>
                <p className="text-sm text-blue-700 mb-2">
                  Create a <code className="bg-blue-100 px-1 rounded">.env.local</code> file in your project root:
                </p>
                <pre className="text-xs bg-blue-100 p-2 rounded overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`}
                </pre>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => window.location.reload()}
                disabled={!supabaseUrl || !supabaseAnonKey}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue Setup
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📚 Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Documentation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <a href="https://supabase.com/docs" target="_blank" className="text-blue-600 hover:underline">Supabase Docs</a></li>
                  <li>• <a href="https://nextjs.org/docs" target="_blank" className="text-blue-600 hover:underline">Next.js Docs</a></li>
                  <li>• Check README.md for detailed instructions</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Quick Links</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <a href="https://supabase.com/dashboard" target="_blank" className="text-blue-600 hover:underline">Supabase Dashboard</a></li>
                  <li>• <a href="https://vercel.com" target="_blank" className="text-blue-600 hover:underline">Deploy to Vercel</a></li>
                  <li>• View TESTING.md for troubleshooting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

