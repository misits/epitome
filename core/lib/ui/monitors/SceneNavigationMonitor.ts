/**
 * SceneNavigationMonitor
 * A Tweakpane-based monitor for navigating between scenes
 */

import { Pane } from 'tweakpane';
import { Scene } from '@/types/spa';

export interface SceneNavigationMonitorOptions {
  title?: string;
  expanded?: boolean;
  debugMode?: boolean;
  watchScenesFile?: boolean; // Option to enable/disable file watching
  scenesJsonPath?: string; // Path to scenes.json file
  watchInterval?: number; // Watch interval in milliseconds
}

export class SceneNavigationMonitor {
  private pane: Pane | null = null;
  private folder: any = null; // Tweakpane folder
  private engineInstance: any = null;
  private scenes: Record<string, Scene> | null = null;
  private navigation = {
    sceneSelector: '' // Single property for the scene selector
  };
  private sceneDropdownControl: any = null;
  private options: SceneNavigationMonitorOptions;
  private eventListenersAdded: boolean = false;
  private fileWatchInterval: number | null = null; // Store interval ID for cleanup
  private lastSceneData: string = ''; // Store stringified scenes data for comparison

  constructor(pane: Pane, options: SceneNavigationMonitorOptions = {}) {
    this.pane = pane;
    this.options = {
      ...options,
      watchScenesFile: options.watchScenesFile !== false, // Default to true
      scenesJsonPath: options.scenesJsonPath || '/assets/data/scenes.json', // Default path
      watchInterval: options.watchInterval || 3000 // Default to checking every 3 seconds
    };
    
    if (!this.pane) {
      console.error('SceneNavigationMonitor: Pane is required');
      return;
    }
    
    // Create the folder
    this.folder = this.pane.addFolder({
      title: options.title || 'Scene Navigation',
      expanded: options.expanded !== false // Default to true
    });
    
    // Add button to reset state to initial scene (index)
    this.folder.addButton({
      title: 'Reset to Index'
    }).on('click', () => {
      this.resetToIndex();
    });
    
    // Add event listeners for scenes loaded
    this.setupEventListeners();
    
    // Start file watcher if enabled
    if (this.options.watchScenesFile) {
      this.startFileWatcher();
    }
  }
  
  /**
   * Start file watcher for scenes.json
   */
  private startFileWatcher(): void {
    if (this.fileWatchInterval) {
      clearInterval(this.fileWatchInterval);
    }
    
    // Check for file changes at the specified interval
    this.fileWatchInterval = window.setInterval(() => {
      this.checkFileForChanges();
    }, this.options.watchInterval || 3000);
    
    if (this.options?.debugMode) {
      console.log(`Started watching scenes.json for changes (every ${this.options.watchInterval}ms)`);
    }
  }
  
  /**
   * Check if scenes.json has changed and reload if necessary
   * Uses content comparison rather than relying on headers
   */
  private checkFileForChanges(): void {
    // Add cache-busting query parameter
    const url = `${this.options.scenesJsonPath}?t=${Date.now()}`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch scenes file: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // Check if we have valid scene data
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid scenes data format');
        }
        
        // Convert to string for comparison
        const dataString = JSON.stringify(data);
        
        // Check if the data has changed
        if (this.lastSceneData && this.lastSceneData === dataString) {
          // No changes detected
          return;
        }
        
        // Update our cached version
        this.lastSceneData = dataString;
        
        if (this.options?.debugMode) {
          console.log('Scenes file changed, updating scenes list');
        }
        
        // Process the updated scenes
        this.processSceneData(data);
        
