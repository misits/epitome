/**
 * Number utilities
 */
export const numberUtils = {
  /**
   * Format number as currency
   * @param {number} value - Number to format
   * @param {string} currency - Currency code
   * @param {string} locale - Locale code
   * @returns {string} Formatted currency string
   */
  formatCurrency: (value: number, currency: string = 'USD', locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value);
  },
  
  /**
   * Clamp number between min and max
   * @param {number} num - Number to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped number
   */
  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
  },
  
  /**
   * Generate random number between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {boolean} isInteger - Whether to return integer
   * @returns {number} Random number
   */
  random: (min: number, max: number, isInteger: boolean = true): number => {
    const value = Math.random() * (max - min) + min;
    return isInteger ? Math.floor(value) : value;
  },
  
  /**
   * Round number to specified precision
   * @param {number} value - Number to round
   * @param {number} precision - Decimal precision
   * @returns {number} Rounded number
   */
  round: (value: number, precision: number = 0): number => {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }
}; 