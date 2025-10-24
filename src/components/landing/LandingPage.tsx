'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, ArrowRight, ChevronDown } from 'lucide-react'

export function LandingPage() {
  const [showAuthForm, setShowAuthForm] = useState(false)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background matching logo */}
      <div 
        className="fixed inset-0"
        style={{
          background: '#f4f0ec',
        }}
      />

      {/* Hero Layer */}
      <div className="relative z-10 flex flex-col min-h-screen px-4 sm:px-6 lg:px-8">
        {/* Top right login button */}
        <div className="absolute top-8 right-8 z-20">
          <Button 
            onClick={() => setShowAuthForm(true)}
            className="bg-white/60 backdrop-blur-sm text-gray-700 rounded-lg text-lg font-light hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md px-8 py-4 border border-gray-200"
          >
            Log In
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Main content centered */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-7xl mx-auto">
            {/* Centered logo and title */}
            <div className="flex items-center justify-center w-full">
              <div className="flex items-center space-x-8">
                {/* Logo - same height as title, 60% larger */}
                <div className="flex-shrink-0">
                  <img 
                    src="/logo_notext.png" 
                    alt="The Menu Guide Logo" 
                    className="h-[17.28vw] md:h-[23.04vw] lg:h-[28.8vw] w-auto min-h-[11.52rem] min-w-[11.52rem] max-h-[34.56rem] max-w-[34.56rem] object-contain"
                    style={{ height: 'clamp(11.52rem, 23.04vw, 34.56rem)' }}
                  />
                </div>
                
                {/* Title - left aligned within the centered group, 60% larger */}
                <div className="flex-shrink-0">
                  <h1 className="text-[9.6vw] md:text-[12.8vw] lg:text-[16vw] font-light text-gray-800 leading-none tracking-tight" style={{ fontSize: 'clamp(6.4rem, 12.8vw, 19.2rem)' }}>
                    <div className="mb-2">The</div>
                    <div className="mb-2">Menu</div>
                    <div>Guide</div>
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator at bottom */}
        <div className="flex flex-col items-center text-gray-500 pb-8">
          <span className="text-sm font-light mb-2">Scroll to learn more</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </div>

      {/* Information Section */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 sm:px-8 lg:px-12 py-20">
        <div className="max-w-6xl mx-auto w-full">
          {/* Main heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-gray-800 mb-6">
              What We're All About
            </h2>
            <p className="text-xl md:text-2xl font-light text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Hey there! We're here to make your restaurant's menu game stronger. Think of us as your digital menu sidekick.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Card 1 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-4">QR Code Magic</h3>
              <p className="text-gray-600 font-light leading-relaxed">One scan and customers see your full menu instantly. No more waiting for printed menus.</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-4">Photo-Friendly</h3>
              <p className="text-gray-600 font-light leading-relaxed">Show off your best dishes with crisp images that make customers hungry.</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-4">Dietary Filters</h3>
              <p className="text-gray-600 font-light leading-relaxed">Let customers find gluten-free, vegan, or spicy options instantly.</p>
            </div>

            {/* Card 4 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-4">Easy Updates</h3>
              <p className="text-gray-600 font-light leading-relaxed">Display specials without reprinting anything. Change prices instantly.</p>
            </div>

            {/* Card 5 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-4">Mobile-First</h3>
              <p className="text-gray-600 font-light leading-relaxed">Looks great on any phone or tablet. Your customers will love it.</p>
            </div>

            {/* Card 6 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-800 mb-4">Quick Setup</h3>
              <p className="text-gray-600 font-light leading-relaxed">Get your menu online in minutes, not hours. Upload photos and you're ready.</p>
            </div>
          </div>

          {/* Benefits section */}
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-light text-gray-800 mb-8">
              Why Digital Menus Actually Work
            </h3>
            <div className="max-w-4xl mx-auto">
              <p className="text-lg md:text-xl font-light text-gray-600 leading-relaxed mb-6">
                You know how customers sometimes take forever to decide what to order? A good digital menu fixes that. When people can see your dishes clearly, with photos and descriptions, they make choices faster.
              </p>
              <p className="text-lg md:text-xl font-light text-gray-600 leading-relaxed">
                That means happier customers and more tables turned during your busy hours. Digital menus aren't just trendy—they're practical.
              </p>
            </div>
          </div>

          {/* Call to action */}
          <div className="text-center">
            <Button 
              onClick={() => setShowAuthForm(true)}
              className="bg-white/60 backdrop-blur-sm text-gray-700 rounded-xl text-xl font-light hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md px-12 py-6 border border-gray-200"
            >
              Start building your menu for free!
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-xl shadow-xl border border-gray-200 max-w-sm w-full max-h-[85vh] overflow-hidden bg-white">
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-medium text-slate-900">Welcome to The Menu Guide</h2>
                  <p className="text-sm text-slate-600 mt-1">Sign in to your account or create a new one</p>
                </div>
                <button
                  onClick={() => setShowAuthForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
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
