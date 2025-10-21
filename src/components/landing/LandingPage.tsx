'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/AuthForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Utensils, 
  Smartphone, 
  Users, 
  Star, 
  ArrowRight,
  ChefHat,
  QrCode,
  Shield
} from 'lucide-react'

export function LandingPage() {
  const [showAuthForm, setShowAuthForm] = useState(false)

  const features = [
    {
      icon: <Utensils className="h-8 w-8 text-amber-600" />,
      title: "Digital Menu Creation",
      description: "Transform your traditional menu into a beautiful, interactive digital experience that customers will love."
    },
    {
      icon: <QrCode className="h-8 w-8 text-blue-600" />,
      title: "QR Code Integration",
      description: "Generate QR codes that instantly connect customers to your menu - no downloads required."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-green-600" />,
      title: "Mobile Optimized",
      description: "Your menu looks perfect on any device, ensuring a seamless experience for every customer."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Dietary Filtering",
      description: "Help customers find exactly what they need with powerful filtering for dietary restrictions and preferences."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Professional Features",
      description: "Access advanced analytics, custom branding, and priority support with our Pro subscription."
    },
    {
      icon: <Star className="h-8 w-8 text-yellow-600" />,
      title: "Easy Management",
      description: "Update your menu in real-time, add photos, manage categories, and track customer engagement effortlessly."
    }
  ]

  return (
    <>
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-gray-900">The Menu Guide</h1>
            </div>
            <Button 
              onClick={() => setShowAuthForm(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 min-h-screen">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-100/20 to-orange-100/20"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your
              <span className="text-amber-600 block">Restaurant Menu</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Create beautiful, interactive digital menus that delight your customers and boost your business. 
              From QR codes to dietary filtering, we make menu management effortless.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button 
                onClick={() => setShowAuthForm(true)}
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-200"
              >
                View Demo Menu
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 mb-2">500+</div>
                <div className="text-gray-600">Restaurants Served</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 mb-2">50K+</div>
                <div className="text-gray-600">Menu Views Monthly</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 mb-2">98%</div>
                <div className="text-gray-600">Customer Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools you need to create, manage, and optimize your digital menu experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Menu?
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Join hundreds of restaurants already using The Menu Guide to enhance their customer experience and grow their business.
          </p>
          <Button 
            onClick={() => setShowAuthForm(true)}
            size="lg"
            className="bg-white text-amber-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Get Started Today - It&apos;s Free!
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <ChefHat className="h-6 w-6 text-amber-400" />
              <span className="text-xl font-bold">The Menu Guide</span>
            </div>
            <div className="text-gray-400">
              © 2024 The Menu Guide. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Form Dialog */}
      <Dialog open={showAuthForm} onOpenChange={setShowAuthForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-gray-900">
              Welcome to The Menu Guide
            </DialogTitle>
          </DialogHeader>
          <AuthForm onSuccess={() => setShowAuthForm(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
