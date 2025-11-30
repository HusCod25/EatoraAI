/**
 * Error Tracking Utility
 * Provides centralized error tracking that can integrate with services like Sentry
 * Also logs critical errors to Supabase for server-side tracking
 */

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  pathname?: string;
  timestamp: string;
  userAgent?: string;
  [key: string]: unknown;
}

interface TrackedError {
  message: string;
  error: Error | unknown;
  context?: ErrorContext;
  severity?: 'error' | 'warning' | 'info';
}

class ErrorTracker {
  private enabled: boolean;
  private sentryDsn: string | null = null;
  private logToSupabase: boolean = true;
  private currentUserId: string | null = null;
  private currentUserEmail: string | null = null;

  constructor() {
    // Enable error tracking in production or when explicitly enabled
    this.enabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true';
    
    // Get Sentry DSN from environment if available
    this.sentryDsn = import.meta.env.VITE_SENTRY_DSN || null;
    
    // Log to Supabase if we have a Supabase client available
    this.logToSupabase = import.meta.env.VITE_ENABLE_SUPABASE_ERROR_LOGGING !== 'false';
  }

  /**
   * Capture an error with context
   */
  captureException = (error: Error | unknown, context?: Partial<ErrorContext>) => {
    if (!this.enabled) {
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    const errorContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      userId: this.currentUserId || context?.userId,
      userEmail: this.currentUserEmail || context?.userEmail,
      ...context,
    };

    const trackedError: TrackedError = {
      message: errorMessage,
      error,
      context: errorContext,
      severity: 'error',
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('🔴 Error Tracked:', {
        message: errorMessage,
        stack: errorStack,
        context: errorContext,
      });
    }

    // Send to Supabase error log (server-side tracking)
    if (this.logToSupabase) {
      this.logToSupabaseErrors(trackedError).catch((err) => {
        // Silently fail - don't break app if error logging fails
        if (import.meta.env.DEV) {
          console.warn('Failed to log error to Supabase:', err);
        }
      });
    }

    // TODO: Integrate with Sentry when available
    // if (this.sentryDsn && typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorContext });
    // }
  };

  /**
   * Capture a message (non-error events)
   */
  captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Partial<ErrorContext>) => {
    if (!this.enabled) {
      return;
    }

    const errorContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      userId: this.currentUserId || context?.userId,
      userEmail: this.currentUserEmail || context?.userEmail,
      ...context,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`📝 Message Tracked [${level}]:`, message, errorContext);
    }

    // Only log errors and warnings to Supabase
    if (level === 'error' && this.logToSupabase) {
      this.logToSupabaseErrors({
        message,
        error: new Error(message),
        context: errorContext,
        severity: level,
      }).catch(() => {
        // Silently fail
      });
    }
  };

  /**
   * Log error to Supabase error_logs table using aggregate_error function
   */
  private async logToSupabaseErrors(trackedError: TrackedError) {
    try {
      // Dynamic import to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Use aggregate_error function for better error tracking
      const { data, error } = await supabase.rpc('aggregate_error', {
        p_error_message: trackedError.message,
        p_error_stack: trackedError.error instanceof Error ? trackedError.error.stack : null,
        p_error_type: trackedError.error instanceof Error ? trackedError.error.constructor.name : 'Unknown',
        p_context: trackedError.context || {},
        p_user_id: trackedError.context?.userId || this.currentUserId || null,
        p_pathname: trackedError.context?.pathname || (typeof window !== 'undefined' ? window.location.pathname : null),
      });

      if (error && import.meta.env.DEV) {
        console.warn('Failed to log error to Supabase:', error);
        // Fallback to direct insert if RPC fails
        await this.fallbackErrorInsert(trackedError);
      }
    } catch (err) {
      // Silently fail - don't break the app if error logging fails
      if (import.meta.env.DEV) {
        console.warn('Error logging to Supabase failed:', err);
      }
      // Try fallback
      try {
        await this.fallbackErrorInsert(trackedError);
      } catch (fallbackErr) {
        // Final fallback - just log to console
        if (import.meta.env.DEV) {
          console.error('All error logging methods failed:', fallbackErr);
        }
      }
    }
  }

  /**
   * Fallback error insert if aggregate_error RPC fails
   */
  private async fallbackErrorInsert(trackedError: TrackedError) {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('error_logs')
      .insert({
        error_message: trackedError.message,
        error_stack: trackedError.error instanceof Error ? trackedError.error.stack : null,
        error_type: trackedError.error instanceof Error ? trackedError.error.constructor.name : 'Unknown',
        severity: trackedError.severity || 'error',
        context: trackedError.context || {},
        user_id: trackedError.context?.userId || this.currentUserId || null,
        pathname: trackedError.context?.pathname || (typeof window !== 'undefined' ? window.location.pathname : null),
        user_agent: trackedError.context?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
      });

    if (error && import.meta.env.DEV) {
      console.warn('Fallback error insert failed:', error);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser = (userId: string | null, email: string | null) => {
    this.currentUserId = userId;
    this.currentUserEmail = email;
    
    // TODO: Set user context in Sentry
    // if (window.Sentry) {
    //   window.Sentry.setUser({ id: userId, email });
    // }
  };

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb = (message: string, category?: string, level?: 'info' | 'warning' | 'error') => {
    if (!this.enabled) return;
    
    // TODO: Add breadcrumb to Sentry
    // if (window.Sentry) {
    //   window.Sentry.addBreadcrumb({ message, category, level });
    // }
  };
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

