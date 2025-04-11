/**
 * TypeScript definitions for the Epitome SPA Engine
 */

/**
 * Choice interface - represents a navigation option
 */
export interface Choice {
  // Required fields
  id?: string;              // ID of the target scene (legacy format)
  target?: string;          // ID of the target scene (new format)
  
  // Optional fields
  label?: string;           // Display text for the choice (legacy format)
  text?: string;            // Display text for the choice (new format)
  condition?: string;       // Condition expression for displaying the choice
  data?: Record<string, any>; // Additional data for the choice
}

/**
 * Scene interface - represents a single content section
 */
export interface Scene {
  // Required fields
  id?: string;              // Unique identifier for the scene
  
  // Content fields (at least one required)
  html?: string;            // HTML content (legacy format)
  content?: string;         // HTML content (new format)
  
  // Optional fields
  title?: string;           // Title of the scene
  theme?: string;           // Theme for styling (legacy format)
  meta?: {                  // Metadata for the scene (new format)
    theme?: string;         // Theme for styling
    [key: string]: any;     // Additional metadata
  };
  
  // Navigation options
  next?: Choice[];          // Available navigation choices (legacy format)
  choices?: Choice[];       // Available navigation choices (new format)
  
  // Condition and effects
  condition?: string;       // Condition expression for scene availability
  set?: string[];           // Flags to set when entering the scene
}

/**
 * Engine options
 */
export interface SpaOptions {
  containerId?: string;           // ID of the container element
  initialScene?: string;          // ID of the first scene to show
  scenesPath?: string;            // Path to the scenes JSON file
  transitionDuration?: number;    // Duration of scene transitions in ms
  historyLength?: number;         // Max number of history entries to keep
  debugMode?: boolean;            // Enable debug logging
  onSceneLoad?: ((scene: Scene, choice?: Choice | null) => void) | null; // Callback when a scene is loaded
  onChoiceSelect?: ((choice: Choice, scene?: Scene) => void) | null;     // Callback when a choice is selected
  animations?: boolean;           // Enable animations
  persistState?: boolean;         // Save state to localStorage
}

/**
 * Engine settings stored in localStorage
 */
export interface EpitomeSettings {
  animations?: boolean;           // Animation setting
  monitorDragEnabled?: boolean;   // DevMonitor dragging enabled
  [key: string]: any;             // Additional settings
}

/**
 * Utility dependencies that need to be injected
 */
export interface UtilityDependencies {
  domUtils: any;                   // DOM manipulation utilities
  storage: any;                    // Storage utilities
  fetchWithTimeout: any;           // Fetch with timeout utility
  validateScene: any;              // Scene validation utility
  extractSummary: any;             // Summary extraction utility
  findOrphanedScenes: any;         // Orphaned scenes utility
}