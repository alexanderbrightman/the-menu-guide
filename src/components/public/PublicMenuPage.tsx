'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tag, ChevronDown, X, Filter } from 'lucide-react'
import { Profile, MenuCategory, MenuItem, Tag as TagType } from '@/lib/supabase'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MenuItemWithTags extends MenuItem {
  menu_categories?: { name: string }
  menu_item_tags?: { tags: { id: number; name: string } }[]
}

interface PublicMenuPageProps {
  profile: Profile
  categories: MenuCategory[]
  menuItems: MenuItemWithTags[]
  tags: TagType[]
}

export function PublicMenuPage({ profile, categories, menuItems, tags }: PublicMenuPageProps) {
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItemWithTags | null>(null)

  // Filter menu items based on selected tags and category
  const filteredItems = useMemo(() => {
    let filtered = menuItems

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === selectedCategory)
    }

    // Filter by tags (if tags are selected, show items that have ALL of those tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.menu_item_tags?.map(t => t.tags.id) || []
        return selectedTags.every(tagId => itemTagIds.includes(tagId))
      })
    }

    return filtered
  }, [menuItems, selectedCategory, selectedTags])

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const clearFilters = () => {
    setSelectedTags([])
    setSelectedCategory('all')
  }

  const hasActiveFilters = selectedTags.length > 0 || selectedCategory !== 'all'

  // Close modal on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null)
      }
    }

    if (selectedItem) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedItem])

  return (
    <div className="min-h-screen bg-white">
      {/* Large Header Photo */}
      <header className="relative">
        <div className="h-[20vh] w-full overflow-hidden bg-gray-100">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar className="h-32 w-32">
                <AvatarFallback className="text-6xl">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        
        {/* Restaurant Name - Large Title Below Photo */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          <h1 className="text-6xl font-bold text-gray-900 text-center">{profile.display_name}</h1>
          
          {profile.bio && (
            <div className="mt-1 text-center">
              <div className="text-sm text-gray-700 inline-block">
                {profile.bio.length > 100 && !isBioExpanded ? (
                  <>
                    {profile.bio.substring(0, 100)}...
                    <button
                      onClick={() => setIsBioExpanded(true)}
                      className="ml-1 text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    {profile.bio}
                    {profile.bio.length > 100 && isBioExpanded && (
                      <button
                        onClick={() => setIsBioExpanded(false)}
                        className="ml-1 text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filters */}
        <div className="mb-6">
          <div className="space-y-1.5">
            {/* Filter Menu Header */}
            <div className="mb-1.5">
              <h3 className="text-sm font-medium text-gray-600">Filter Menu</h3>
            </div>

            {/* Category Filter */}
            <div>
              <div className="overflow-x-auto scrollbar-hide scroll-smooth">
                <div className="flex flex-nowrap gap-1.5 pb-1.5">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    className="flex-shrink-0 py-[3.4px] px-[6.8px] text-[9px]"
                  >
                    All Items
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex-shrink-0 py-[3.4px] px-[6.8px] text-[9px]"
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dietary Tags Filter */}
            <div>
              <div className="overflow-x-auto scrollbar-hide scroll-smooth">
                <div className="flex flex-nowrap gap-1.5 pb-1.5">
                  {tags.map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      size="sm"
                      className="cursor-pointer flex-shrink-0 py-[3.4px] px-[6.8px] text-[9px]"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <Tag className="h-[7.2px] w-[7.2px] mr-[2.55px]" />
                      {tag.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="pt-1.5 border-t">
                  <Button variant="outline" size="sm" onClick={clearFilters} className="py-[3.4px] px-[6.8px] text-[9px]">
                    Clear All Filters
                  </Button>
                </div>
              )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
            <div className="text-xs text-gray-500">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtered)'}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Filter className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-500 mb-4">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters to see more items.'
                    : 'This menu is empty.'
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="hover:shadow-xl transition-all duration-300 overflow-hidden p-0 cursor-pointer hover:scale-105 transform"
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-0">
                    {item.image_url && (
                      <div className="aspect-[3/2] overflow-hidden">
                        <img 
                          src={item.image_url} 
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                          loading="lazy"
                          decoding="async"
                          width={400}
                          height={267}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        {item.price && (
                          <div className="text-gray-900 font-semibold whitespace-nowrap ml-2">
                            ${item.price.toFixed(2)}
                          </div>
                        )}
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      {item.menu_categories && (
                        <Badge variant="secondary" className="mb-2">
                          {item.menu_categories.name}
                        </Badge>
                      )}
                      
                      {item.menu_item_tags && item.menu_item_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.menu_item_tags.map((itemTag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {itemTag.tags.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <Link
            href="/"
            className="text-black underline hover:text-gray-800 transition-colors"
          >
            Want to show off your food?
          </Link>
        </div>
      </div>

      {/* Expanded Menu Item Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-lg z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>

            {/* Content */}
            <div className="relative">
              {/* Large Image */}
              {selectedItem.image_url && (
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={selectedItem.image_url} 
                    alt={selectedItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-8">
                {/* Title and Price */}
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-3xl font-bold text-gray-900">{selectedItem.title}</h2>
                  {selectedItem.price && (
                    <div className="text-2xl font-semibold text-gray-900">
                      ${selectedItem.price.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Category */}
                {selectedItem.menu_categories && (
                  <Badge variant="secondary" className="mb-4">
                    {selectedItem.menu_categories.name}
                  </Badge>
                )}

                {/* Description */}
                {selectedItem.description && (
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    {selectedItem.description}
                  </p>
                )}

                {/* Dietary Tags */}
                {selectedItem.menu_item_tags && selectedItem.menu_item_tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Dietary Information</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.menu_item_tags.map((itemTag, index) => (
                        <Badge key={index} variant="outline" className="text-sm">
                          <Tag className="h-3 w-3 mr-1" />
                          {itemTag.tags.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
