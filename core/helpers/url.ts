/**
 * URL utilities
 */
export const urlUtils = {
  /**
   * Get URL parameters as an object
   * @param {string} url - Optional URL string (defaults to window.location.href)
   * @returns {Object} URL parameters as key-value pairs
   */
  getParams: (url: string = window.location.href): Record<string, string> => {
    const params: Record<string, string> = {};
    const parser = document.createElement('a');
    parser.href = url;
    
    const query = parser.search.substring(1);
    const vars = query.split('&');
    
    for (let i = 0; i < vars.length; i++) {
      if (vars[i] === '') continue;
      const pair = vars[i].split('=');
      params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    
    return params;
  },
  
  /**
   * Build a URL with parameters
   * @param {string} baseUrl - The base URL
   * @param {Object} params - Object with parameters as key-value pairs
   * @returns {string} URL with parameters
   */
  buildUrl: (baseUrl: string, params: Record<string, string> = {}): string => {
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    return url.toString();
  }
}; 