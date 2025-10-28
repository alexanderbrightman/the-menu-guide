'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react'
import { MenuCategory, supabase } from '@/lib/supabase'

interface CategoryManagerProps {
  onDataChange?: () => void
}

export function CategoryManager({ onDataChange }: CategoryManagerProps) {
  const { user } = useAuth()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [message, setMessage] = useState('')

  const fetchCategories = async () => {
    if (!user) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      const response = await fetch('/api/menu-categories', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        setCategories(data.categories)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setMessage('Error fetching categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [user, fetchCategories])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      const response = await fetch('/api/menu-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setCategories([...categories, data.category])
        setCategoryName('')
        setShowCreateDialog(false)
        setMessage('Category created successfully!')
        setTimeout(() => setMessage(''), 3000)
        onDataChange?.()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      setMessage('Error creating category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      const response = await fetch(`/api/menu-categories?id=${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== categoryId))
        setMessage('Category deleted successfully!')
        setTimeout(() => setMessage(''), 3000)
        onDataChange?.()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      setMessage('Error deleting category')
    }
  }

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !categoryName.trim()) return
    if (!supabase) {
      setMessage('Error: Supabase client not available')
      return
    }

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMessage('Error: Not authenticated')
        return
      }

      const response = await fetch('/api/menu-categories', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          id: editingCategory.id,
          name: categoryName.trim() 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCategories(categories.map(cat => 
          cat.id === editingCategory.id ? { ...cat, name: categoryName.trim() } : cat
        ))
        setEditingCategory(null)
        setCategoryName('')
        setMessage('Category updated successfully!')
        setTimeout(() => setMessage(''), 3000)
        onDataChange?.()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating category:', error)
      setMessage('Error updating category')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Menu Categories</CardTitle>
          <CardDescription>Organize your menu items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading categories...</p>
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
                <FolderOpen className="h-5 w-5" />
                Menu Categories
              </CardTitle>
              <CardDescription>Organize your menu items into categories</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
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

          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No categories yet</p>
              <p className="text-sm">Create your first category to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category)
                            setCategoryName(category.name)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your menu items (e.g., Appetizers, Entrees, Desserts)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Appetizers, Entrees, Desserts"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!categoryName.trim()}>
                Create Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Appetizers, Entrees, Desserts"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!categoryName.trim()}>
                Update Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
