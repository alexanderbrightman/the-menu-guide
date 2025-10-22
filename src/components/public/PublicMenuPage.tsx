'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tag, Filter } from 'lucide-react'
import { Profile, MenuCategory, MenuItem, Tag as TagType } from '@/lib/supabase'

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

  // Filter menu items based on selected tags and category
  const filteredItems = useMemo(() => {
    let filtered = menuItems

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === selectedCategory)
    }

    // Filter by tags (if any tags are selected, show items that have ANY of those tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const itemTagIds = item.menu_item_tags?.map(t => t.tags.id) || []
        return selectedTags.some(tagId => itemTagIds.includes(tagId))
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback>
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{profile.display_name}</h1>
                <p className="text-sm text-gray-500">@{profile.username}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Restaurant Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile.display_name}</CardTitle>
                  <CardDescription className="text-lg">@{profile.username}</CardDescription>
                  {profile.bio && (
                    <p className="text-gray-600 mt-2">{profile.bio}</p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Menu
            </CardTitle>
            <CardDescription>
              Filter items by category and dietary preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                  >
                    All Items
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dietary Tags Filter */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
            <div className="text-sm text-gray-500">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow overflow-hidden p-0">
                  <CardContent className="p-0">
                    {item.image_url && (
                      <div className="aspect-[3/2] overflow-hidden">
                        <img 
                          src={item.image_url} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        {item.price && (
                          <div className="text-green-600 font-semibold">
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
          <p>Powered by The Menu Guide</p>
        </div>
      </div>
    </div>
  )
}
