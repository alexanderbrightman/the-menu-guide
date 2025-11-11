import { supabase } from './supabase'

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
      console.error('Session error:', error)
      
      // Handle refresh token errors specifically - check multiple error message formats
      const errorMessage = error.message?.toLowerCase() || ''
      const isRefreshTokenError = 
        errorMessage.includes('refresh token') || 
        errorMessage.includes('refresh_token') ||
        errorMessage.includes('invalid refresh token') ||
        error.code === 'PGRST301' || // PostgREST error code for auth issues
        error.status === 401
        
      if (isRefreshTokenError) {
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
    console.error('Error getting session:', error)
    
    // Handle refresh token errors in catch block too
    const errorMessage = error && typeof error === 'object' && 'message' in error 
      ? String(error.message).toLowerCase() 
      : String(error).toLowerCase()
      
    const isRefreshTokenError = 
      errorMessage.includes('refresh token') || 
      errorMessage.includes('refresh_token') ||
      errorMessage.includes('invalid refresh token') ||
      (error && typeof error === 'object' && 'name' in error && error.name === 'AuthApiError')
      
    if (isRefreshTokenError) {
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
  console.error(`Auth error in ${context}:`, error)
  
  // Check if it's a refresh token error
  const errorMessage = error && typeof error === 'object' && 'message' in error 
    ? String(error.message).toLowerCase() 
    : String(error).toLowerCase()
    
  const isRefreshTokenError = 
    errorMessage.includes('refresh token') || 
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('invalid refresh token') ||
    errorMessage.includes('refresh token not found') ||
    (error && typeof error === 'object' && 'name' in error && error.name === 'AuthApiError' && 
     (errorMessage.includes('refresh') || (error as any).status === 401))
  
  if (isRefreshTokenError) {
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
