/**
 * Utils index file - imports and re-exports all utility functions
 */

// Import all utility modules
import { dateUtils } from './date.js';
import { debounce, throttle, wait } from './function.js';
import { storage } from './storage.js';
import { urlUtils } from './url.js';
import { domUtils } from './dom.js';
import { stringUtils } from './string.js';
import { arrayUtils } from './array.js';
import { cookieUtils } from './cookie.js';
import { objectUtils } from './object.js';
import { numberUtils } from './number.js';
import { validation } from './validation.js';
import { fetchWithTimeout } from './fetch.js';
import { generateUUID, copyToClipboard } from './misc.js';

// Re-export everything
export {
  // Date utilities
  dateUtils,
  
  // Function utilities
  debounce,
  throttle,
  wait,
  
  // Storage utilities
  storage,
  
  // URL utilities
  urlUtils,
  
  // DOM utilities
  domUtils,
  
  // String utilities
  stringUtils,
  
  // Array utilities
  arrayUtils,
  
  // Cookie utilities
  cookieUtils,
  
  // Object utilities
  objectUtils,
  
  // Number utilities
  numberUtils,
  
  // Validation utilities
  validation,
  
  // Fetch utilities
  fetchWithTimeout,
  
  // Miscellaneous utilities
  generateUUID,
  copyToClipboard
}; 