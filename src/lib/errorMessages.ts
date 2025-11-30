/**
 * Centralized error messages for better UX and consistency
 */

export const ERROR_MESSAGES = {
  // Authentication errors
  auth: {
    INVALID_CREDENTIALS: 'Invalid email or password. If you just signed up, please check your email to verify your account first.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address. Check your inbox for the verification link.',
    WEAK_PASSWORD: 'Password must be at least 6 characters long.',
    EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Try signing in instead.',
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection and try again.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },

  // API errors
  api: {
    GENERIC: 'Something went wrong. Please try again.',
    TIMEOUT: 'The request took too long. Please try again.',
    RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
    NOT_FOUND: 'The requested resource was not found.',
    UNAUTHORIZED: 'You do not have permission to perform this action.',
    SERVER_ERROR: 'Our servers are experiencing issues. Please try again later.',
  },

  // Meal generation errors
  meal: {
    GENERATION_FAILED: 'Failed to generate meal. Please try again.',
    INVALID_INPUT: 'Please check your input values and try again.',
    NO_INGREDIENTS: 'Please select at least one ingredient.',
    LIMIT_REACHED: 'You have reached your meal generation limit for this week. Upgrade your plan for more meals!',
  },

  // Ingredient errors
  ingredient: {
    SUBMISSION_FAILED: 'Failed to submit ingredient. Please try again.',
    DUPLICATE: 'This ingredient already exists in the database.',
    INVALID_DATA: 'Please check all fields and try again.',
    SUBMISSION_RATE_LIMIT: 'You can only submit one ingredient per 24 hours. Please try again tomorrow.',
  },

  // Subscription errors
  subscription: {
    LOAD_FAILED: 'Failed to load subscription information.',
    UPDATE_FAILED: 'Failed to update subscription.',
    NOT_FOUND: 'Subscription information not found.',
  },

  // User errors
  user: {
    PROFILE_UPDATE_FAILED: 'Failed to update profile. Please try again.',
    PASSWORD_UPDATE_FAILED: 'Failed to update password. Please check your current password.',
    DELETE_FAILED: 'Failed to delete account. Please try again.',
  },
};

/**
 * Get user-friendly error message from error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('invalid login credentials') || message.includes('invalid password')) {
      return ERROR_MESSAGES.auth.INVALID_CREDENTIALS;
    }
    if (message.includes('email not confirmed') || message.includes('email not verified')) {
      return ERROR_MESSAGES.auth.EMAIL_NOT_VERIFIED;
    }
    if (message.includes('password') && message.includes('weak')) {
      return ERROR_MESSAGES.auth.WEAK_PASSWORD;
    }
    if (message.includes('user already registered') || message.includes('email already exists')) {
      return ERROR_MESSAGES.auth.EMAIL_ALREADY_EXISTS;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.auth.NETWORK_ERROR;
    }
    if (message.includes('session') || message.includes('token')) {
      return ERROR_MESSAGES.auth.SESSION_EXPIRED;
    }
    
    // API errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ERROR_MESSAGES.api.RATE_LIMIT;
    }
    if (message.includes('timeout')) {
      return ERROR_MESSAGES.api.TIMEOUT;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_MESSAGES.api.NOT_FOUND;
    }
    if (message.includes('unauthorized') || message.includes('403')) {
      return ERROR_MESSAGES.api.UNAUTHORIZED;
    }
    if (message.includes('server error') || message.includes('500')) {
      return ERROR_MESSAGES.api.SERVER_ERROR;
    }
    
    // Return original message if no match
    return error.message;
  }
  
  // Handle non-Error objects
  if (typeof error === 'string') {
    return error;
  }
  
  return ERROR_MESSAGES.auth.UNKNOWN_ERROR;
}

