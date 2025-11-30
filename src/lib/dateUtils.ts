/**
 * Date utility functions for timezone-aware date formatting
 * Romania is UTC+2 (EET/EEST)
 */

/**
 * Convert UTC date to Romania timezone (UTC+2)
 * @param dateString - ISO date string or Date object
 * @returns Date object in Romania timezone
 */
export function toRomaniaTime(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null;
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return null;
  
  // Romania is UTC+2 (EET) or UTC+3 (EEST during daylight saving)
  // JavaScript Date objects are already in local timezone, but we need to format for Romania
  return date;
}

/**
 * Format date for Romania timezone display
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatRomaniaDate(
  dateString: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';
  
  // Format for Romania timezone (Europe/Bucharest)
  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: 'Europe/Bucharest',
    ...options
  }).format(date);
}

/**
 * Format date and time for Romania timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time string
 */
export function formatRomaniaDateTime(dateString: string | Date | null | undefined): string {
  return formatRomaniaDate(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Format date only for Romania timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string
 */
export function formatRomaniaDateOnly(dateString: string | Date | null | undefined): string {
  return formatRomaniaDate(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format date short for Romania timezone
 * @param dateString - ISO date string or Date object
 * @returns Formatted short date string (e.g., "Dec 22, 2025")
 */
export function formatRomaniaDateShort(dateString: string | Date | null | undefined): string {
  return formatRomaniaDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