        // Show a notification
        this.showNotification('Scenes auto-updated from file', 'success');
      })
      .catch(error => {
        console.error('Error checking scenes file:', error);
      });
  }
  
  /**
   * Process scenes data loaded from file
   */
  private processSceneData(data: Record<string, Scene>): void {
    if (!data || typeof data !== 'object') {
      console.error('Invalid scenes data format');
      return;
    }
    
    // Update local scenes
    this.scenes = data;
    
    // Apply to the engine if possible
    this.applyScenesToEngine(data);
    
    // Update the scene dropdown with the new scenes
    this.updateSceneDropdown();
    
    if (this.options?.debugMode) {
      console.log('Updated scenes from file:', Object.keys(data).length, 'scenes');
    }
  }
  
  /**
   * Try to apply the new scenes to the engine
   */
  private applyScenesToEngine(scenesData: Record<string, Scene>): void {
    if (!this.engineInstance) {
      if (this.options?.debugMode) {
        console.log('Engine not available, scenes will be updated when engine initializes');
      }
      return;
    }
    
    // First try the updateScenes method if it exists
    if (typeof this.engineInstance.updateScenes === 'function') {
      try {
        this.engineInstance.updateScenes(scenesData);
        if (this.options?.debugMode) {
          console.log('Updated engine scenes using updateScenes method');
        }
        return;
      } catch (error) {
        console.error('Failed to update scenes using updateScenes method:', error);
      }
    }
    
    // If that fails, try updating the scenes property directly
    try {
      // Handle different property names depending on your engine implementation
      if (this.engineInstance.scenes) {
        // For each scene, update or add it to the engine's scenes
        Object.entries(scenesData).forEach(([id, scene]) => {
          this.engineInstance.scenes[id] = scene;
        });
        
        if (this.options?.debugMode) {
          console.log('Updated engine scenes directly');
        }
      } else if (this.engineInstance.scenesData) {
        // Try alternative property name
        Object.entries(scenesData).forEach(([id, scene]) => {
          this.engineInstance.scenesData[id] = scene;
        });
        
        if (this.options?.debugMode) {
          console.log('Updated engine scenesData directly');
        }
      }
    } catch (error) {
      console.error('Failed to update engine scenes directly:', error);
    }
  }
  
  /**
   * Set up event listeners for scene loading 
   */
  private setupEventListeners(): void {
    if (this.eventListenersAdded) return;
    
    // Listen for scene loaded event
    document.addEventListener('epitome-scenes-loaded', ((event: CustomEvent) => {
      if (this.options?.debugMode) {
        console.log('SceneNavigationMonitor received scenes-loaded event');
      }
      
      const detail = event.detail || {};
      if (detail.scenes) {
        this.scenes = detail.scenes;
        
        // Store initial scenes data for comparison
        this.lastSceneData = JSON.stringify(this.scenes);
        
        if (!this.engineInstance && detail.engine) {
          this.engineInstance = detail.engine;
        }
        
        this.updateSceneDropdown();
      }
    }) as EventListener);
    
    // Listen for scene navigation events
    document.addEventListener('epitome-scene-loaded', ((event: CustomEvent) => {
      const detail = event.detail || {};
      if (detail.sceneId) {
        this.navigation.sceneSelector = detail.sceneId;
        this.refreshUi();
      }
    }) as EventListener);
    
    this.eventListenersAdded = true;
    
    if (this.options?.debugMode) {
      console.log('SceneNavigationMonitor event listeners set up');
    }
    
    // Initial load of scenes from file if watching is enabled
    if (this.options.watchScenesFile) {
      setTimeout(() => this.loadScenesFromFile(), 500);
    }
  }

  /**
   * Load scenes directly from scenes.json file
   */
  private loadScenesFromFile(): void {
    // Add cache-busting query parameter
    const url = `${this.options.scenesJsonPath}?t=${Date.now()}`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch scenes file: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // Store stringified data for future comparison
        this.lastSceneData = JSON.stringify(data);
        
        // Process the scenes data
        this.processSceneData(data);
      })
      .catch(error => {
        console.error('Error loading scenes file:', error);
        this.showNotification('Failed to load scenes file', 'error');
      });
  }

  /**
   * Initialize with the engine instance
   */
  public initialize(engineInstance: any): void {
    this.engineInstance = engineInstance;
    
    // Get scenes data
    if (this.engineInstance && this.engineInstance.scenes) {
      this.scenes = this.engineInstance.scenes;
      
      // Store initial scenes data for comparison
      this.lastSceneData = JSON.stringify(this.scenes);
      
      // Get the current scene ID from the engine
      if (this.engineInstance.state?.currentScene) {
        this.navigation.sceneSelector = this.engineInstance.state.currentScene;
      }
      
      // Make sure to update the dropdown after getting scenes
      this.updateSceneDropdown();
      
      if (this.options?.debugMode) {
        console.log('SceneNavigationMonitor initialized with', 
          Object.keys(this.scenes || {}).length, 'scenes');
      }
    } else if (this.engineInstance && this.engineInstance.scenesData) {
      // Try the public getter if direct access fails
      this.scenes = this.engineInstance.scenesData;
      this.lastSceneData = JSON.stringify(this.scenes);
      
      // Get the current scene ID
      if (this.engineInstance.state?.currentScene) {
        this.navigation.sceneSelector = this.engineInstance.state.currentScene;
      }
      
      this.updateSceneDropdown();
    } else {
      console.warn('Engine scenes not available during monitor initialization');
      
      // If no scenes are available and file watching is enabled, try loading from file
      if (this.options.watchScenesFile) {
        this.loadScenesFromFile();
      }
    }
  }

  /**
   * Update with current scene information
   */
  public update(scene: Scene): void {
    if (!scene) return;
    
    // Update the scene selector to show the current scene
    this.navigation.sceneSelector = scene.id || '';
    
    // Refresh the UI
    this.refreshUi();
  }
  
  /**
   * Update the scene dropdown options
   */
  public updateSceneDropdown(): void {
    if (!this.scenes) {
      console.warn('No scenes available for dropdown');
      return;
    }
    
    const sceneCount = Object.keys(this.scenes).length;
    if (sceneCount === 0) {
      console.warn('Scene object exists but contains no scenes');
      return;
    }
    
    // Get the current scene from the engine or use empty value
    const currentSceneId = this.engineInstance?.state?.currentScene || '';
    
    // Store a mapping between display values and actual scene IDs
    const sceneIdMap = new Map<string, string>();
    
    // Create options object for dropdown
    const sceneOptions: Record<string, string> = {};
    
    // Create sorted entries array for better navigation
    const sceneEntries = Object.entries(this.scenes)
      .map(([id, scene]) => {
        // Create a display name that includes ID and title if available
        // Add a "🔒" symbol for scenes with conditions
        const hasCondition = !!scene.condition;
        const conditionIndicator = hasCondition ? '🔒 ' : '';
        
        const displayName = scene.title 
          ? `${conditionIndicator}${id} - ${scene.title}`
          : `${conditionIndicator}${id}`;
        
        return { id, displayName };
      })
      // Sort alphabetically by ID for easier navigation
      .sort((a, b) => a.id.localeCompare(b.id));
    
    // Add all scenes to the dropdown
    sceneEntries.forEach(entry => {
      // Use the ID as the key and the ID as the value
      sceneOptions[entry.id] = entry.id;
      
      // Store a mapping for display purposes
      sceneIdMap.set(entry.id, entry.displayName);
    });
    
    // Set the current scene selector value to match the current scene
    this.navigation.sceneSelector = currentSceneId;
    
    // Log scenes if needed
    if (this.options?.debugMode) {
      console.log('Updated scene dropdown with', Object.keys(sceneOptions).length, 'scenes');
      console.log('Current scene:', currentSceneId);
    }
    
    // Remove existing dropdown if it exists
    if (this.sceneDropdownControl) {
      this.folder.remove(this.sceneDropdownControl);
    }
    
    // Create the scene dropdown control - use "Current Scene" as the label
    this.sceneDropdownControl = this.folder.addBinding(this.navigation, 'sceneSelector', {
      label: 'Current Scene',
      options: sceneOptions,
      format: (value: string) => {
        // Use the mapping to show display names in the UI but keep IDs in the value
        return sceneIdMap.get(value) || value;
      }
    }).on('change', (ev: { value: string }) => {
      // Skip navigation if the value is empty or already the current scene
      const currentScene = this.engineInstance?.state?.currentScene;
      if (!ev.value || ev.value === '' || ev.value === currentScene) {
        return;
      }
      
      if (this.engineInstance) {
        // Get the scene ID
        const sceneId = ev.value;
        
        // Verify the scene ID exists in our collection
        if (!this.scenes || !this.scenes[sceneId]) {
          console.error(`Scene not found: ${sceneId}`);
          this.showNotification(`Scene "${sceneId}" not found`, 'error');
          
          // Reset dropdown to current scene
          setTimeout(() => {
            this.navigation.sceneSelector = currentScene;
            this.refreshUi();
          }, 100);
          return;
        }
        
        // Immediately navigate to the selected scene
        if (this.options?.debugMode) {
          console.log(`Navigating to scene ID: ${sceneId}`);
        }
        
        // Use a try/catch to handle potential navigation errors
        try {
          // Navigate directly with force flag to bypass conditions
          this.engineInstance.navigateTo(sceneId, null, true);
          
          // Show a notification
          this.showNotification(`Navigated to: ${sceneId}`, 'info');
        } catch (error) {
          console.error('Navigation error:', error);
          this.showNotification(`Failed to navigate to: ${sceneId}`, 'error');
          
          // Reset the dropdown to the current scene
          setTimeout(() => {
            this.navigation.sceneSelector = currentScene;
            this.refreshUi();
          }, 100);
        }
      }
    });
    
    // Make sure to refresh UI after updating options
    this.refreshUi();
  }
  
  /**
   * Reset the engine state to the initial scene (index)
   */
  private resetToIndex(): void {
    if (!this.engineInstance) {
      console.warn('Engine not initialized yet');
      return;
    }
    
    try {
      // Confirm with the user before resetting
      if (confirm('Are you sure you want to reset? This will clear all progress and navigate to the index scene.')) {
        this.engineInstance.resetState();
        this.showNotification('Engine state reset to index', 'success');
      }
    } catch (error) {
      console.error('Failed to reset engine state:', error);
      this.showNotification('Failed to reset state', 'error');
    }
  }
  
  /**
   * Refresh the UI to reflect current state
   */
  private refreshUi(): void {
    if (this.pane) {
      this.pane.refresh();
    }
  }
  
  /**
   * Show a notification message
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create a status message in the UI
    const existingElement = document.getElementById('scene-navigation-notification');
    if (existingElement) {
      document.body.removeChild(existingElement);
    }
    
    const statusElement = document.createElement('div');
    statusElement.id = 'frontmatter-notification';
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '20px';
    statusElement.style.right = '20px';
    statusElement.style.padding = '8px 12px';
    statusElement.style.borderRadius = '6px';
    statusElement.style.zIndex = '10000';
    statusElement.style.fontSize = '11px';
    statusElement.style.fontFamily = 'var(--tp-base-font-family, Roboto Mono, Source Code Pro, Menlo, Courier, monospace)';
    statusElement.textContent = message;
    
    // Set color based on type
    switch (type) {
      default:
        statusElement.style.backgroundColor = 'var(--tp-base-background-color, hsl(230, 7%, 17%))';
        statusElement.style.color = '#fff';
        break;
    }
    
    document.body.appendChild(statusElement);
    
    // Remove after some time
    setTimeout(() => {
      if (statusElement.parentNode) {
        statusElement.parentNode.removeChild(statusElement);
      }
    }, 3000);
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clean up file watcher interval
    if (this.fileWatchInterval) {
      clearInterval(this.fileWatchInterval);
      this.fileWatchInterval = null;
    }
  }
}