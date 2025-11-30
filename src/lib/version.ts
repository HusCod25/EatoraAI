/**
 * Application version information
 * Update this file when releasing new versions
 */

export const APP_VERSION = '1.0.0-beta';
export const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0];

/**
 * Get version string for display
 */
export function getVersionString(): string {
  return `${APP_VERSION} (${BUILD_DATE})`;
}

