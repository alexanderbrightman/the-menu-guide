'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from '@/components/ui/image-upload'
import { Plus, Edit, Trash2, Image as ImageIcon, DollarSign, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { MenuItem, MenuCategory, Tag as TagType, supabase } from '@/lib/supabase'
import { useImageUpload } from '@/hooks/useImageUpload'

interface MenuItemWithTags extends MenuItem {
  menu_categories?: { name: string }
  menu_item_tags?: { tags: { id: number; name: string } }[]
}

interface MenuItemManagerProps {
  onDataChange?: () => void
}

export function MenuItemManager({ onDataChange }: MenuItemManagerProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<MenuItemWithTags[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemWithTags | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('none')
  const [selectedTags, setSelectedTags] = useState<number[]>([])
  const [message, setMessage] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)


  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    image_url: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  
  // Use optimized image upload hook
  const { uploading, uploadImage } = useImageUpload()

  const fetchData = async () => {
    if (!user) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`
      }

      // Fetch items, categories, and tags in parallel
      const [itemsRes, categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/menu-items', { headers }),
        fetch('/api/menu-categories', { headers }),
        fetch('/api/tags', { headers })
      ])

      const [itemsData, categoriesData, tagsData] = await Promise.all([
        itemsRes.json(),
        categoriesRes.json(),
        tagsRes.json()
      ])

      if (itemsRes.ok) {
        setItems(itemsData.items)
      }
      if (categoriesRes.ok) {
        setCategories(categoriesData.categories)
      }
      if (tagsRes.ok) {
        setTags(tagsData.tags)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage('Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user, fetchData])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      image_url: ''
    })
    setSelectedCategory('none')
    setSelectedTags([])
    setImageFile(null)
    setImagePreview('')
    setMessage('')
  }

  const handleImageSelect = (file: File, preview: string) => {
    setImageFile(file)
    setImagePreview(preview)
  }

  const handleImageRemove = () => {
    setImageFile(null)
    setImagePreview('')
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      let imageUrl = formData.image_url

      // Upload image if file is selected using optimized upload
      if (imageFile && user) {
        try {
          const result = await uploadImage(imageFile, user.id, 'menu_items')
          imageUrl = result.url
        } catch (error) {
          console.error('Image upload failed:', error)
          setMessage('Error uploading image. Please try again.')
          return
        }
      }

      const response = await fetch('/api/menu-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          image_url: imageUrl,
          category_id: selectedCategory === 'none' ? null : selectedCategory || null,
          tag_ids: selectedTags
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setItems([data.item, ...items])
        resetForm()
        setShowCreateDialog(false)
        setMessage('Menu item created successfully!')
        setTimeout(() => setMessage(''), 3000)
        onDataChange?.()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating menu item:', error)
      setMessage('Error creating menu item')
    }
  }

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem || !formData.title.trim()) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      let imageUrl = formData.image_url

      // Upload image if file is selected using optimized upload
      if (imageFile && user) {
        try {
          const result = await uploadImage(imageFile, user.id, 'menu_items')
          imageUrl = result.url
        } catch (error) {
          console.error('Image upload failed:', error)
          setMessage('Error uploading image. Please try again.')
          return
        }
      }

      const response = await fetch('/api/menu-items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: editingItem.id,
          ...formData,
          image_url: imageUrl,
          category_id: selectedCategory === 'none' ? null : selectedCategory || null,
          tag_ids: selectedTags
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setItems(items.map(item => 
          item.id === editingItem.id ? { ...item, ...data.item } : item
        ))
        setEditingItem(null)
        resetForm()
        setMessage('Menu item updated successfully!')
        setTimeout(() => setMessage(''), 3000)
        onDataChange?.()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating menu item:', error)
      setMessage('Error updating menu item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      const response = await fetch(`/api/menu-items?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        setItems(items.filter(item => item.id !== itemId))
        setMessage('Menu item deleted successfully!')
        setTimeout(() => setMessage(''), 3000)
        onDataChange?.()
      } else {
        const data = await response.json()
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting menu item:', error)
      setMessage('Error deleting menu item')
    }
  }

  const startEdit = (item: MenuItemWithTags) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      price: item.price?.toString() || '',
      image_url: item.image_url || ''
    })
    setSelectedCategory(item.category_id || 'none')
    setSelectedTags(item.menu_item_tags?.map(t => t.tags.id) || [])
    setImageFile(null)
    setImagePreview(item.image_url || '')
  }

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
          <CardDescription>Manage your menu items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading menu items...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Menu Items
              </CardTitle>
              <CardDescription>Manage your menu items and their details</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 p-0 flex items-center justify-center group"
              >
                {isMinimized ? (
                  <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:animate-bounce" />
                ) : (
                  <ChevronUp className="h-4 w-4 transition-transform duration-300 group-hover:animate-bounce" />
                )}
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isMinimized && (
          <CardContent>
          {message && (
            <div className={`mb-4 p-3 text-sm rounded-md ${
              message.includes('Error') 
                ? 'text-red-600 bg-red-50' 
                : 'text-green-600 bg-green-50'
            }`}>
              {message}
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No menu items yet</p>
              <p className="text-sm">Create your first menu item to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
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
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      {item.price && (
                        <div className="flex items-center gap-1 text-gray-900 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          {item.price.toFixed(2)}
                        </div>
                      )}
                      
                      {item.menu_categories && (
                        <Badge variant="secondary">
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
        </CardContent>
        )}
      </Card>

      {/* Create Item Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Menu Item</DialogTitle>
            <DialogDescription>
              Add a new menu item with details, pricing, and dietary tags
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Item Name *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Grilled Salmon"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your menu item..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                selectedFile={imageFile}
                preview={imagePreview}
                disabled={uploading}
              />
              <div className="text-sm text-gray-500">
                Or enter an image URL:
              </div>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Dietary Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag.id)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.title.trim() || uploading}>
                {uploading ? 'Creating...' : 'Create Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update the menu item details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Item Name *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Grilled Salmon"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your menu item..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                selectedFile={imageFile}
                preview={imagePreview}
                disabled={uploading}
              />
              <div className="text-sm text-gray-500">
                Or enter an image URL:
              </div>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Dietary Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag.id)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!formData.title.trim() || uploading}>
                {uploading ? 'Updating...' : 'Update Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
