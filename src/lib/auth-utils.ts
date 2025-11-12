import { supabase } from './supabase'

/**
 * Check if an error is a refresh token error
 */
export function isRefreshTokenError(error: unknown): boolean {
  const errorMessage = error && typeof error === 'object' && 'message' in error 
    ? String(error.message).toLowerCase() 
    : String(error).toLowerCase()
    
  const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  const errorStatus = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0
  
  return (
    errorMessage.includes('refresh token') || 
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('invalid refresh token') ||
    errorMessage.includes('refresh token not found') ||
    errorName === 'AuthApiError' ||
    (errorName === 'AuthApiError' && (errorMessage.includes('refresh') || errorStatus === 401))
  )
}

/**
 * Safely get the current session with proper error handling for refresh token issues
 * @returns Promise<{ session: Session | null, error: string | null }>
 */
export async function getSafeSession() {
  if (!supabase) {
    return { session: null, error: 'Supabase client not initialized' }
  }
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      // Handle refresh token errors specifically
      const isRefreshTokenErr = isRefreshTokenError(error) || 
        error.code === 'PGRST301' || // PostgREST error code for auth issues
        error.status === 401
        
      if (isRefreshTokenErr) {
        // Suppress console error for refresh token errors - handled gracefully
        console.log('Refresh token invalid, clearing session')
        // Clear the session silently
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          // Ignore sign out errors - session may already be cleared
          console.log('Sign out error (ignored):', signOutError)
        }
        return { session: null, error: 'Session expired. Please sign in again.' }
      }
      
      return { session: null, error: error.message }
    }
    
    return { session, error: null }
  } catch (error: unknown) {
    // Handle refresh token errors in catch block too
    if (isRefreshTokenError(error)) {
      // Suppress console error for refresh token errors - handled gracefully
      console.log('Refresh token invalid in catch, clearing session')
      try {
        if (supabase) {
          await supabase.auth.signOut()
        }
      } catch (signOutError) {
        // Ignore sign out errors
        console.log('Sign out error (ignored):', signOutError)
      }
      return { session: null, error: 'Session expired. Please sign in again.' }
    }
    
    // Log other errors normally
    console.error('Error getting session:', error)
    return { session: null, error: 'Failed to get session' }
  }
}

/**
 * Get session token for API calls with error handling
 * @returns Promise<string | null>
 */
export async function getSessionToken(): Promise<string | null> {
  const { session, error } = await getSafeSession()
  
  if (error) {
    console.error('Cannot get session token:', error)
    return null
  }
  
  return session?.access_token || null
}

/**
 * Handle authentication errors consistently across the app
 * @param error - The error that occurred
 * @param context - Context where the error occurred (for logging)
 */
export function handleAuthError(error: unknown, context: string = 'Unknown') {
  // Only log non-refresh-token errors to console
  if (!isRefreshTokenError(error)) {
    console.error(`Auth error in ${context}:`, error)
  } else {
    console.log(`Refresh token error in ${context} (handled gracefully)`)
  }
  
  if (isRefreshTokenError(error)) {
    console.log('Refresh token error detected, signing out user')
    try {
      if (supabase) {
        supabase.auth.signOut().catch(() => {
          // Ignore sign out errors - session may already be cleared
        })
      }
    } catch (signOutError) {
      // Ignore sign out errors
      console.log('Sign out error (ignored):', signOutError)
    }
    // Use router.replace instead of window.location to avoid adding to history stack
    // This will be handled by the auth context which has access to Next.js router
    if (typeof window !== 'undefined') {
      // Trigger a custom event that the auth context can listen to
      window.dispatchEvent(new Event('auth:refresh-error'))
    }
  }
}
