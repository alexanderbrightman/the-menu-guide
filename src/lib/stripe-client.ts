import { getSessionToken } from '@/lib/auth-utils'

const PORTAL_TIMEOUT_MS = 10_000

/**
 * Redirect the signed-in user to Stripe's Customer Portal.
 * Billing changes (cancel, reactivate, payment method, invoices) happen there;
 * webhooks keep our profiles table in sync.
 */
export async function openCustomerPortal(): Promise<void> {
  const token = await getSessionToken()
  if (!token) {
    throw new Error('Not authenticated')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PORTAL_TIMEOUT_MS)

  try {
    const res = await fetch('/api/stripe/customer-portal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }

    if (res.ok && typeof data.url === 'string') {
      window.location.href = data.url
      return
    }

    throw new Error(data.error || 'Unable to open billing portal')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Billing portal request timed out. Please try again.')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
