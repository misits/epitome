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
    animationMode: true
  };
  private animationBinding: any = null;

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
        // If animations are enabled, add active class and remove no-animation
        appContainer.classList.remove('no-animation');
        appContainer.classList.add('active');
      } else {
        // If animations are disabled, use no-animation class
        appContainer.classList.remove('active', 'transitioning');
        appContainer.classList.add('no-animation');
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
          this.refreshUi();
        }
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
        
        if (!animMatch) {
          console.warn('Settings in localStorage do not match current state:', 
            { localStorage: settings.animations, current: this.settings.animationMode });
            
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
        
        // Set default animation state 
        this.settings.animationMode = true;
        
        // Apply to engine if available
        if (this.engineInstance) {
          this.engineInstance.setAnimations(true);
          
          // Update scene classes for default animation state
          this.updateSceneClasses(true);
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
   * Show a notification message
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create a status message in the UI
    const existingElement = document.getElementById('settings-notification');
    if (existingElement) {
      document.body.removeChild(existingElement);
    }
    
    const statusElement = document.createElement('div');
    statusElement.id = 'settings-notification';
    statusElement.style.position = 'fixed';
    statusElement.style.bottom = '20px';
    statusElement.style.right = '20px';
    statusElement.style.padding = '8px 12px';
    statusElement.style.borderRadius = '4px';
    statusElement.style.zIndex = '10000';
    statusElement.style.fontSize = '14px';
    statusElement.style.fontFamily = 'sans-serif';
    statusElement.textContent = message;
    
    // Set color based on type
    switch (type) {
      case 'success':
        statusElement.style.backgroundColor = '#4CAF50';
        statusElement.style.color = '#fff';
        break;
      case 'error':
        statusElement.style.backgroundColor = '#F44336';
        statusElement.style.color = '#fff';
        break;
      case 'info':
      default:
        statusElement.style.backgroundColor = '#333';
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