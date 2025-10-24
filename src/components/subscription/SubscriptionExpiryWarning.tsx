'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, Calendar } from 'lucide-react'
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionStatus'
import { useAuth } from '@/contexts/AuthContext'

interface SubscriptionExpiryWarningProps {
  showCard?: boolean
  className?: string
}

export function SubscriptionExpiryWarning({ showCard = false, className = '' }: SubscriptionExpiryWarningProps) {
  const { profile } = useAuth()
  const expiryInfo = useSubscriptionExpiry(7) // Warn 7 days before expiry
  
  // Don't show if no subscription or not expiring soon
  if (!profile || profile.subscription_status !== 'pro' || !expiryInfo.isExpiringSoon) {
    return null
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSeverity = () => {
    if (expiryInfo.daysUntilExpiry === null) return 'info'
    if (expiryInfo.daysUntilExpiry <= 1) return 'error'
    if (expiryInfo.daysUntilExpiry <= 3) return 'warning'
    return 'info'
  }

  const severity = getSeverity()
  
  const alertContent = (
    <Alert className={`border-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-200 bg-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-50`}>
      <AlertTriangle className={`h-4 w-4 text-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-600`} />
      <AlertDescription className={`text-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-800`}>
        <div className="flex items-center justify-between">
          <div>
            <strong>
              {expiryInfo.daysUntilExpiry === 1 
                ? 'Subscription expires tomorrow!'
                : `Subscription expires in ${expiryInfo.daysUntilExpiry} days`
              }
            </strong>
            <p className="text-sm mt-1">
              Your Premium features will be disabled on {expiryInfo.expiryDate && formatDate(expiryInfo.expiryDate)}.
              {expiryInfo.daysUntilExpiry === 1 && ' Please renew immediately to avoid service interruption.'}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Open subscription management
              window.location.href = '/dashboard'
            }}
            className={`border-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-300 text-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-700 hover:bg-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-100`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )

  if (showCard) {
    return (
      <Card className={`border-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-200 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-800 flex items-center gap-2`}>
            <Clock className="h-5 w-5" />
            Subscription Expiring Soon
          </CardTitle>
          <CardDescription className={`text-${severity === 'error' ? 'red' : severity === 'warning' ? 'orange' : 'blue'}-700`}>
            Your Premium subscription is about to expire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertContent}
        </CardContent>
      </Card>
    )
  }

  return <div className={className}>{alertContent}</div>
}

/**
 * Simple subscription expiry indicator for headers/navbars
 */
export function SubscriptionExpiryIndicator() {
  const { profile } = useAuth()
  const expiryInfo = useSubscriptionExpiry(3) // Show indicator 3 days before
  
  if (!profile || profile.subscription_status !== 'pro' || !expiryInfo.isExpiringSoon) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
      <Clock className="h-3 w-3" />
      <span>
        {expiryInfo.daysUntilExpiry === 1 
          ? 'Expires tomorrow'
          : `${expiryInfo.daysUntilExpiry} days left`
        }
      </span>
    </div>
  )
}
