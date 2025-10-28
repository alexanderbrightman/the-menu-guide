'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, ArrowRight, ChevronDown, Tag, DollarSign } from 'lucide-react'

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
              <div className="flex items-center space-x-4">
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
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 sm:px-8 lg:px-12 py-12 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto w-full">
          {/* Main heading */}
          <div className="text-center mb-6 sm:mb-10 md:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light text-gray-800 mb-3 sm:mb-5">
              What We're All About
            </h2>
            <p className="text-base sm:text-lg md:text-2xl lg:text-3xl font-light text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Hey there! We're here to make your restaurant's menu game stronger.
            </p>
          </div>

          {/* Context paragraph */}
          <div className="mb-6 sm:mb-8 md:mb-12">
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-light text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Here's what your menu could look like — beautiful photos, clear descriptions, and dietary info that helps customers make informed choices.
            </p>
          </div>

          {/* Example menu cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-10 md:mb-14">
            {/* Duck Card */}
            <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden p-0">
              <CardContent className="p-0">
                <div className="aspect-[3/2] overflow-hidden">
                  <img 
                    src="/duck_homepg.png" 
                    alt="Hudson Duck with White Asparagus"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">Hudson Duck with White Asparagus</h3>
                    <div className="text-gray-900 font-semibold whitespace-nowrap ml-2 flex items-center">
                      <DollarSign className="h-4 w-4" />
                      32
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Hudson vally duck breast, with french white asparagus, wild rice, orange jus
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      nut-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      gluten-free
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lobster Card */}
            <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden p-0">
              <CardContent className="p-0">
                <div className="aspect-[3/2] overflow-hidden">
                  <img 
                    src="/lobster_homepg.png" 
                    alt="Lobster Thermidor"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">Lobster Thermidor</h3>
                    <div className="text-gray-900 font-semibold whitespace-nowrap ml-2 flex items-center">
                      <DollarSign className="h-4 w-4" />
                      34
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Maine lobster with broiled gruyere cheese and turned potatoes
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      nut-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      gluten-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      pescatarian
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scallops Card */}
            <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden p-0">
              <CardContent className="p-0">
                <div className="aspect-[3/2] overflow-hidden">
                  <img 
                    src="/scallop_homepg.png" 
                    alt="Scallops with Apple Fennel Salad"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">Scallops with Apple Fennel Salad</h3>
                    <div className="text-gray-900 font-semibold whitespace-nowrap ml-2 flex items-center">
                      <DollarSign className="h-4 w-4" />
                      29
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Seared scallops, vadauvan spice gravy, apple and fennel salad, charred leeks
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      nut-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      gluten-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      pescatarian
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stew Card */}
            <Card className="hover:shadow-xl transition-all duration-300 overflow-hidden p-0">
              <CardContent className="p-0">
                <div className="aspect-[3/2] overflow-hidden">
                  <img 
                    src="/stew_homepg.png" 
                    alt="Pot au Feu"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">Pot au Feu</h3>
                    <div className="text-gray-900 font-semibold whitespace-nowrap ml-2 flex items-center">
                      <DollarSign className="h-4 w-4" />
                      28
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Beef shank stew with fresh market vegetables
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      nut-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      gluten-free
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      dairy-free
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to action */}
          <div className="text-center space-y-4">
            <Button 
              onClick={() => setShowAuthForm(true)}
              className="bg-white/60 backdrop-blur-sm text-gray-700 rounded-xl text-base sm:text-lg md:text-xl lg:text-2xl font-light hover:bg-white/80 transition-all duration-300 shadow-sm hover:shadow-md px-5 sm:px-7 md:px-12 py-3 sm:py-4 md:py-5 lg:py-6 border border-gray-200"
            >
              Start building your menu for free!
            </Button>
            
            {/* Contact the Builder */}
            <div>
              <a 
                href="https://www.instagram.com/alexanderbrightman/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-base sm:text-lg md:text-xl text-gray-600 hover:text-gray-800 transition-colors inline-flex items-center gap-2 underline decoration-1 underline-offset-2 hover:decoration-2"
              >
                Contact the Builder
              </a>
            </div>
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
