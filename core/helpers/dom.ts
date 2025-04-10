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
  qs: <T extends Element = Element>(selector: string, parent: ParentNode = document): T | null => {
    try {
      return parent.querySelector<T>(selector);
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
  qsa: <T extends Element = Element>(selector: string, parent: ParentNode = document): T[] => {
    try {
      return Array.from(parent.querySelectorAll<T>(selector));
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
  on: <K extends keyof HTMLElementEventMap>(
    element: Element | Window | Document | null, 
    eventType: K, 
    handler: (event: HTMLElementEventMap[K]) => void, 
    options: AddEventListenerOptions = {}
  ): () => void => {
    if (!element) return () => {};
    
    element.addEventListener(eventType, handler as EventListener, options);
    
    return () => {
      element.removeEventListener(eventType, handler as EventListener, options);
    };
  }
}; 