/**
 * Epitome SPA Engine
 * A lightweight scene navigation engine for single page applications
 * Handles navigation, state management, and rendering of scenes
 */

// Utility variables will be injected from main.js
let domUtils, storage, fetchWithTimeout, validateScene, extractSummary, findOrphanedScenes;

// Static method to initialize utilities
export function initUtils(utils) {
  domUtils = utils.domUtils;
  storage = utils.storage;
  fetchWithTimeout = utils.fetchWithTimeout;
  validateScene = utils.validateScene;
  extractSummary = utils.extractSummary;
  findOrphanedScenes = utils.findOrphanedScenes;
}

class EpitomeSPA {
  constructor(options = {}) {
    // Configuration
    this.options = {
      containerId: options.containerId || 'app-container',
      initialScene: options.initialScene || 'index',
      scenesPath: options.scenesPath || './assets/data/scenes.json',
      transitionDuration: options.transitionDuration || 300,
      historyLength: options.historyLength || 10,
      debugMode: options.debugMode || false,
      onSceneLoad: options.onSceneLoad || null,
      onChoiceSelect: options.onChoiceSelect || null,
      animations: options.animations !== false, // Default to true unless explicitly set to false
      persistState: options.persistState !== false
    };

    // State
    this.state = {
      currentScene: null,
      flags: new Set(),
      history: [],
      variables: {}
    };

    // DOM elements
    this.container = null;
    this.scenes = null;
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the engine
   */
  async init() {
    try {
      // Get container
      this.container = domUtils.qs(`#${this.options.containerId}`);
      if (!this.container) {
        throw new Error(`Container with ID "${this.options.containerId}" not found`);
      }

      // Load saved settings
      this.loadSettings();

      // Load scenes data
      await this.loadScenes();

      // Load saved state or set initial scene
      this.loadSavedState();

      // Start with initial scene if no saved state
      if (!this.state.currentScene) {
        this.navigateTo(this.options.initialScene);
      } else {
        this.renderCurrentScene();
      }

      // Debug message
      if (this.options.debugMode) {
        console.log('Epitome SPA Engine initialized', this);
      }
    } catch (error) {
      console.error('Failed to initialize Epitome SPA Engine:', error);
    }
  }

  /**
   * Load saved settings from localStorage
   */
  loadSettings() {
    if (!this.options.persistState) return;
    
    try {
      // First check for structured settings
      const settings = storage.get('epitome_settings');
      if (settings) {
        // Apply animation settings if available
        if (typeof settings.animations === 'boolean') {
          this.options.animations = settings.animations;
        }
        
        if (this.options.debugMode) {
          console.log('Loaded settings:', settings);
        }
      }
      
      // Check for legacy animations_enabled key as fallback
      try {
        const legacyAnimSetting = localStorage.getItem('animations_enabled');
        if (legacyAnimSetting !== null && settings?.animations === undefined) {
          // Convert string 'true'/'false' to boolean
          this.options.animations = legacyAnimSetting === 'true';
          
          // Migrate the setting to the new format
          this.setAnimations(this.options.animations);
          
          if (this.options.debugMode) {
            console.log('Migrated legacy animation setting:', this.options.animations);
          }
        }
      } catch (legacyError) {
        console.error('Failed to check legacy animation setting:', legacyError);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Load scenes data from JSON file
   */
  async loadScenes() {
    try {
      const response = await fetchWithTimeout(this.options.scenesPath);
      this.scenes = await response.json();
      
      // Check if we have any scenes
      if (Object.keys(this.scenes).length === 0) {
        console.error('No scenes found in scenes.json');
        this.showErrorMessage('No scenes found. Please check the scenes.json file.');
        return;
      }
      
      // Validate scenes
      let invalidScenes = [];
      Object.entries(this.scenes).forEach(([id, scene]) => {
        if (!validateScene(scene)) {
          invalidScenes.push(id);
          console.warn(`Invalid scene found: ${id}`);
        }
      });
      
      if (invalidScenes.length > 0) {
        console.warn(`Found ${invalidScenes.length} invalid scenes`);
      }
      
      // Check for orphaned scenes in debug mode
      if (this.options.debugMode) {
        const orphanedScenes = findOrphanedScenes(this.scenes);
        if (orphanedScenes.length > 0) {
          console.warn(`Found ${orphanedScenes.length} orphaned scenes that are not referenced from any other scene:`, orphanedScenes);
        }
      }
      
      // Check if initial scene exists
      if (!this.scenes[this.options.initialScene]) {
        console.warn(`Initial scene "${this.options.initialScene}" not found. Using first available scene.`);
        this.options.initialScene = Object.keys(this.scenes)[0];
      }
      
      if (this.options.debugMode) {
        console.log('Scenes loaded:', this.scenes);
        console.log('Available scene IDs:', Object.keys(this.scenes));
        console.log('Using initial scene:', this.options.initialScene);
      }
    } catch (error) {
      console.error('Error loading scenes:', error);
      this.showErrorMessage('Failed to load scenes. Please check the console for details.');
      throw error;
    }
  }

  /**
   * Display an error message in the container
   * @param {string} message Error message to display
   */
  showErrorMessage(message) {
    if (this.container) {
      const errorElement = document.createElement('div');
      errorElement.className = 'scene-error';
      errorElement.style.color = 'red';
      errorElement.style.padding = '20px';
      errorElement.style.textAlign = 'center';
      errorElement.innerHTML = `<h2>Error</h2><p>${message}</p>`;
      this.container.innerHTML = '';
      this.container.appendChild(errorElement);
    }
  }

  /**
   * Load saved state from localStorage
   */
  loadSavedState() {
    if (!this.options.persistState) return;
    
    try {
      const savedState = storage.get('epitome_state');
      if (savedState) {
        this.state.currentScene = savedState.currentScene;
        this.state.history = savedState.history || [];
        this.state.variables = savedState.variables || {};
        
        // Convert flags array back to Set
        this.state.flags = new Set(savedState.flags || []);
        
        if (this.options.debugMode) {
          console.log('Loaded saved state:', this.state);
        }
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
      // Reset to default state on error
      this.resetState();
    }
  }

  /**
   * Save current state to localStorage
   */
  saveState() {
    if (!this.options.persistState) return;
    
    try {
      // Convert flags Set to Array for storage
      const stateToSave = {
        ...this.state,
        flags: Array.from(this.state.flags)
      };
      
      storage.set('epitome_state', stateToSave);
      
      if (this.options.debugMode) {
        console.log('State saved:', stateToSave);
      }
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Reset state to defaults
   */
  resetState() {
    this.state = {
      currentScene: null,
      flags: new Set(),
      history: [],
      variables: {}
    };
    
    if (this.options.persistState) {
      storage.remove('epitome_state');
    }
    
    // Navigate to initial scene
    this.navigateTo(this.options.initialScene);
    
    if (this.options.debugMode) {
      console.log('State reset to defaults');
    }
  }

  /**
   * Navigate to a scene by ID
   * @param {string} sceneId ID of the scene to navigate to
   * @param {Object} choice Optional choice data that led to this scene
   */
  navigateTo(sceneId, choice = null) {
    // Find the scene by ID
    const scene = this.scenes[sceneId];
    if (!scene) {
      const errorMsg = `Scene not found: ${sceneId}`;
      console.error(errorMsg);
      
      // If we have at least one scene, navigate to the first available one
      const sceneIds = Object.keys(this.scenes);
      if (sceneIds.length > 0) {
        console.warn(`Falling back to scene: ${sceneIds[0]}`);
        this.navigateTo(sceneIds[0]);
        return;
      } else {
        this.showErrorMessage(errorMsg);
        return;
      }
    }

    // Check condition if present
    if (scene.condition && !this.evaluateCondition(scene.condition)) {
      console.log(`Condition not met for scene: ${sceneId}`);
      return;
    }

    // Apply scene effects
    if (scene.set && Array.isArray(scene.set)) {
      scene.set.forEach(flag => this.state.flags.add(flag));
    }

    // Update history
    if (this.state.currentScene) {
      this.state.history.push(this.state.currentScene);
      // Limit history length
      while (this.state.history.length > this.options.historyLength) {
        this.state.history.shift();
      }
    }

    // Update current scene
    this.state.currentScene = sceneId;
    
    // Remember last choice that led here
    if (choice) {
      this.state.lastChoice = choice;
    }

    // Save state
    this.saveState();

    // Render the scene
    this.renderCurrentScene();

    // Trigger callback
    if (typeof this.options.onSceneLoad === 'function') {
      this.options.onSceneLoad(scene, choice);
    }
  }

  /**
   * Render the current scene
   */
  renderCurrentScene() {
    // Get current scene
    const sceneId = this.state.currentScene;
    const scene = this.scenes[sceneId];
    
    if (!scene) {
      console.error(`Cannot render scene: ${sceneId} - not found`);
      return;
    }

    // Check if we have a custom scene container
    const customContainers = document.querySelectorAll('[data-scene-container]');
    
    // If custom containers exist, use them instead of generating our own HTML
    if (customContainers.length > 0) {
      this.renderCustomScene(scene, customContainers);
    } else {
      // Otherwise fall back to the default rendering
      this.renderDefaultScene(scene);
    }

    // Update page title if present
    if (scene.title) {
      document.title = scene.title;
      
      // Add a meta description based on the scene content
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const summary = extractSummary(scene.html);
        metaDesc.setAttribute('content', summary);
      }
    }
    
    // Initialize any navigation elements in the page
    this.initNavigationElements();
  }
  
  /**
   * Default scene rendering method (generates all HTML)
   * @param {Object} scene The scene object to render
   */
  renderDefaultScene(scene) {
    // Create scene container
    const sceneElement = document.createElement('div');
    sceneElement.className = 'scene';
    if (this.options.animations) {
      sceneElement.classList.add('entering');
    }
    if (scene.theme) {
      sceneElement.classList.add(`theme-${scene.theme}`);
    }
    sceneElement.setAttribute('data-scene-id', scene.id);

    // Add title if present
    if (scene.title) {
      const titleElement = document.createElement('h1');
      titleElement.className = 'scene-title';
      titleElement.textContent = scene.title;
      sceneElement.appendChild(titleElement);
    }

    // Add content
    const contentElement = document.createElement('div');
    contentElement.className = 'scene-content';
    contentElement.innerHTML = scene.html || ''; // Handle empty HTML
    sceneElement.appendChild(contentElement);

    // Add choices if present
    if (scene.next && scene.next.length > 0) {
      const choicesElement = document.createElement('div');
      choicesElement.className = 'right-choices';
      
      scene.next.forEach(choice => {
        // Skip choices with unmet conditions
        if (choice.condition && !this.evaluateCondition(choice.condition)) {
          return;
        }
        
        const choiceElement = document.createElement('button');
        choiceElement.className = 'custom-choice';
        
        // Use label if available, otherwise fallback to ID or a default label
        choiceElement.textContent = choice.label || choice.id || 'Continue';
        
        // Use DOM utils for event handling
        domUtils.on(choiceElement, 'click', () => {
          // Handle choice selection
          if (typeof this.options.onChoiceSelect === 'function') {
            this.options.onChoiceSelect(choice);
          }
          this.navigateTo(choice.id, choice);
        });
        
        choicesElement.appendChild(choiceElement);
      });
      
      // Only add choices element if it contains any choices
      if (choicesElement.children.length > 0) {
        sceneElement.appendChild(choicesElement);
      }
    }

    // Animation for transition
    if (this.options.animations) {
      // Add transitioning class to container
      this.container.classList.add('transitioning');
      
      setTimeout(() => {
        // Clear container and add new scene
        this.container.innerHTML = '';
        this.container.appendChild(sceneElement);
        
        // Remove transition class after a short delay
        setTimeout(() => {
          this.container.classList.remove('transitioning');
          
          // Activate elements after container transition completes
          setTimeout(() => {
            // Set scene as active
            sceneElement.classList.remove('entering');
            sceneElement.classList.add('active');
            
            // Activate child elements for staggered animation
            const elements = sceneElement.querySelectorAll('.scene-title, .scene-content');
            elements.forEach(el => {
              el.classList.add('active');
            });
          }, 50);
        }, 50);
      }, this.options.transitionDuration);
    } else {
      // Without animation, just replace content
      this.container.innerHTML = '';
      this.container.appendChild(sceneElement);
      
      // No animations, but still add active class for proper display
      sceneElement.classList.add('active');
      const elements = sceneElement.querySelectorAll('.scene-title, .scene-content');
      elements.forEach(el => {
        el.classList.add('active');
      });
    }
  }
  
  /**
   * Custom scene rendering method that uses existing HTML structure
   * @param {Object} scene The scene object to render
   * @param {NodeList} containers The custom containers with data-scene-container attribute
   */
  renderCustomScene(scene, containers) {
    // Add transitioning class to main container if animations are enabled
    if (this.options.animations) {
      this.container.classList.add('transitioning');
    }
    
    // Process each custom container
    containers.forEach(container => {
      // Check what part of the scene this container should display
      const part = container.getAttribute('data-scene-container');
      
      // Handle different container types
      switch (part) {
        case 'title':
          if (scene.title) {
            container.textContent = scene.title;
            container.className = 'scene-title';
          }
          break;
          
        case 'content':
          container.innerHTML = scene.html || '';
          container.className = 'scene-content';
          break;
          
        case 'all':
          // Container for the entire scene
          // Clear container
          container.innerHTML = '';
          container.className = 'scene';
          
          // Add entering class if animations are enabled
          if (this.options.animations) {
            container.classList.add('entering');
          }
          
          if (scene.theme) {
            container.classList.add(`theme-${scene.theme}`);
          }
          
          // Add title if present
          if (scene.title) {
            const titleElement = document.createElement('h1');
            titleElement.className = 'scene-title';
            titleElement.textContent = scene.title;
            container.appendChild(titleElement);
          }
          
          // Add content
          const contentElement = document.createElement('div');
          contentElement.className = 'scene-content';
          contentElement.innerHTML = scene.html || '';
          container.appendChild(contentElement);
          break;
          
        case 'choices':
          // Container for choices
          container.innerHTML = '';
          container.className = 'right-choices';
          
          if (scene.next && scene.next.length > 0) {
            scene.next.forEach(choice => {
              // Skip choices with unmet conditions
              if (choice.condition && !this.evaluateCondition(choice.condition)) {
                return;
              }
              
              const choiceElement = document.createElement('button');
              choiceElement.className = 'custom-choice';
              choiceElement.setAttribute('data-scene-id', choice.id);
              
              // Use label if available, otherwise fallback to ID or a default label
              choiceElement.textContent = choice.label || choice.id || 'Continue';
              
              // Use DOM utils for event handling
              domUtils.on(choiceElement, 'click', () => {
                // Handle choice selection
                if (typeof this.options.onChoiceSelect === 'function') {
                  this.options.onChoiceSelect(choice);
                }
                this.navigateTo(choice.id, choice);
              });
              
              container.appendChild(choiceElement);
            });
          }
          break;
          
        default:
          // For containers with no specific type, show everything
          this.renderDefaultScene(scene);
          break;
      }
      
      // Add scene ID to container for reference
      container.setAttribute('data-current-scene', scene.id);
    });
    
    // After updating containers, handle animation completion
    if (this.options.animations) {
      setTimeout(() => {
        this.container.classList.remove('transitioning');
        
        // Activate elements with a slight delay
        setTimeout(() => {
          // Activate scene containers
          const sceneContainers = document.querySelectorAll('.scene.entering');
          sceneContainers.forEach(container => {
            container.classList.remove('entering');
            container.classList.add('active');
          });
          
          // Activate titles and content
          const elements = document.querySelectorAll('.scene-title, .scene-content');
          elements.forEach(el => {
            el.classList.add('active');
          });
        }, 50);
      }, this.options.transitionDuration);
    } else {
      // Without animations, just activate all elements immediately
      const sceneContainers = document.querySelectorAll('.scene');
      sceneContainers.forEach(container => {
        container.classList.remove('entering');
        container.classList.add('active');
      });
      
      // Activate all elements
      const elements = document.querySelectorAll('.scene-title, .scene-content');
      elements.forEach(el => {
        el.classList.add('active');
      });
    }
  }
  
  /**
   * Initialize all navigation elements in the page that have data-scene-id attributes
   */
  initNavigationElements() {
    // Find all elements with data-scene-id attribute
    const navigationElements = document.querySelectorAll('[data-scene-id]');
    
    // Add click handlers to each element
    navigationElements.forEach(element => {
      // Skip if we've already initialized this element
      if (element.hasAttribute('data-scene-initialized')) {
        return;
      }
      
      // Get the target scene ID
      const sceneId = element.getAttribute('data-scene-id');
      
      // Get any condition attribute
      const condition = element.getAttribute('data-scene-condition');
      
      // Create a click handler
      domUtils.on(element, 'click', (event) => {
        event.preventDefault();
        
        // Check if there's a condition and evaluate it
        if (condition && !this.evaluateCondition(condition)) {
          console.log(`Condition not met for navigation to: ${sceneId}`);
          return;
        }
        
        // Navigate to the scene
        this.navigateTo(sceneId);
      });
      
      // Mark as initialized
      element.setAttribute('data-scene-initialized', 'true');
    });
  }

  /**
   * Navigate to the previous scene
   */
  goBack() {
    if (this.state.history.length > 0) {
      const previousScene = this.state.history.pop();
      this.state.currentScene = previousScene;
      this.saveState();
      this.renderCurrentScene();
    } else {
      console.log('No previous scenes in history');
    }
  }

  /**
   * Evaluate a condition expression
   * @param {string} condition Condition to evaluate
   * @returns {boolean} Whether the condition is met
   */
  evaluateCondition(condition) {
    if (!condition) return true;
    
    try {
      // Create a safe evaluation context with state data
      const context = {
        flags: this.state.flags,
        hasFlag: (flag) => this.state.flags.has(flag),
        variables: this.state.variables,
        choice: this.state.lastChoice || {},
        history: this.state.history
      };
      
      // Create a function with the context variables in scope
      const conditionFn = new Function(
        ...Object.keys(context),
        `return ${condition};`
      );
      
      // Call the function with the context values
      return conditionFn(...Object.values(context));
    } catch (error) {
      console.error(`Error evaluating condition "${condition}":`, error);
      return false;
    }
  }

  /**
   * Set a variable in the state
   * @param {string} name Variable name
   * @param {any} value Variable value
   */
  setVariable(name, value) {
    this.state.variables[name] = value;
    this.saveState();
  }

  /**
   * Get a variable from the state
   * @param {string} name Variable name
   * @returns {any} Variable value
   */
  getVariable(name) {
    return this.state.variables[name];
  }

  /**
   * Check if a flag is set
   * @param {string} flag Flag to check
   * @returns {boolean} Whether the flag is set
   */
  hasFlag(flag) {
    return this.state.flags.has(flag);
  }

  /**
   * Set a flag
   * @param {string} flag Flag to set
   */
  setFlag(flag) {
    this.state.flags.add(flag);
    this.saveState();
  }

  /**
   * Clear a flag
   * @param {string} flag Flag to clear
   */
  clearFlag(flag) {
    this.state.flags.delete(flag);
    this.saveState();
  }

  /**
   * Toggle animations on/off
   * @param {boolean} enabled Whether animations should be enabled
   */
  setAnimations(enabled) {
    this.options.animations = enabled === true;
    
    // Store the setting in localStorage if state persistence is enabled
    if (this.options.persistState) {
      try {
        // Update in structured settings
        const settings = storage.get('epitome_settings') || {};
        settings.animations = this.options.animations;
        storage.set('epitome_settings', settings);
        
        // Remove legacy key if it exists to avoid confusion
        if (localStorage.getItem('animations_enabled') !== null) {
          localStorage.removeItem('animations_enabled');
          if (this.options.debugMode) {
            console.log('Removed legacy animations_enabled setting');
          }
        }
      } catch (error) {
        console.error('Failed to save animation settings:', error);
      }
    }
    
    return this.options.animations;
  }
  
  /**
   * Get current animation setting
   * @returns {boolean} Whether animations are enabled
   */
  getAnimations() {
    return this.options.animations;
  }
}

// Export the engine
export default EpitomeSPA;
window.EpitomeSPA = EpitomeSPA; 