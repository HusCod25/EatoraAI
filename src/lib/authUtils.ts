import { logger } from './logger';

/**
 * Cleanup all auth-related data from browser storage
 * This prevents authentication limbo states
 */
export const cleanupAuthState = () => {
  try {
    logger.debug('🧹 AUTH DEBUG: Starting auth state cleanup...');
    
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        logger.debug('🧹 AUTH DEBUG: Removing key:', key);
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          logger.debug('🧹 AUTH DEBUG: Removing sessionStorage key:', key);
          sessionStorage.removeItem(key);
        }
      });
    }
    
    logger.debug('🧹 AUTH DEBUG: Auth state cleanup completed');
  } catch (error) {
    logger.warn('🧹 AUTH DEBUG: Auth cleanup failed:', error);
  }
};

/**
 * Robust sign out that handles auth state cleanup
 */
export const signOutRobustly = async (supabase: any) => {
  try {
    logger.debug('Starting robust sign out...');
    
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt global sign out (ignore errors)
    try {
      await supabase.auth.signOut({ scope: 'global' });
      logger.debug('Global sign out successful');
    } catch (err) {
      // Continue even if this fails
      logger.warn('Global sign out failed:', err);
    }
    
    // Force page reload for clean state
    logger.debug('Redirecting to sign in page...');
    window.location.href = '/signin';
  } catch (error) {
    logger.error('Error during sign out:', error);
    // Still redirect even if there was an error
    window.location.href = '/signin';
  }
};

/**
 * Switch to a different account by cleaning state and redirecting
 */
export const switchAccount = () => {
  try {
    logger.debug('Switching account...');
    cleanupAuthState();
    window.location.href = '/signin';
  } catch (error) {
    logger.error('Error switching account:', error);
    window.location.href = '/signin';
  }
};