/**
 * Epitome SPA Engine
 * A lightweight scene navigation engine for single page applications
 * Handles navigation, state management, and rendering of scenes
 */

import { 
  Scene, 
  Choice, 
  SpaOptions, 
  EpitomeSettings, 
  UtilityDependencies 
} from '@/types/spa';

// Utility variables - will be injected from main.ts
let domUtils: any;
let storage: any;
let fetchWithTimeout: any;
let validateScene: any;
let extractSummary: any;
let findOrphanedScenes: any;

// Static method to initialize utilities
export function initUtils(utils: UtilityDependencies): void {
  domUtils = utils.domUtils;
  storage = utils.storage;
  fetchWithTimeout = utils.fetchWithTimeout;
  validateScene = utils.validateScene;
  extractSummary = utils.extractSummary;
  findOrphanedScenes = utils.findOrphanedScenes;
}

export class EpitomeSPA {
  private options: Required<SpaOptions>;
  private state: {
    currentScene: string | null;
    flags: Set<string>;
    history: string[];
    variables: Record<string, any>;
  };
  private container: HTMLElement | null = null;
  private scenes: Record<string, Scene> | null = null;
  private lastChoice: Choice | null = null;
  // Public property to access scenes from outside
  public get scenesData(): Record<string, Scene> | null {
    return this.scenes;
  }

