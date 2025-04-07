/**
 * Cookie utilities
 */
export const cookieUtils = {
  /**
   * Get cookie by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null
   */
  get: (name) => {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
    return match ? decodeURIComponent(match[3]) : null;
  },
  
  /**
   * Set cookie
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {Object} options - Cookie options
   */
  set: (name, value, options = {}) => {
    const opts = {
      path: '/',
      ...options
    };
    
    if (opts.expires instanceof Date) {
      opts.expires = opts.expires.toUTCString();
    }
    
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    
    for (const optKey in opts) {
      cookie += `;${optKey}`;
      const optValue = opts[optKey];
      if (optValue !== true) {
        cookie += `=${optValue}`;
      }
    }
    
    document.cookie = cookie;
  },
  
  /**
   * Delete cookie
   * @param {string} name - Cookie name
   * @param {Object} options - Cookie options
   */
  delete: (name, options = {}) => {
    cookieUtils.set(name, '', {
      ...options,
      'max-age': -1
    });
  }
}; 