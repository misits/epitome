/**
 * SettingsMonitor
 * A Tweakpane-based monitor for controlling engine settings
 */

import { Pane } from 'tweakpane';
import { EpitomeSettings } from '@/types/spa';

export interface SettingsMonitorOptions {
  title?: string;
  expanded?: boolean;
}

export class SettingsMonitor {
  private pane: Pane | null = null;
  private folder: any = null; // Tweakpane folder
  private engineInstance: any = null;
  private settings: Record<string, any> = {
    animationMode: true,
    monitorDragEnabled: true
  };
  private animationBinding: any = null;
  private monitorDragBinding: any = null;

  constructor(pane: Pane, options: SettingsMonitorOptions = {}) {
    this.pane = pane;
    
    if (!this.pane) {
      console.error('SettingsMonitor: Pane is required');
      return;
    }
    
    // Create the folder
    this.folder = this.pane.addFolder({
      title: options.title || 'Settings',
      expanded: options.expanded || false
    });
    
    // Add animation setting
    this.animationBinding = this.folder.addBinding(this.settings, 'animationMode', {
      label: 'Animations'
    }).on('change', (ev: { value: boolean }) => {
      if (this.engineInstance) {
        // Use the engine's setAnimations method which also saves to localStorage
        const result = this.engineInstance.setAnimations(ev.value);
        
        // Update the current scene's active classes
        this.updateSceneClasses(result);
        
        // Show feedback
        this.showNotification(`Animations ${result ? 'enabled' : 'disabled'}`, 'info');
        
        // Ensure our local state reflects the actual engine state
        this.settings.animationMode = result;
        this.refreshUi();
        
        // Verify the localStorage was updated correctly
        this.verifyLocalStorageSettings();
      }
    });
    
    // Add monitor drag setting
    this.monitorDragBinding = this.folder.addBinding(this.settings, 'monitorDragEnabled', {
      label: 'Monitor Dragging'
    }).on('change', (ev: { value: boolean }) => {
      // Update localStorage directly
      this.setMonitorDragging(ev.value);
      
      // Show feedback
      this.showNotification(`Monitor dragging ${ev.value ? 'enabled' : 'disabled'}`, 'info');
      
      // Force monitor to top right if disabled
      if (!ev.value) {
        this.resetMonitorPosition();
      }
    });
    
    // Add button to clear all settings
    this.folder.addButton({
      title: 'Reset All Settings'
    }).on('click', () => {
      this.resetAllSettings();
    });
    
    // Initialize from localStorage if available
    this.loadSettingsFromLocalStorage();
  }

  /**
   * Initialize with the engine instance
   */
  public initialize(engineInstance: any): void {
    this.engineInstance = engineInstance;
    
    // Update initial state from engine
    this.syncStateFromEngine();
  }

  /**
   * Update scene classes when animations are toggled
   */
  private updateSceneClasses(animationsEnabled: boolean): void {
    try {
      // Find the app container
      const appContainer = document.getElementById('app-container');
      if (!appContainer) return;
      
      if (animationsEnabled) {
        // If animations are enabled, first remove all animation-related classes
        appContainer.classList.remove('no-animation', 'transitioning');
        
        // Force a reflow to ensure transitions work properly
        void appContainer.offsetWidth;
        
        // Then add the active class to enable transitions
        appContainer.classList.add('active');
      } else {
        // If animations are disabled, remove animation classes first
        appContainer.classList.remove('active', 'transitioning');
        
        // Force a reflow
        void appContainer.offsetWidth;
        
        // Add no-animation class
        appContainer.classList.add('no-animation');
      }
      
      // Log the current classes for debugging
      if (this.engineInstance && this.engineInstance.options.debugMode) {
        console.log('Updated scene classes:', appContainer.className);
      }
    } catch (error) {
      console.error('Failed to update scene classes:', error);
    }
  }

