/**
 * String utilities
 */
export const stringUtils = {
  /**
   * Truncate string to specified length with ellipsis
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @param {string} ending - String to append at the end
   * @returns {string} Truncated string
   */
  truncate: (str: string, length: number = 100, ending: string = '...'): string => {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - ending.length) + ending;
  },
  
  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize: (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  
  /**
   * Convert string to camelCase
   * @param {string} str - String to convert
   * @returns {string} camelCase string
   */
  toCamelCase: (str: string): string => {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  },
  
  /**
   * Convert string to kebab-case
   * @param {string} str - String to convert
   * @returns {string} kebab-case string
   */
  toKebabCase: (str: string): string => {
    return str
      .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
      ?.map(x => x.toLowerCase())
      .join('-') || '';
  }
}; 