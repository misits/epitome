/**
 * Local Storage utilities with JSON parsing/stringifying
 */
export const storage = {
  /**
   * Set an item in localStorage with automatic JSON stringifying
   * @param {string} key - The key to store under
   * @param {*} value - The value to store
   */
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  },
  
  /**
   * Get an item from localStorage with automatic JSON parsing
   * @param {string} key - The key to retrieve
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} The stored value or defaultValue
   */
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      return defaultValue;
    }
  },
  
  /**
   * Remove an item from localStorage
   * @param {string} key - The key to remove
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Error removing from localStorage:', err);
    }
  },
  
  /**
   * Clear all localStorage items
   */
  clear: () => {
    try {
      localStorage.clear();
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  }
}; 