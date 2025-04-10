/**
 * DevMonitor
 * A development mode UI for monitoring and interacting with scene data 
 * using Tweakpane.
 */

import { Pane } from 'tweakpane';
import { Scene } from '@/types/spa';
import { FrontmatterMonitor } from './FrontmatterMonitor';
import { SettingsMonitor } from './SettingsMonitor';
import { SceneNavigationMonitor } from './SceneNavigationMonitor';

interface DevMonitorOptions {
  containerSelector?: string;
  title?: string;
  apiEndpoint?: string;
}

export class DevMonitor {
  private pane: Pane | null = null;
  private container: HTMLElement | null = null;
  private engineInstance: any = null;
  private apiEndpoint: string;
  
  // Specialized monitors
  private frontmatterMonitor: FrontmatterMonitor | null = null;
  private settingsMonitor: SettingsMonitor | null = null;
  private sceneNavigationMonitor: SceneNavigationMonitor | null = null;

  constructor(options: DevMonitorOptions = {}) {
    const containerSelector = options.containerSelector || 'body';
    this.apiEndpoint = options.apiEndpoint || '/api/scenes';
    this.container = document.querySelector(containerSelector);
    
    if (!this.container) {
      console.error(`DevMonitor: Container '${containerSelector}' not found`);
      return;
    }
    
    // Create pane wrapper div
    const paneContainer = document.createElement('div');
    paneContainer.id = 'epitome-dev-monitor';
    paneContainer.style.position = 'fixed';
    paneContainer.style.top = '10px';
    paneContainer.style.right = '10px';
    paneContainer.style.zIndex = '9999';
    this.container.appendChild(paneContainer);
    
    // Initialize Tweakpane
    this.pane = new Pane({
      container: paneContainer,
      title: options.title || 'Epitome Dev Tools'
    });
    
    // Initialize specialized monitors
    this.initializeMonitors();
  }

  /**
   * Initialize specialized monitors
   */
  private initializeMonitors(): void {
    if (!this.pane) return;
    
    // Create the specialized monitors
    this.sceneNavigationMonitor = new SceneNavigationMonitor(this.pane, {
      expanded: true
    });
    
    this.frontmatterMonitor = new FrontmatterMonitor(this.pane, {
      expanded: false,
      apiEndpoint: this.apiEndpoint
    });
    
    this.settingsMonitor = new SettingsMonitor(this.pane, {
      expanded: false
    });
  }

  /**
   * Initialize the monitor with the engine instance
   */
  public initialize(engineInstance: any): void {
    if (!this.pane) return;
    
    this.engineInstance = engineInstance;
    
    // Initialize each monitor
    if (this.frontmatterMonitor) {
      this.frontmatterMonitor.initialize(engineInstance);
    }
    
    if (this.settingsMonitor) {
      this.settingsMonitor.initialize(engineInstance);
    }
    
    if (this.sceneNavigationMonitor) {
      this.sceneNavigationMonitor.initialize(engineInstance);
    }
    
    // Update on scene change
    if (this.engineInstance?.options?.onSceneLoad) {
      const originalOnSceneLoad = this.engineInstance.options.onSceneLoad;
      this.engineInstance.options.onSceneLoad = (scene: Scene, choice: any) => {
        originalOnSceneLoad?.(scene, choice);
        this.updateSceneData(scene);
      };
    } else {
      this.engineInstance.options.onSceneLoad = (scene: Scene) => {
        this.updateSceneData(scene);
      };
    }
    
    // Set initial scene
    if (this.engineInstance.state?.currentScene) {
      const currentSceneId = this.engineInstance.state.currentScene;
      if (this.engineInstance.scenes && this.engineInstance.scenes[currentSceneId]) {
        console.log('DevMonitor: Loading initial scene:', currentSceneId);
        console.log('DevMonitor: Scene data:', this.engineInstance.scenes[currentSceneId]);
        this.updateSceneData(this.engineInstance.scenes[currentSceneId]);
      }
    }
    
    console.log('DevMonitor initialized:', this);
  }

  /**
   * Update scene data when a new scene is loaded
   */
  private updateSceneData(scene: Scene): void {
    if (!this.pane || !scene) return;
    
    console.log('DevMonitor: Updating scene data:', scene);
    
    // Update each monitor
    if (this.frontmatterMonitor) {
      this.frontmatterMonitor.update(scene);
    }
    
    if (this.settingsMonitor) {
      this.settingsMonitor.update();
    }
    
    if (this.sceneNavigationMonitor) {
      this.sceneNavigationMonitor.update(scene);
    }
  }
  
  /**
   * Dispose the monitor
   */
  public dispose(): void {
    // Dispose specialized monitors
    if (this.frontmatterMonitor) {
      this.frontmatterMonitor.dispose();
    }
    
    if (this.settingsMonitor) {
      this.settingsMonitor.dispose();
    }
    
    if (this.sceneNavigationMonitor) {
      this.sceneNavigationMonitor.dispose();
    }
    
    // Dispose main pane
    if (this.pane) {
      this.pane.dispose();
      this.pane = null;
    }
    
    // Remove the container
    const container = document.getElementById('epitome-dev-monitor');
    if (container) {
      container.remove();
    }
  }
} 