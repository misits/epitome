/**
 * Main entry point for the Epitome SPA
 * Imports and exports all utilities and the engine
 */

// Import all utilities from the helpers
import {
  domUtils,
  storage,
  fetchWithTimeout,
  arrayUtils,
  dateUtils,
  stringUtils,
  objectUtils,
  validation,
  numberUtils,
  cookieUtils,
  debounce,
  throttle,
  wait,
  generateUUID,
  copyToClipboard,
  // Import scene utilities directly from helpers
  validateScene, 
  extractSummary, 
  findOrphanedScenes,
  createSceneId,
  hasConditionalAccess,
  createScene,
  mergeSceneData,
  hasReachableChoices,
  findSceneReferences
} from '@/helpers';

// Import dev monitor for debug mode
import { DevMonitor } from '@/lib/ui/monitors/DevMonitor';

// Re-export all utilities
export * from '@/helpers';

// Import the engine 
import { EpitomeSPA, initUtils } from './engine';

// Create utils object to initialize the engine
const utils = {
  domUtils,
  storage,
  fetchWithTimeout,
  validateScene,
  extractSummary,
  findOrphanedScenes
};

// Initialize the engine with utilities
initUtils(utils);

// Export the engine as default and named export
export { EpitomeSPA };
export default EpitomeSPA;

// Add to window for direct browser access
declare global {
  interface Window {
    EpitomeSPA: typeof EpitomeSPA;
    gameEngine: any;
    devMonitor?: DevMonitor;
  }
}

window.EpitomeSPA = EpitomeSPA;

// Auto-initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check if auto-initialization is disabled
  const noAutoInit = document.querySelector('[data-no-auto-init="true"]');
  if (noAutoInit) {
    console.log('Automatic initialization disabled');
    return;
  }

  // Get container and debug setting
  const container = document.getElementById('app-container');
  if (!container) {
    console.warn('No container with ID "app-container" found. Skipping auto-initialization.');
    return;
  }

  const debug = container.getAttribute('data-debug-mode') === 'true';
  
  console.log('Initializing Epitome SPA Engine...');
  try {
    const engine = new EpitomeSPA({
      containerId: 'app-container',
      initialScene: 'index',
      scenesPath: './assets/data/scenes.json',
      debugMode: debug
    });
    
    // Expose engine instance globally for debugging
    window.gameEngine = engine;
    
    // Initialize dev monitor if in debug mode
    if (debug) {
      try {
        console.log('Initializing dev monitor...');
        
        // Wait for the engine to fully initialize before creating the DevMonitor
        setTimeout(() => {
          const devMonitor = new DevMonitor({
            title: 'Epitome Dev Tools',
            apiEndpoint: '/api/scenes'
          });
          
          // Verify engine has all required methods before initializing monitor
          if (!engine) {
            console.error('Cannot initialize DevMonitor: Engine is not defined');
            return;
          }
          
          // Initialize the DevMonitor with the engine instance
          try {
            devMonitor.initialize(engine);
            // Expose dev monitor globally
            window.devMonitor = devMonitor;
          } catch (monitorError) {
            console.error('Failed to initialize DevMonitor:', monitorError);
          }
        }, 500); // Add a small delay to ensure engine is fully initialized
        
      } catch (devMonitorError) {
        console.error('Failed to create DevMonitor:', devMonitorError);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Epitome SPA Engine:', error);
  }
}); 