/**
 * Main application entry point
 */
import { 
  debounce,
  dateUtils, 
  domUtils, 
  stringUtils,
  storage
} from './utils/index.js';

/**
 * Initialize application
 */
function initApp() {
  setupEventListeners();
  initializeExamples();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Handle window resize with debounce to improve performance
  window.addEventListener('resize', debounce(() => {
    // Update UI or perform actions on resize
    console.log('Window resized:', window.innerWidth, 'x', window.innerHeight);
  }, 250));
}

/**
 * Initialize examples (for demonstration purposes)
 * In a real application, you would replace this with actual functionality
 */
function initializeExamples() {
  // Log current date information
  const now = new Date();
  console.log(
    'Today:', 
    dateUtils.format(now, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  );

  // Check if we have saved user preferences
  const savedPreferences = storage.get('userPreferences');
  if (savedPreferences) {
    console.log('Loaded user preferences:', savedPreferences);
  } else {
    // Set default preferences if none exist
    storage.set('userPreferences', {});
  }
}

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);