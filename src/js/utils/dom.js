/**
 * DOM utilities
 */
export const domUtils = {
  /**
   * Query selector with error handling
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (defaults to document)
   * @returns {Element|null} The first matching element or null
   */
  qs: (selector, parent = document) => {
    try {
      return parent.querySelector(selector);
    } catch (err) {
      console.error(`Invalid selector: ${selector}`, err);
      return null;
    }
  },
  
  /**
   * Query selector all with error handling
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (defaults to document)
   * @returns {Element[]|[]} Array of matching elements or empty array
   */
  qsa: (selector, parent = document) => {
    try {
      return [...parent.querySelectorAll(selector)];
    } catch (err) {
      console.error(`Invalid selector: ${selector}`, err);
      return [];
    }
  },
  
  /**
   * Add event listener with cleaner syntax
   * @param {Element|Window|Document} element - Element to add event to
   * @param {string} eventType - Type of event
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   * @returns {Function} Function to remove the event listener
   */
  on: (element, eventType, handler, options = {}) => {
    if (!element) return () => {};
    
    element.addEventListener(eventType, handler, options);
    
    return () => {
      element.removeEventListener(eventType, handler, options);
    };
  }
}; 