/**
 * Date formatting utilities
 */
export const dateUtils = {
  /**
   * Format a date using Intl.DateTimeFormat API
   * @param {Date|string|number} date - The date to format 
   * @param {Object} options - Options for Intl.DateTimeFormat
   * @param {string} locale - The locale to use
   * @returns {string} Formatted date string
   */
  format: (date: Date | string | number, options: Intl.DateTimeFormatOptions = {}, locale: string = 'en-US'): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  },

  /**
   * Format date as YYYY-MM-DD
   * @param {Date|string|number} date - The date to format
   * @returns {string} Date in YYYY-MM-DD format
   */
  toYMD: (date: Date | string | number): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  },

  /**
   * Get relative time (e.g., "2 hours ago", "yesterday")
   * @param {Date|string|number} date - The date to format relative to now
   * @param {string} locale - The locale to use
   * @returns {string} Relative time string
   */
  getRelativeTime: (date: Date | string | number, locale: string = 'en-US'): string => {
    const dateObj = date instanceof Date ? date : new Date(date);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return rtf.format(-diffInMinutes, 'minute');
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return rtf.format(-diffInHours, 'hour');
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return rtf.format(-diffInDays, 'day');
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return rtf.format(-diffInMonths, 'month');
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return rtf.format(-diffInYears, 'year');
  }
}; 