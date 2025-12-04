'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Eye, EyeOff, Trash2, AlertTriangle, Check, DollarSign, User, Coins } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubscriptionDetailsCard } from './SubscriptionDetailsCard'
import { SubscriptionExpiryWarning } from '@/components/subscription/SubscriptionExpiryWarning'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { cn } from '@/lib/utils'
import { UpgradeCard } from '@/components/payment/UpgradeCard'
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SettingsDialogProps {
  triggerClassName?: string
}

export function SettingsDialog({ triggerClassName }: SettingsDialogProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const [isPublic, setIsPublic] = useState(profile?.is_public || false)
  const [showPrices, setShowPrices] = useState(profile?.show_prices !== false) // default to true
  const [currency, setCurrency] = useState(profile?.currency || DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [deleteItemsLoading, setDeleteItemsLoading] = useState(false)
  const [dangerMessage, setDangerMessage] = useState('')
  const [username, setUsername] = useState(profile?.username || '')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    profile?.username ? 'available' : 'idle'
  )
  const [usernameMessage, setUsernameMessage] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)

  // Check premium access using the enhanced validation
  const premiumValidation = validatePremiumAccess(profile, 'menu visibility')
  const hasPremiumAccess = premiumValidation.isValid

  // Sync isPublic, showPrices, username, and currency state with profile data
  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public ?? false)
      setShowPrices(profile.show_prices !== false) // default to true if undefined
      setUsername(profile.username || '')
      setCurrency(profile.currency || DEFAULT_CURRENCY)
      if (profile.username) {
        setUsernameStatus('available')
        setUsernameMessage('✓ This is your current username')
      }
    }
  }, [profile])

  // Username validation
  const validateUsername = useCallback(async (usernameValue: string) => {
    if (!usernameValue.trim()) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }

    // Basic validation
    if (usernameValue.length < 3) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be at least 3 characters')
      return
    }

    if (usernameValue.length > 20) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be less than 20 characters')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(usernameValue)) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username can only contain letters, numbers, hyphens, and underscores')
      return
    }

    // If username hasn't changed from current profile, it's available
    if (usernameValue === profile?.username) {
      setUsernameStatus('available')
      setUsernameMessage('✓ This is your current username')
      return
    }

    setUsernameStatus('checking')
    setUsernameMessage('Checking availability...')

    try {
      if (!supabase) {
        setUsernameStatus('idle')
        setUsernameMessage('')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/validate-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ username: usernameValue.trim() })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.available) {
          setUsernameStatus('available')
          setUsernameMessage('✓ Username is available')
        } else {
          setUsernameStatus('taken')
          setUsernameMessage(`✗ ${result.message}`)
        }
      } else {
        setUsernameStatus('idle')
        setUsernameMessage('')
      }
    } catch (error) {
      console.error('Username validation error:', error)
      setUsernameStatus('idle')
      setUsernameMessage('')
    }
  }, [profile?.username, supabase])

  // Debounce username validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateUsername(username)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, validateUsername])

  const handleUpdateUsername = async () => {
    if (!user || !supabase) return

    // Check username status before proceeding
    if (usernameStatus === 'taken') {
      setMessage('Username is already taken. Please choose a different one.')
      return
    }

    if (usernameStatus === 'invalid') {
      setMessage('Please fix the username validation errors before saving.')
      return
    }

    if (usernameStatus === 'checking') {
      setMessage('Please wait for username validation to complete.')
      return
    }

    if (usernameStatus !== 'available' && username !== profile?.username) {
      setMessage('Please enter a valid username.')
      return
    }

    setUsernameLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      setMessage('Username updated successfully!')
      await refreshProfile()

      setTimeout(() => {
        setMessage('')
      }, 3000)
    } catch (error) {
      console.error('Error updating username:', error)
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setUsernameLoading(false)
    }
  }

  const handleUpdateCurrency = async (newCurrency: string) => {
    if (!user || !supabase) return

    setCurrencyLoading(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency: newCurrency
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Currency updated to ${newCurrency}`)
        setCurrency(newCurrency)
        await refreshProfile()
        setTimeout(() => setMessage(''), 3000)
      } else {
        throw new Error(data.error || 'Failed to update currency')
      }
    } catch (error) {
      console.error('Error updating currency:', error)
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      setCurrency(profile?.currency || DEFAULT_CURRENCY)
    } finally {
      setCurrencyLoading(false)
    }
  }

  const handleToggleShowPrices = async (checked: boolean) => {
    if (!user || !supabase) return

    setPriceLoading(true)
    setMessage('')

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Update profile show_prices setting
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          show_prices: checked
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(checked ? 'Prices are now visible on your menu' : 'Prices are now hidden on your menu')

        // Immediately update the local state
        setShowPrices(checked)

        // Refresh profile data from the server
        await refreshProfile()

        // Clear the message after a few seconds
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      // Revert the switch state
      setShowPrices(!checked)
    } finally {
      setPriceLoading(false)
    }
  }

  const handleTogglePublic = async (checked: boolean) => {
    if (!user || !supabase) return

    setLoading(true)
    setMessage('')

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Update profile visibility
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_public: checked
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(checked ? 'Menu is now public and visible to customers!' : 'Menu is now private.')

        // Immediately update the local state
        setIsPublic(checked)

        // Refresh profile data from the server
        await refreshProfile()

        // Clear the message after a few seconds
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      // Revert the switch state
      setIsPublic(!checked)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAllMenuItems = async () => {
    if (!user || !supabase) return

    setDeleteItemsLoading(true)
    setDangerMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/menu-items?all=true', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        const deletedCount = data.deletedCount ?? data.count ?? 0
        const categoriesDeletedCount = data.categoriesDeletedCount ?? 0
        let message = `Deleted ${deletedCount} menu item${deletedCount === 1 ? '' : 's'}`
        if (categoriesDeletedCount > 0) {
          message += ` and ${categoriesDeletedCount} categor${categoriesDeletedCount === 1 ? 'y' : 'ies'}`
        }
        message += '.'
        setDangerMessage(message)
      } else {
        throw new Error(data.error || 'Failed to delete menu items')
      }
    } catch (error) {
      console.error('Error deleting menu items:', error)
      setDangerMessage(error instanceof Error ? error.message : 'An error occurred while deleting menu items')
    } finally {
      setDeleteItemsLoading(false)
    }
  }

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn(triggerClassName)}>
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
          <span className="sm:hidden">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-4 overflow-hidden border border-black">
        <DialogHeader className="space-y-1 border-b border-black pb-4">
          <DialogTitle className="text-base font-semibold text-center">Account Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
          {/* Edit Username */}
          <div className="space-y-3 border-b border-black pb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-semibold">Edit Restaurant Username</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`pr-10 border border-black ${usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'border-red-600 focus:border-red-600'
                    : usernameStatus === 'available'
                      ? 'border-green-600 focus:border-green-600'
                      : ''
                    }`}
                />
                {usernameStatus === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin border border-blue-600 border-t-transparent"></div>
                  </div>
                )}
                {usernameStatus === 'available' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">✓</div>
                )}
                {usernameStatus === 'taken' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">✗</div>
                )}
              </div>
              {usernameMessage && (
                <p className={`text-xs ${usernameStatus === 'available'
                  ? 'text-green-600'
                  : usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'text-red-600'
                    : 'text-gray-600'
                  }`}>
                  {usernameMessage}
                </p>
              )}
              <Button
                onClick={handleUpdateUsername}
                disabled={usernameLoading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid' || username === profile?.username}
                className="w-full border border-black"
              >
                {usernameLoading ? 'Updating...' : 'Update Username'}
              </Button>
            </div>
          </div>

          {/* Menu Visibility Settings */}
          <div className="space-y-4">
            {/* Currency Selector */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Currency</span>
                </div>
                <p className="text-sm text-gray-600">
                  Select the currency for your menu prices
                </p>
              </div>
              <div className="w-[140px]">
                <Select
                  value={currency}
                  onValueChange={handleUpdateCurrency}
                  disabled={currencyLoading}
                >
                  <SelectTrigger className="border-black">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Show Prices Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">
                    {showPrices ? 'Show Prices' : 'Hide Prices'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {showPrices
                    ? 'Prices are displayed on your public menu'
                    : 'Prices are hidden on your public menu'
                  }
                </p>
              </div>
              <Switch
                checked={showPrices}
                onCheckedChange={handleToggleShowPrices}
                disabled={priceLoading}
              />
            </div>

            {/* Menu is Public Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  {isPublic && hasPremiumAccess ? (
                    <Eye className="h-4 w-4 text-gray-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-600" />
                  )}
                  <span className="text-sm font-medium">
                    {isPublic && hasPremiumAccess ? 'Menu is Public' : 'Menu is Private'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {isPublic && hasPremiumAccess
                    ? 'Customers can view your menu at /menu/' + profile?.username
                    : 'Your menu is only visible to you'
                  }
                </p>
              </div>
              <Switch
                checked={isPublic && hasPremiumAccess}
                onCheckedChange={handleTogglePublic}
                disabled={loading || !hasPremiumAccess}
              />
            </div>

            {!hasPremiumAccess && (
              <Alert className="border border-orange-600 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm text-orange-800">
                  <strong>Premium Required:</strong> {premiumValidation.error || 'You need a Premium subscription to make your menu public.'}
                </AlertDescription>
              </Alert>
            )}

            {message && (
              <div className={`border p-3 text-sm ${message.includes('error') || message.includes('Error') || message.includes('Failed')
                ? 'bg-red-50 text-red-600 border-red-600'
                : 'bg-green-50 text-green-600 border-green-600'
                }`}>
                {message}
              </div>
            )}
          </div>

          <div className="border-t border-black pt-4">
            {/* Subscription Details */}
            {hasPremiumAccess ? (
              <>
                <SubscriptionExpiryWarning />
                <SubscriptionDetailsCard />
              </>
            ) : (
              <UpgradeCard />
            )}
          </div>

          {/* Delete Account Section */}
          <div className="border-t border-black pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-800">Delete All Menu Items</h3>
            </div>
            <p className="text-sm text-orange-700">
              Remove every menu item, category, and stored menu image.
            </p>
            <Alert className="border border-orange-600 bg-orange-100">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800">
                <strong>Warning:</strong> This cannot be undone. Diners will no longer see any items on your public menu.
              </AlertDescription>
            </Alert>
            <div className="space-y-2 text-sm text-orange-700 ml-4">
              <p className="font-medium uppercase tracking-wide text-orange-800">This will remove:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  All menu items and their descriptions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  All menu categories
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Menu item images stored in storage
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Dietary tags attached to menu items
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="w-full border border-orange-600 text-orange-700 hover:bg-orange-100"
              onClick={handleDeleteAllMenuItems}
              disabled={deleteItemsLoading}
            >
              {deleteItemsLoading ? 'Deleting menu items...' : 'Delete All Menu Items'}
            </Button>
          </div>

          {dangerMessage && (
            <div className={`border p-3 text-sm ${dangerMessage.toLowerCase().includes('error')
              ? 'bg-red-100 text-red-700 border-red-600'
              : 'bg-orange-100 text-orange-700 border-orange-600'
              }`}>
              {dangerMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-black">
            <Button variant="outline" className="border border-black" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
