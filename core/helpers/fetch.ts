/**
 * Fetch API utilities
 */

interface FetchOptionsWithTimeout extends RequestInit {
  timeout?: number;
}

interface ResponseError extends Error {
  status?: number;
  data?: any;
}

/**
 * Fetch API wrapper with improved error handling and timeout
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Promise with fetch result
 */
export const fetchWithTimeout = (url: string, options: FetchOptionsWithTimeout = {}): Promise<Response> => {
  const { timeout = 8000, ...fetchOptions } = options;
  
  return Promise.race([
    fetch(url, fetchOptions),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]).then(async response => {
    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`) as ResponseError;
      error.status = response.status;
      
      try {
        error.data = await response.json();
      } catch (e) {
        error.data = await response.text();
      }
      
      throw error;
    }
    
    return response;
  });
}; 