  constructor(options: SpaOptions = {}) {
    // Configuration with defaults
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

    // State - match JS version structure
    this.state = {
      currentScene: null,
      flags: new Set<string>(),
      history: [],
      variables: {}
    };
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the engine
   */
  private async init(): Promise<void> {
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
  private loadSettings(): void {
    if (!this.options.persistState) return;
    
    try {
      // First check for structured settings
      const settings = storage.get('epitome_settings') as EpitomeSettings | null;
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
  private async loadScenes(): Promise<void> {
    try {
      const response = await fetchWithTimeout(this.options.scenesPath);
      this.scenes = await response.json();
      
      // Check if we have any scenes
      if (!this.scenes || Object.keys(this.scenes).length === 0) {
        console.error('No scenes found in scenes.json');
        this.showErrorMessage('No scenes found. Please check the scenes.json file.');
        return;
      }
      
      // Validate scenes
      const invalidScenes: string[] = [];
      Object.entries(this.scenes).forEach(([id, scene]) => {
        if (!validateScene(scene)) {
          invalidScenes.push(id);
          console.warn(`Invalid scene found: ${id}`);
        }
        
        // Make sure all scenes have an ID property that matches their key
        if (this.scenes && !scene.id) {
          this.scenes[id].id = id;
        }
      });
      
      if (invalidScenes.length > 0) {
        console.warn(`Found ${invalidScenes.length} invalid scenes`);
      }
      
      // Check for orphaned scenes in debug mode
      if (this.options.debugMode && this.scenes) {
        const orphanedScenes = findOrphanedScenes(this.scenes);
        if (orphanedScenes.length > 0) {
          console.warn(`Found ${orphanedScenes.length} orphaned scenes that are not referenced from any other scene:`, orphanedScenes);
        }
      }
      
      // Check if initial scene exists
      if (this.scenes && !this.scenes[this.options.initialScene]) {
        console.warn(`Initial scene "${this.options.initialScene}" not found. Using first available scene.`);
        this.options.initialScene = Object.keys(this.scenes)[0];
      }
      
      if (this.options.debugMode) {
        console.log('Scenes loaded:', this.scenes);
        console.log('Available scene IDs:', Object.keys(this.scenes || {}));
        console.log('Using initial scene:', this.options.initialScene);
      }
      
      // Dispatch a custom event when scenes are loaded
      this.dispatchScenesLoadedEvent();
    } catch (error) {
      console.error('Error loading scenes:', error);
      this.showErrorMessage('Failed to load scenes. Please check the console for details.');
      throw error;
    }
  }

  /**
   * Dispatch a custom event when scenes are loaded for any external components
   */
  private dispatchScenesLoadedEvent(): void {
    try {
      const event = new CustomEvent('epitome-scenes-loaded', {
        detail: {
          scenes: this.scenes,
          engine: this
        }
      });
      document.dispatchEvent(event);
      
      if (this.options.debugMode) {
        console.log('Dispatched scenes loaded event');
      }
    } catch (error) {
      console.error('Failed to dispatch scenes loaded event:', error);
    }
  }

  /**
   * Display an error message in the container
   */
  private showErrorMessage(message: string): void {
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
  private loadSavedState(): void {
    if (!this.options.persistState) return;
    
    try {
      const savedState = storage.get('epitome_state') as any;
      if (savedState) {
        this.state.currentScene = savedState.currentScene;
        this.state.history = savedState.history || [];
        this.state.variables = savedState.variables || {};
        
        // Convert flags array back to Set if needed
        if (Array.isArray(savedState.flags)) {
          this.state.flags = new Set(savedState.flags);
        } else if (savedState.flags instanceof Set) {
          this.state.flags = savedState.flags;
        } else {
          this.state.flags = new Set();
        }
        
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
  public saveState(): void {
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
  public resetState(): void {
    this.state = {
      currentScene: null,
      flags: new Set<string>(),
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
   */
  public navigateTo(sceneId: string, choice: Choice | null = null, forceNavigation: boolean = false): void {
    // Find the scene by ID
    if (!this.scenes) {
      console.error('Scenes not loaded');
      return;
    }

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

    // Check condition if present and not forcing navigation
    if (!forceNavigation && scene.condition && !this.evaluateCondition(scene.condition)) {
      console.log(`Condition not met for scene: ${sceneId}`);
      return;
    }

    // Apply scene effects
    if (scene.set && Array.isArray(scene.set)) {
      scene.set.forEach((flag: string) => this.state.flags.add(flag));
    }

    // Update history
    if (this.state.currentScene) {
      this.state.history.push(this.state.currentScene);
      // Limit history length
      while (this.state.history.length > this.options.historyLength) {
        this.state.history.shift();
      }
    }

    // Update current scene ID, not the entire object
    this.state.currentScene = sceneId;
    
    // Remember last choice that led here
    if (choice) {
      this.lastChoice = choice;
    }

    // Save state
    this.saveState();

    // Check if animations are enabled and we have a container
    if (this.options.animations && this.container) {
      if (this.options.debugMode) {
        console.log(`Navigating to scene ${sceneId} with animations`);
        console.log(`Container classes before: ${this.container.className}`);
      }
      
      // Make sure we have the correct initial state
      // First remove any existing animation classes to ensure a clean state
      this.container.classList.remove('active', 'no-animation');
      
      // Then add transitioning class
      this.container.classList.add('transitioning');
      
      // Force a reflow to ensure the browser processes these changes
      void this.container.offsetWidth;
      
      if (this.options.debugMode) {
        console.log(`Container classes after: ${this.container.className}`);
      }
      
      // Ensure browser processes this class change with a minimal delay
      setTimeout(() => {
        // Render the scene
        this.renderCurrentScene();
        
        // Trigger callback
        if (typeof this.options.onSceneLoad === 'function') {
          this.options.onSceneLoad(scene, choice);
        }
      }, 20); // Short delay to ensure the transitioning class is applied
    } else {
      // Without animations, just render immediately
      if (this.container) {
        this.container.classList.add('no-animation');
        this.container.classList.remove('active', 'transitioning');
      }
      
      this.renderCurrentScene();
      
      // Trigger callback
      if (typeof this.options.onSceneLoad === 'function') {
        this.options.onSceneLoad(scene, choice);
      }
    }
  }

  /**
   * Render the current scene
   */
  private renderCurrentScene(): void {
    // Get current scene
    if (!this.state.currentScene || !this.scenes) {
      console.error('Cannot render scene: No current scene or scenes not loaded');
      return;
    }
    
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
        const content = scene.html || scene.content || '';
        const summary = extractSummary(content);
        metaDesc.setAttribute('content', summary);
      }
    }
    
    // Initialize any navigation elements in the page
    this.initNavigationElements();
  }
  
  /**
   * Default scene rendering method (generates all HTML)
   */
  private renderDefaultScene(scene: Scene): void {
    if (!this.container) return;

    // Create scene container
    const sceneElement = document.createElement('div');
    sceneElement.className = 'scene';
    
    // Handle theme - both formats
    const theme = scene.theme || (scene.meta ? scene.meta.theme : null);
    if (theme) {
      sceneElement.classList.add(`theme-${theme}`);
    }
    
    sceneElement.setAttribute('data-scene-id', scene.id || '');

    // Add title if present
    if (scene.title) {
      const titleElement = document.createElement('h1');
      titleElement.className = 'scene-title';
      titleElement.textContent = scene.title;
      sceneElement.appendChild(titleElement);
    }

    // Add content - support both html and content fields (html takes precedence for backward compatibility)
    const contentElement = document.createElement('div');
    contentElement.className = 'scene-content';
    contentElement.innerHTML = scene.html || scene.content || ''; 
    sceneElement.appendChild(contentElement);

    // Add choices if present - support both next and choices fields
    const choicesArray = scene.next || scene.choices || [];
    if (choicesArray.length > 0) {
      const choicesElement = document.createElement('div');
      choicesElement.className = 'right-choices';
      
      choicesArray.forEach(choice => {
        // Skip choices with unmet conditions
        if (choice.condition && !this.evaluateCondition(choice.condition)) {
          return;
        }
        
        const choiceElement = document.createElement('button');
        choiceElement.className = 'custom-choice';
        
        // Set the target scene ID - for backward compatibility
        const targetId = choice.id || choice.target;
        if (targetId) {
          choiceElement.setAttribute('data-scene-id', targetId);
        }
        
        // Use label if available, otherwise text, otherwise target/id, or default label
        const choiceText = choice.label || choice.text || targetId || 'Continue';
        choiceElement.textContent = choiceText;
        
        // Use DOM utils for event handling
        domUtils.on(choiceElement, 'click', () => {
          // Handle choice selection
          if (typeof this.options.onChoiceSelect === 'function') {
            this.options.onChoiceSelect(choice);
          }
          
          // Navigate to target scene - prioritize id for backward compatibility
          if (targetId) {
            this.navigateTo(targetId, choice);
          }
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
      // The transitioning class is already applied in navigateTo
      // Just need to update the content and handle the end of transition
      
      // Clear container and add new scene
      this.container.innerHTML = '';
      this.container.appendChild(sceneElement);
      
      // Force a reflow to ensure the transition starts properly
      void this.container.offsetWidth;
      
      // Use a slightly longer delay that matches our CSS transition time
      // to ensure the animation completes properly
      setTimeout(() => {
        if (!this.container) return;
        
        // First remove the transitioning class
        this.container.classList.remove('transitioning');
        
        // Force another reflow to ensure the browser processes the class change
        void this.container.offsetWidth;
        
        // Then add the active class to trigger the fade-in animation
        this.container.classList.add('active');
        
        if (this.options.debugMode) {
          console.log('Animation complete, active class added');
        }
      }, 100); // Increased delay to ensure transition completes properly
    } else {
      // Without animation, just replace content
      this.container.innerHTML = '';
      this.container.appendChild(sceneElement);
      
      // No animations, set no-animation class
      this.container.classList.add('no-animation');
      this.container.classList.remove('active', 'transitioning');
    }
  }
  
  /**
   * Custom scene rendering method that uses existing HTML structure
   */
  private renderCustomScene(scene: Scene, containers: NodeListOf<Element>): void {
    if (!this.container) return;

    // Make sure we're in sync with our container's state
    const isAnimated = this.options.animations;
    
    if (this.options.debugMode) {
      console.log(`Rendering custom scene with animation: ${isAnimated}`);
      console.log(`Container classes: ${this.container.className}`);
      console.log(`Custom containers found: ${containers.length}`);
    }

    // First phase: Prepare containers for content update
    containers.forEach(container => {
      // Convert to HTMLElement to access style
      const htmlContainer = container as HTMLElement;
      
      // If we're animating, prepare container for transition
      if (isAnimated) {
        htmlContainer.style.transition = 'none'; // Temporarily disable transitions
        htmlContainer.style.opacity = '0';       // Hide container
      }
    });
    
    // Force a reflow to apply initial states before content change
    void document.body.offsetHeight;
    
    // Second phase: Update content in all containers
    containers.forEach(container => {
      const part = container.getAttribute('data-scene-container');
      const htmlContainer = container as HTMLElement;
      
      // Handle content container vs other types
      if (part === 'content') {
        // Update the content
        container.innerHTML = scene.html || scene.content || '';
        container.className = 'scene-content';
      } else {
        // For non-content containers, we'll just clear them
        // Don't call renderDefaultScene to avoid nested rendering
        container.innerHTML = '';
      }
      
      // Set scene ID reference
      const sceneId = scene.id || '';
      container.setAttribute('data-current-scene', sceneId);
    });
    
    // Force another reflow after content update
    void document.body.offsetHeight;
    
    // Third phase: Begin the transition
    if (isAnimated) {
      // Wait a short time before starting container transitions
      setTimeout(() => {
        containers.forEach(container => {
          const htmlContainer = container as HTMLElement;
          
          // Setup the transition and begin fade-in
          htmlContainer.style.transition = 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)';
          htmlContainer.style.opacity = '1';
        });
        
        if (this.options.debugMode) {
          console.log('Custom container transitions applied');
        }
      }, 30);
      
      // Main container transition
      setTimeout(() => {
        if (!this.container) return;
        
        // First remove transitioning class
        this.container.classList.remove('transitioning');
        
        // Force reflow 
        void this.container.offsetWidth;
        
        // Add active class for fade-in
        this.container.classList.add('active');
        
        if (this.options.debugMode) {
          console.log('Main container transition complete');
          console.log(`Final classes: ${this.container.className}`);
        }
      }, 120);
    } else {
      // Without animations just make sure everything is visible
      containers.forEach(container => {
        const htmlContainer = container as HTMLElement;
        htmlContainer.style.opacity = '1';
        htmlContainer.style.transition = 'none';
      });
      
      // Make main container visible
      this.container.classList.add('no-animation');
      this.container.classList.remove('active', 'transitioning');
    }
  }
  
  /**
   * Initialize all navigation elements in the page that have data-scene-id attributes
   */
  private initNavigationElements(): void {
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
      if (!sceneId) return;
      
      // Get any condition attribute
      const condition = element.getAttribute('data-scene-condition');
      
      // Create a click handler
      domUtils.on(element, 'click', (event: Event) => {
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
  public goBack(): void {
    if (this.state.history.length > 0) {
      const previousSceneId = this.state.history.pop();
      if (previousSceneId) {
        this.state.currentScene = previousSceneId;
        this.saveState();
        this.renderCurrentScene();
      }
    } else {
      console.log('No previous scenes in history');
    }
  }

  /**
   * Evaluate a condition expression
   */
  public evaluateCondition(condition: string): boolean {
    if (!condition) return true;
    
    try {
      // Create a safe evaluation context with state data
      const context = {
        flags: this.state.flags,
        hasFlag: (flag: string) => this.state.flags.has(flag),
        variables: this.state.variables,
        choice: this.lastChoice || {},
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
   */
  public setVariable(name: string, value: any): void {
    this.state.variables[name] = value;
    this.saveState();
  }

  /**
   * Get a variable from the state
   */
  public getVariable(name: string): any {
    return this.state.variables[name];
  }

  /**
   * Check if a flag is set
   */
  public hasFlag(flag: string): boolean {
    return this.state.flags.has(flag);
  }

  /**
   * Set a flag
   */
  public setFlag(flag: string): void {
    this.state.flags.add(flag);
    this.saveState();
  }

  /**
   * Clear a flag
   */
  public clearFlag(flag: string): void {
    this.state.flags.delete(flag);
    this.saveState();
  }

  /**
   * Toggle animations on/off
   */
  public setAnimations(enabled: boolean): boolean {
    this.options.animations = enabled === true;
    
    // Store the setting in localStorage if state persistence is enabled
    if (this.options.persistState) {
      try {
        // Update in structured settings
        const settings = (storage.get('epitome_settings') || {}) as EpitomeSettings;
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
   */
  public getAnimations(): boolean {
    return this.options.animations;
  }
}

// Export the engine as default
export default EpitomeSPA;