  /**
   * Load settings directly from localStorage
   */
  private loadSettingsFromLocalStorage(): void {
    try {
      const settingsJson = localStorage.getItem('epitome_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson) as EpitomeSettings;
        if (typeof settings.animations === 'boolean') {
          this.settings.animationMode = settings.animations;
        }
        if (typeof settings.monitorDragEnabled === 'boolean') {
          this.settings.monitorDragEnabled = settings.monitorDragEnabled;
        }
        this.refreshUi();
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }
  
  /**
   * Verify that localStorage has been updated correctly
   */
  private verifyLocalStorageSettings(): void {
    try {
      const settingsJson = localStorage.getItem('epitome_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson) as EpitomeSettings;
        
        // Check if the localStorage settings match our current state
        const animMatch = settings.animations === this.settings.animationMode;
        const dragMatch = settings.monitorDragEnabled === this.settings.monitorDragEnabled;
        
        if (!animMatch || !dragMatch) {
          console.warn('Settings in localStorage do not match current state:', 
            { 
              animations: { localStorage: settings.animations, current: this.settings.animationMode },
              monitorDrag: { localStorage: settings.monitorDragEnabled, current: this.settings.monitorDragEnabled }
            });
            
          // Force update localStorage to match our current state
          this.updateLocalStorage();
        }
      } else {
        // Settings don't exist yet, create them
        this.updateLocalStorage();
      }
    } catch (error) {
      console.error('Failed to verify localStorage settings:', error);
    }
  }
  
  /**
   * Update localStorage with current settings
   */
  private updateLocalStorage(): void {
    try {
      // Get existing settings or create new object
      let settings: EpitomeSettings;
      try {
        const settingsJson = localStorage.getItem('epitome_settings');
        settings = settingsJson ? JSON.parse(settingsJson) : {};
      } catch {
        settings = {};
      }
      
      // Update with current state
      settings.animations = this.settings.animationMode;
      settings.monitorDragEnabled = this.settings.monitorDragEnabled;
      
      // Save back to localStorage
      localStorage.setItem('epitome_settings', JSON.stringify(settings));
      
      console.log('Updated settings in localStorage:', settings);
    } catch (error) {
      console.error('Failed to update localStorage settings:', error);
    }
  }

  /**
   * Synchronize settings state from engine
   */
  private syncStateFromEngine(): void {
    if (!this.engineInstance) return;
    
    try {
      // Get animation setting from engine
      const animEnabled = this.engineInstance.getAnimations();
      
      // Update our local state
      this.settings.animationMode = animEnabled;
      
      // Refresh UI to reflect the engine state
      this.refreshUi();
      
      // Make sure current scene has correct classes
      this.updateSceneClasses(animEnabled);
      
      console.log('SettingsMonitor: Synced settings from engine:', { animations: animEnabled });
    } catch (error) {
      console.error('Failed to sync settings from engine:', error);
    }
  }

  /**
   * Update settings from the engine and refresh UI
   */
  public update(): void {
    this.syncStateFromEngine();
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
   * Reset all settings to defaults
   */
  private resetAllSettings(): void {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        // Remove settings from localStorage
        localStorage.removeItem('epitome_settings');
        
        // Set default states
        this.settings.animationMode = true;
        this.settings.monitorDragEnabled = true;
        
        // Apply to engine if available
        if (this.engineInstance) {
          this.engineInstance.setAnimations(true);
          
          // Update scene classes for default animation state
          this.updateSceneClasses(true);
          
          // Reset monitor position
          this.resetMonitorPosition();
        }
        
        // Refresh UI
        this.refreshUi();
        
        this.showNotification('All settings reset to defaults', 'success');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        this.showNotification('Failed to reset settings', 'error');
      }
    }
  }
  
  /**
   * Set monitor dragging setting
   */
  private setMonitorDragging(enabled: boolean): void {
    this.settings.monitorDragEnabled = enabled;
    
    // Update localStorage
    try {
      // Get existing settings or create new object
      let settings: EpitomeSettings;
      try {
        const settingsJson = localStorage.getItem('epitome_settings');
        settings = settingsJson ? JSON.parse(settingsJson) : {};
      } catch {
        settings = {};
      }
      
      // Update with current state
      settings.monitorDragEnabled = enabled;
      
      // Save back to localStorage
      localStorage.setItem('epitome_settings', JSON.stringify(settings));
      
      // When disabling dragging, remove the saved position so that when
      // re-enabled, it will correctly calculate a new position
      if (!enabled) {
        localStorage.removeItem('epitome_dev_monitor_position');
      }
      
      console.log('Updated monitor drag setting:', enabled);
    } catch (error) {
      console.error('Failed to update monitor drag setting:', error);
    }
  }
  
  /**
   * Reset monitor position to top right
   */
  private resetMonitorPosition(): void {
    try {
      // Remove any saved position
      localStorage.removeItem('epitome_dev_monitor_position');
      
      // Find the dev monitor element
      const monitorEl = document.getElementById('epitome-dev-monitor');
      if (monitorEl) {
        // Get current width before making changes
        const currentWidth = monitorEl.getBoundingClientRect().width;
        
        // Position in top right with 10px padding
        monitorEl.style.right = '10px';
        monitorEl.style.top = '10px';
        monitorEl.style.left = 'auto';
        
        // Preserve width if it exists
        if (currentWidth > 0) {
          monitorEl.style.width = `${currentWidth}px`;
        }
        
        console.log('Reset monitor position to top right');
      }
    } catch (error) {
      console.error('Failed to reset monitor position:', error);
    }
  }
  
  /**
   * Get monitor drag enabled setting
   */
  public isMonitorDragEnabled(): boolean {
    return this.settings.monitorDragEnabled;
  }
  
  /**
   * Show a notification message
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create a status message in the UI
    const existingElement = document.getElementById('settings-notification');
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
    // Nothing specific to dispose
  }
} 