/**
 * Logger utility for handling console output
 * - In development: logs everything
 * - In production: only logs errors and warnings, not debug info
 * - Integrates with error tracking for critical errors
 */

import { errorTracker } from './errorTracking';

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logging - only in development
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info logging - only in development
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning logging - shown in both dev and prod
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Error logging - always shown, and sent to error tracking in production
   */
  error: (...args: unknown[]) => {
    console.error(...args);
    
    // Track errors for monitoring (in production or when enabled)
    if (!isDevelopment || import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true') {
      // Try to extract error object from args
      const errorArg = args.find(arg => arg instanceof Error);
      const error = errorArg || (args[0] instanceof Error ? args[0] : new Error(String(args[0])));
      
      errorTracker.captureException(error, {
        additionalArgs: args.filter(arg => !(arg instanceof Error)),
      }).catch(() => {
        // Silently fail - don't break the app if error tracking fails
      });
    }
  },

  /**
   * Group logging - only in development
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * End group - only in development
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
};

