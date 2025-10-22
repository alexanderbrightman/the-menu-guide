'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, ArrowRight, ChevronDown } from 'lucide-react'

export function LandingPage() {
  const [showAuthForm, setShowAuthForm] = useState(false)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Static Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/hero_photo.jpg')`,
        }}
      />

      {/* Enhanced dark overlay for better text contrast */}
      <div className="fixed inset-0 bg-black/40" />

      {/* Hero Layer */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 sm:px-8 lg:px-12 pt-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Title with improved hierarchy */}
          <h1 className="text-7xl md:text-8xl lg:text-[8.5rem] mb-16 leading-[0.9] tracking-[-0.02em] drop-shadow-2xl" style={{ color: '#F4F2EE', textShadow: '0 0 20px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.6), 0 8px 16px rgba(0,0,0,0.4)' }}>
            <span className="font-light tracking-wide">The Menu</span>
            <br />
            <span className="font-medium tracking-tight">Guide</span>
          </h1>
          
          {/* Login Button */}
          <div className="mb-16">
            <Button 
              onClick={() => setShowAuthForm(true)}
              className="bg-white/90 text-slate-900 rounded-lg text-xl font-medium hover:bg-white transition-all duration-200 shadow-xl hover:shadow-2xl px-10 py-5 backdrop-blur-sm"
            >
              Log In
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="flex flex-col items-center text-white/70">
            <span className="text-sm font-light mb-2">Scroll to learn more</span>
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </div>
        </div>
      </div>

      {/* Information Island Layer */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 sm:px-8 lg:px-12 pt-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Information Card */}
          <div className="backdrop-blur-md rounded-2xl p-8 md:p-12 lg:p-16 shadow-xl border border-white/20" style={{ backgroundColor: '#F4F2EE' }}>
            <div className="prose-lg max-w-none">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-light text-slate-900 mb-8 text-center tracking-tight">
                Boost Your Restaurant's Performance
              </h2>
              
              <p className="text-lg md:text-xl leading-relaxed font-light text-slate-600 max-w-4xl mx-auto mb-8">
                Create beautiful, interactive digital menus that delight your customers and boost your business. 
                From QR codes to dietary filtering, we make menu management effortless.
              </p>

              <p className="text-base md:text-lg leading-relaxed font-light text-slate-600 max-w-4xl mx-auto">
                Digital menus streamline your service by helping customers make decisions faster. When diners can see photos and descriptions of dishes instantly, they spend less time deciding and more time enjoying their meal. This efficiency means quicker table turnover and more customers served during busy periods. Plus, visual menus naturally encourage customers to order additional items when they can see appetizing photos of your specialties.
              </p>

              {/* Call to Action */}
              <div className="mt-12">
                <Button 
                  onClick={() => setShowAuthForm(true)}
                  className="bg-slate-900 text-white rounded-lg text-lg font-medium hover:bg-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl px-8 py-4"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl shadow-xl border border-slate-200 max-w-sm w-full max-h-[85vh] overflow-hidden" style={{ backgroundColor: '#F4F2EE' }}>
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-medium text-slate-900">Welcome to The Menu Guide</h2>
                  <p className="text-sm text-slate-600 mt-1">Sign in to your account or create a new one</p>
                </div>
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                >
                  <X className="h-4 w-4 text-slate-500 group-hover:text-slate-700" />
                </button>
              </div>
            </div>
            <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              <AuthForm onSuccess={() => setShowAuthForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
