/**
 * Utils index file - imports and re-exports all utility functions
 */

// Import all utility modules
import { dateUtils } from './date';
import { debounce, throttle, wait } from './function';
import { storage } from './storage';
import { urlUtils } from './url';
import { domUtils } from './dom';
import { stringUtils } from './string';
import { arrayUtils } from './array';
import { cookieUtils } from './cookie';
import { objectUtils } from './object';
import { numberUtils } from './number';
import { validation } from './validation';
import { fetchWithTimeout } from './fetch';
import { generateUUID, copyToClipboard } from './misc';
import { 
  validateScene, 
  extractSummary, 
  createSceneId, 
  findOrphanedScenes, 
  hasConditionalAccess,
  createScene,
  mergeSceneData,
  hasReachableChoices,
  findSceneReferences
} from './scene';

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
  copyToClipboard,
  
  // Scene utilities
  validateScene,
  extractSummary,
  createSceneId,
  findOrphanedScenes,
  hasConditionalAccess,
  createScene,
  mergeSceneData,
  hasReachableChoices,
  findSceneReferences
}; 