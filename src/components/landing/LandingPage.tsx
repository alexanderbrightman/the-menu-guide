'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'

export function LandingPage() {
  const [showAuthForm, setShowAuthForm] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(`
            <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dots" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <circle cx="40" cy="40" r="2" fill="#800000" fill-opacity="0.03"/>
                  <circle cx="20" cy="20" r="1" fill="#800000" fill-opacity="0.03"/>
                  <circle cx="60" cy="20" r="1" fill="#800000" fill-opacity="0.03"/>
                  <circle cx="20" cy="60" r="1" fill="#800000" fill-opacity="0.03"/>
                  <circle cx="60" cy="60" r="1" fill="#800000" fill-opacity="0.03"/>
                </pattern>
              </defs>
              <rect width="80" height="80" fill="url(#dots)"/>
            </svg>
          `)}')`,
        }}
      />

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-red-200/10 rounded-full blur-xl"></div>
      <div className="absolute top-40 right-20 w-32 h-32 bg-red-300/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-20 left-20 w-24 h-24 bg-red-400/8 rounded-full blur-xl"></div>
      <div className="absolute bottom-40 right-10 w-16 h-16 bg-red-200/10 rounded-full blur-xl"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight text-black drop-shadow-sm">
            The Menu Guide
          </h1>
          
          {/* Description */}
          <p className="text-xl md:text-2xl text-gray-800 max-w-3xl mx-auto leading-relaxed font-light mb-12 drop-shadow-sm">
            Create beautiful, interactive digital menus that delight your customers and boost your business. 
            From QR codes to dietary filtering, we make menu management effortless.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button 
              onClick={() => setShowAuthForm(true)}
              className="bg-red-800 text-white rounded-xl text-xl font-semibold hover:bg-red-900 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 px-8 py-4"
            >
              Log In
            </Button>
            <Button 
              onClick={() => setShowAuthForm(true)}
              variant="outline"
              className="bg-white text-red-800 border-2 border-red-800 rounded-xl text-xl font-semibold hover:bg-red-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 px-8 py-4"
            >
              Create Account
            </Button>
          </div>

          {/* Story Section */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 md:p-12 shadow-xl border border-red-100 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-1000 delay-500">
            <div className="prose-lg max-w-none text-black">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 text-center">Why Choose The Menu Guide?</h2>
              <p className="text-lg leading-relaxed mb-8 font-light text-gray-700">
                We understand that running a restaurant is hard work. That&apos;s why we&apos;ve created a simple, 
                powerful platform that takes the complexity out of menu management. Our digital menus are designed 
                to work seamlessly with your existing operations while providing your customers with an exceptional experience.
              </p>
              
              <div className="bg-red-50 rounded-xl p-6 border-l-4 border-red-800 shadow-sm">
                <p className="font-semibold text-red-800 text-lg mb-3">Coming Soon</p>
                <p className="text-gray-700 leading-relaxed">
                  Advanced analytics, custom branding options, and priority support are just around the corner. 
                  Stay tuned for exciting updates that will help you take your restaurant to the next level.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-black">Welcome to The Menu Guide</h2>
                  <p className="text-gray-700 mt-2">Sign in to your account or create a new one</p>
                </div>
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="p-3 hover:bg-red-50 rounded-xl transition-colors group"
                >
                  <X className="h-5 w-5 text-red-600 group-hover:text-red-800" />
                </button>
              </div>
            </div>
            <div className="px-6 pb-6">
              <AuthForm onSuccess={() => setShowAuthForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
