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
import { storage } from '@/helpers/storage';

interface DevMonitorOptions {
  containerSelector?: string;
  title?: string;
  apiEndpoint?: string;
}

interface MonitorPosition {
  x: number;
  y: number;
}

export class DevMonitor {
  private pane: Pane | null = null;
  private container: HTMLElement | null = null;
  private paneContainer: HTMLElement | null = null;
  private dragHandle: HTMLElement | null = null;
  private engineInstance: any = null;
  private apiEndpoint: string;
  private isDragging: boolean = false;
  private dragOffset: { x: number, y: number } = { x: 0, y: 0 };
  
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
    this.paneContainer = document.createElement('div');
    this.paneContainer.id = 'epitome-dev-monitor';
    this.paneContainer.style.position = 'fixed';
    this.paneContainer.style.zIndex = '9999';
    
    // Load saved position or use defaults
    const savedPosition = this.loadPosition();
    this.paneContainer.style.left = `${savedPosition.x}px`;
    this.paneContainer.style.top = `${savedPosition.y}px`;
    
    this.container.appendChild(this.paneContainer);
    
    // Create drag handle
    this.dragHandle = document.createElement('div');
    this.dragHandle.className = 'epitome-dev-monitor-drag-handle';
    this.dragHandle.style.cursor = 'move';
    this.dragHandle.style.position = 'absolute';
    this.dragHandle.style.top = '0';
    this.dragHandle.style.left = '0';
    this.dragHandle.style.right = '0';
    this.dragHandle.style.height = '28px'; // Height of Tweakpane title bar
    this.dragHandle.style.zIndex = '10000';
    this.paneContainer.appendChild(this.dragHandle);
    
    // Initialize Tweakpane
    this.pane = new Pane({
      container: this.paneContainer,
      title: options.title || 'Epitome Dev Tools'
    });
    
    // Setup drag behavior
    this.setupDragging();
    
    // Initialize specialized monitors
    this.initializeMonitors();
  }

  /**
   * Set up the dragging functionality
   */
  private setupDragging(): void {
    if (!this.dragHandle || !this.paneContainer) return;

    // Mouse down event - start dragging
    this.dragHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left mouse button
      this.isDragging = true;
      
      // Calculate offset of mouse pointer relative to panel
      const rect = this.paneContainer!.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Prevent text selection during drag
      e.preventDefault();
    });
    
    // Mouse move event - dragging in progress
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.paneContainer) return;
      
      // Calculate new position
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      
      // Apply new position
      this.paneContainer.style.left = `${x}px`;
      this.paneContainer.style.top = `${y}px`;
    });
    
    // Mouse up event - end dragging
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.savePosition();
      }
    });
  }
  
  /**
   * Save the current position to localStorage
   */
  private savePosition(): void {
    if (!this.paneContainer) return;
    
    const rect = this.paneContainer.getBoundingClientRect();
    const position: MonitorPosition = {
      x: rect.left,
      y: rect.top
    };
    
    storage.set('epitome_dev_monitor_position', position);
  }
  
  /**
   * Load the saved position from localStorage
   */
  private loadPosition(): MonitorPosition {
    const defaultPosition: MonitorPosition = { x: 10, y: 10 };
    const savedPosition = storage.get<MonitorPosition>('epitome_dev_monitor_position');
    
    // If no saved position, return default
    if (!savedPosition) {
      return defaultPosition;
    }
    
    // Validate position (make sure it's on screen)
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // If position is off-screen, reset to default
      if (savedPosition.x < 0 || savedPosition.x > windowWidth - 50 ||
          savedPosition.y < 0 || savedPosition.y > windowHeight - 50) {
        return defaultPosition;
      }
    }
    
    return savedPosition;
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