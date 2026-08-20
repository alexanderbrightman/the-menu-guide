'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Settings, Eye, EyeOff, Trash2, AlertTriangle, DollarSign, User, Coins } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { SubscriptionDetailsCard } from './SubscriptionDetailsCard'
import { SubscriptionExpiryWarning } from '@/components/subscription/SubscriptionExpiryWarning'
import { validatePremiumAccess } from '@/lib/premium-validation'
import { cn } from '@/lib/utils'
import { UpgradeCard } from '@/components/payment/UpgradeCard'
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMenuTheme } from '@/hooks/useMenuTheme'

interface SettingsDialogProps {
  triggerClassName?: string
  children?: React.ReactNode
  listenForGlobalOpen?: boolean
}

export function SettingsDialog({ triggerClassName, children, listenForGlobalOpen = false }: SettingsDialogProps) {
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

  useEffect(() => {
    if (!listenForGlobalOpen) return
    const handler = () => setShowSettings(true)
    window.addEventListener('open-settings', handler)
    return () => window.removeEventListener('open-settings', handler)
  }, [listenForGlobalOpen])

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
  }, [profile?.username])

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



  const {
    menuBackgroundColor,
    contrastColor,
    primaryTextClass,
    secondaryTextClass,
    mutedTextClass,
    fieldClass,
    groupedClass,
    accentButtonClass,
    hairline,
    isDarkBackground
  } = useMenuTheme(profile)

  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className={cn(triggerClassName)}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Settings</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="w-full max-w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-xl border-0 p-0 gap-0 sm:rounded-[18px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.20)] transition-all duration-300 [&>button]:hidden flex flex-col"
        style={{
          backgroundColor: menuBackgroundColor,
          color: contrastColor,
        }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: `0.5px solid ${hairline}` }}
        >
          <span className="w-[72px]" />

          <DialogTitle className={`text-[17px] font-semibold tracking-tight ${primaryTextClass}`}>
            Settings
          </DialogTitle>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowSettings(false)}
            className="text-base font-semibold hover:bg-transparent px-2 -mr-2 text-blue-500 hover:text-blue-600"
          >
            Done
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          {/* Edit Username */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className={`h-4 w-4 ${mutedTextClass}`} />
              <h3 className={`text-sm font-semibold ${primaryTextClass}`}>Restaurant Username</h3>
            </div>
            <div className={`p-4 ${groupedClass}`}>
              <div className="pl-0 space-y-3">
                <div className={`text-sm ${secondaryTextClass}`}>
                  Your public menu URL:{' '}
                  <a
                    href={`/menu/${username || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover:underline whitespace-nowrap ${primaryTextClass}`}
                  >
                    themenuguide.com/menu/<strong>{username || 'username'}</strong>
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`pr-10 ${fieldClass} text-base`}
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
                <p className={`text-xs ${mutedTextClass}`}>
                  When changed, the unique QR code changes as well
                </p>
                {usernameMessage && (
                  <p className={`text-xs ${usernameStatus === 'available'
                    ? 'text-green-600'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'text-red-600'
                      : secondaryTextClass
                    }`}>
                    {usernameMessage}
                  </p>
                )}
                {(usernameStatus === 'available' && username !== profile?.username) && (
                  <Button
                    onClick={handleUpdateUsername}
                    disabled={usernameLoading}
                    className={`${accentButtonClass} h-10 px-5`}
                  >
                    {usernameLoading ? 'Updating…' : 'Save Username'}
                  </Button>
                )}
              </div>
            </div>
          </div>



          {/* Menu Visibility Settings */}
          <div className="space-y-4">
            <h3 className={`text-sm font-semibold ${primaryTextClass}`}>Menu Configuration</h3>
            <div className="space-y-3">
              {/* Currency Selector */}
              <div className={`flex h-11 items-center justify-between px-3 ${groupedClass}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Coins className={`h-4 w-4 ${mutedTextClass}`} />
                    <span className={`text-sm font-medium ${primaryTextClass}`}>Currency</span>
                  </div>
                </div>
                <Select
                  value={currency}
                  onValueChange={handleUpdateCurrency}
                  disabled={currencyLoading}
                >
                  <SelectTrigger className="w-auto border-0 bg-transparent h-9 shadow-none focus:ring-0 gap-1">
                    <SelectValue placeholder="Select" />
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

              {/* Show Prices Toggle */}
              <div className={`flex items-center justify-between p-3 ${groupedClass}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`h-4 w-4 ${mutedTextClass}`} />
                    <span className={`text-sm font-medium ${primaryTextClass}`}>
                      Show Prices
                    </span>
                  </div>
                  <p className={`text-xs ${secondaryTextClass}`}>
                    {showPrices ? 'Visible on menu' : 'Hidden on menu'}
                  </p>
                </div>
                <Switch
                  checked={showPrices}
                  onCheckedChange={handleToggleShowPrices}
                  disabled={priceLoading}
                  className={isDarkBackground ? "data-[state=unchecked]:bg-zinc-700 data-[state=unchecked]:border-zinc-600" : ""}
                />
              </div>

              {/* Menu is Public Toggle */}
              <div className={`flex items-center justify-between p-3 ${groupedClass}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isPublic && hasPremiumAccess ? (
                      <Eye className={`h-4 w-4 ${mutedTextClass}`} />
                    ) : (
                      <EyeOff className={`h-4 w-4 ${mutedTextClass}`} />
                    )}
                    <span className={`text-sm font-medium ${primaryTextClass}`}>
                      Public Visibility
                    </span>
                  </div>
                  <p className={`text-xs ${secondaryTextClass}`}>
                    {isPublic && hasPremiumAccess ? 'Menu is live' : 'Menu is private'}
                  </p>
                </div>
                <Switch
                  checked={isPublic && hasPremiumAccess}
                  onCheckedChange={handleTogglePublic}
                  disabled={loading || !hasPremiumAccess}
                  className={isDarkBackground ? "data-[state=unchecked]:bg-zinc-700 data-[state=unchecked]:border-zinc-600" : ""}
                />
              </div>

              {!hasPremiumAccess && (
                <div
                  className="p-3 rounded-[12px] flex gap-2"
                  style={{
                    backgroundColor: isDarkBackground ? 'rgba(255,159,10,0.16)' : 'rgba(255,159,10,0.12)',
                  }}
                >
                  <AlertTriangle className="h-4 w-4 text-[#FF9F0A] flex-none mt-0.5" />
                  <span className={`text-[13px] ${secondaryTextClass}`}>
                    Premium is required for a public menu.
                  </span>
                </div>
              )}
            </div>
          </div>



          {/* Subscription Details */}
          <div className="space-y-4">
            <h3 className={`text-sm font-semibold ${primaryTextClass}`}>Subscription</h3>
            {hasPremiumAccess ? (
              <div className={`p-4 ${groupedClass}`}>
                <SubscriptionExpiryWarning />
                <SubscriptionDetailsCard />
              </div>
            ) : (
              <UpgradeCard />
            )}
          </div>

          {/* Delete Account Section */}
          <div className="space-y-4 pt-4">
            <Button
              variant="ghost"
              className="w-full h-11 rounded-full border-0 text-[#FF3B30] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30]"
              onClick={handleDeleteAllMenuItems}
              disabled={deleteItemsLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteItemsLoading ? 'Deleting...' : 'Delete All Menu Items'}
            </Button>

            {dangerMessage && (
              <div className="text-xs text-center text-orange-600">
                {dangerMessage}
              </div>
            )}
          </div>

          <div className="pb-10 sm:pb-0" />
        </div>
      </DialogContent >
    </Dialog >
  )
}

