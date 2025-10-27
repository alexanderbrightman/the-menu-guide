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
      
      // Handle refresh token errors specifically
      if (error.message.includes('refresh token') || error.message.includes('Refresh Token')) {
        console.log('Refresh token invalid, clearing session')
        // Clear the session and redirect to login
        if (supabase) {
          await supabase.auth.signOut()
        }
        return { session: null, error: 'Session expired. Please sign in again.' }
      }
      
      return { session: null, error: error.message }
    }
    
    return { session, error: null }
  } catch (error: unknown) {
    console.error('Error getting session:', error)
    
    // Handle refresh token errors in catch block too
    if (error && typeof error === 'object' && 'message' in error && 
        (String(error.message).includes('refresh token') || String(error.message).includes('Refresh Token'))) {
      console.log('Refresh token invalid in catch, clearing session')
      if (supabase) {
        await supabase.auth.signOut()
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
  
  if (error && typeof error === 'object' && 'message' in error && 
      (String(error.message).includes('refresh token') || String(error.message).includes('Refresh Token'))) {
    console.log('Refresh token error detected, signing out user')
    if (supabase) {
      supabase.auth.signOut()
    }
    // Use router.replace instead of window.location to avoid adding to history stack
    // This will be handled by the auth context which has access to Next.js router
    if (typeof window !== 'undefined') {
      // Trigger a custom event that the auth context can listen to
      window.dispatchEvent(new Event('auth:refresh-error'))
    }
  }
}
