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
  width?: number;
}

export class DevMonitor {
  private pane: Pane | null = null;
  private container: HTMLElement | null = null;
  private paneContainer: HTMLElement | null = null;
  private dragHandle: HTMLElement | null = null;
  private leftResizeHandle: HTMLElement | null = null;
  private rightResizeHandle: HTMLElement | null = null;
  private engineInstance: any = null;
  private apiEndpoint: string;
  private isDragging: boolean = false;
  private isResizing: boolean = false;
  private resizeDirection: 'left' | 'right' = 'right';
  private dragOffset: { x: number, y: number } = { x: 0, y: 0 };
  private initialWidth: number = 0;
  private initialMouseX: number = 0;
  private minWidth: number = 300; // Minimum width in pixels
  
  // Specialized monitors
  private frontmatterMonitor: FrontmatterMonitor | null = null;
  private settingsMonitor: SettingsMonitor | null = null;
  private sceneNavigationMonitor: SceneNavigationMonitor | null = null;

  /**
   * Storage key for saving the monitor position
   */
  private readonly POSITION_STORAGE_KEY = 'epitome_dev_monitor_position';

  constructor(options: DevMonitorOptions = {}) {
    const containerSelector = options.containerSelector || 'body';
    this.apiEndpoint = options.apiEndpoint || '/api/scenes';
    this.container = document.querySelector(containerSelector);
    
    if (!this.container) {
      console.error(`DevMonitor: Container '${containerSelector}' not found`);
      return;
    }
    
    // Get saved position before creating the container
    const initialPosition = this.isDraggingEnabled() ? this.loadPosition() : null;
    console.log('DevMonitor: Initial position on construction:', initialPosition);
    
    // Create pane wrapper div
    this.paneContainer = document.createElement('div');
    this.paneContainer.id = 'epitome-dev-monitor';
    this.paneContainer.style.position = 'fixed';
    this.paneContainer.style.zIndex = '9999';
    this.paneContainer.style.minWidth = `${this.minWidth}px`;
    
    // Immediately set explicit position if dragging is enabled
    if (initialPosition && this.isDraggingEnabled()) {
      this.paneContainer.style.left = `${initialPosition.x}px`;
      this.paneContainer.style.top = `${initialPosition.y}px`;
      this.paneContainer.style.right = 'auto';
      this.paneContainer.style.width = `${initialPosition.width || this.minWidth}px`;
    } else {
      // Force position to top right if dragging is disabled
      const margin = 10;
      this.paneContainer.style.right = `${margin}px`;
      this.paneContainer.style.top = `${margin}px`;
      this.paneContainer.style.left = 'auto';
    }
    
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
    
    // Add double click to reset position if panel is off-screen
    this.dragHandle.addEventListener('dblclick', () => {
      this.resetPositionIfOffscreen();
    });
    
    this.paneContainer.appendChild(this.dragHandle);
    
    // Create left resize handle
    this.leftResizeHandle = document.createElement('div');
    this.leftResizeHandle.className = 'epitome-dev-monitor-resize-handle-left';
    this.leftResizeHandle.style.position = 'absolute';
    this.leftResizeHandle.style.top = '0';
    this.leftResizeHandle.style.left = '0';
    this.leftResizeHandle.style.width = '5px';
    this.leftResizeHandle.style.bottom = '0';
    this.leftResizeHandle.style.cursor = 'ew-resize';
    this.leftResizeHandle.style.zIndex = '10001';
    this.leftResizeHandle.style.transition = 'background-color 0.2s ease';
    
    // Add hover effect - allow it to work regardless of dragging being enabled
    this.leftResizeHandle.addEventListener('mouseenter', () => {
      this.leftResizeHandle!.style.backgroundColor = 'rgba(100, 100, 255, 0.3)';
    });
    this.leftResizeHandle.addEventListener('mouseleave', () => {
      this.leftResizeHandle!.style.backgroundColor = 'transparent';
    });
    
    this.paneContainer.appendChild(this.leftResizeHandle);
    
    // Create right resize handle
    this.rightResizeHandle = document.createElement('div');
    this.rightResizeHandle.className = 'epitome-dev-monitor-resize-handle-right';
    this.rightResizeHandle.style.position = 'absolute';
    this.rightResizeHandle.style.top = '0';
    this.rightResizeHandle.style.right = '0';
    this.rightResizeHandle.style.width = '5px';
    this.rightResizeHandle.style.bottom = '0';
    this.rightResizeHandle.style.cursor = 'ew-resize';
    this.rightResizeHandle.style.zIndex = '10001';
    this.rightResizeHandle.style.transition = 'background-color 0.2s ease';
    
    // Add hover effect - allow it to work regardless of dragging being enabled
    this.rightResizeHandle.addEventListener('mouseenter', () => {
      this.rightResizeHandle!.style.backgroundColor = 'rgba(100, 100, 255, 0.3)';
    });
    this.rightResizeHandle.addEventListener('mouseleave', () => {
      this.rightResizeHandle!.style.backgroundColor = 'transparent';
    });
    
    this.paneContainer.appendChild(this.rightResizeHandle);
    
    // Initialize Tweakpane
    this.pane = new Pane({
      container: this.paneContainer,
      title: options.title || 'Epitome Dev Tools'
    });
    
    // Setup drag behavior
    this.setupDragging();
    
    // Setup resize behavior
    this.setupResizing();
    
    // Initialize specialized monitors
    this.initializeMonitors();
    
    // Add window resize listener to keep panel on screen
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    
    // Update position after initialization to make sure it's correct
    // First right away to avoid any flicker
    this.updateMonitorPosition();
    
    // Then again after a short delay to ensure DOM is fully ready
    setTimeout(() => this.initializePosition(), 100);
    
    // Also add a DOMContentLoaded listener for better reliability
    // If DOM is already loaded, this will fire immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DevMonitor: DOMContentLoaded event triggered');
        setTimeout(() => this.initializePosition(), 0);
      });
    } else {
      // If DOM is already loaded (readyState is 'interactive' or 'complete')
      console.log('DevMonitor: DOM already loaded, state:', document.readyState);
      setTimeout(() => this.initializePosition(), 0);
    }
    
    // Final positioning check after a longer delay
    setTimeout(() => {
      console.log('DevMonitor: Final positioning check');
      this.initializePosition();
    }, 500);
  }

  /**
   * Initialize the panel position after a short delay
   * This ensures proper positioning on page load
   */
  private initializePosition(): void {
    console.log('DevMonitor: Initializing position');
    
    // Directly check if we have a saved position
    if (this.isDraggingEnabled()) {
      let savedPosition: MonitorPosition | null = null;
      
      // Try localStorage first
      try {
        const positionStr = localStorage.getItem(this.POSITION_STORAGE_KEY);
        if (positionStr) {
          savedPosition = JSON.parse(positionStr);
        }
      } catch (error) {
        console.error('DevMonitor: Error loading position from localStorage during init:', error);
      }
      
      // If position found, apply it directly
      if (savedPosition && this.paneContainer) {
        console.log('DevMonitor: Applying saved position during init:', savedPosition);
        
        // Apply saved position directly
        this.paneContainer.style.left = `${savedPosition.x}px`;
        this.paneContainer.style.top = `${savedPosition.y}px`;
        this.paneContainer.style.right = 'auto';
        this.paneContainer.style.width = `${savedPosition.width || this.minWidth}px`;
      } else {
        // Otherwise, fall back to updateMonitorPosition
        this.updateMonitorPosition();
      }
    } else {
      // If dragging is disabled, just use standard positioning
      this.updateMonitorPosition();
    }
    
    // Ensure panel is visible
    this.ensurePanelVisible(10);
    
    // Save position to ensure it's stored correctly
    this.savePosition();
    
    // Add a debug marker to help verify when this method has run
    console.log('DevMonitor: Position initialization complete at:', new Date().toISOString());
  }

  /**
   * Set up the dragging functionality
   */
  private setupDragging(): void {
    if (!this.dragHandle || !this.paneContainer) return;

    // Mouse down event - start dragging
    this.dragHandle.addEventListener('mousedown', (e) => {
      // Check if dragging is enabled in settings
      if (!this.isDraggingEnabled() || e.button !== 0) return;
      
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
      if (!this.isDragging || !this.paneContainer || this.isResizing) return;
      
      // Check if dragging is still enabled
      if (!this.isDraggingEnabled()) {
        this.isDragging = false;
        this.updateMonitorPosition();
        return;
      }
      
      // Get screen dimensions and panel dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const panelRect = this.paneContainer.getBoundingClientRect();
      
      // Calculate proposed new position
      let x = e.clientX - this.dragOffset.x;
      let y = e.clientY - this.dragOffset.y;
      
      // Enforce 10px gap from edges of the screen
      const minX = 10; // 10px from left edge
      const minY = 10; // 10px from top edge
      const maxX = screenWidth - panelRect.width - 10; // 10px from right edge
      const maxY = screenHeight - panelRect.height - 10; // 10px from bottom edge
      
      // Apply constraints to keep panel within bounds with 10px gap
      x = Math.max(minX, Math.min(x, maxX));
      y = Math.max(minY, Math.min(y, maxY));
      
      // Apply new position
      this.paneContainer.style.left = `${x}px`;
      this.paneContainer.style.top = `${y}px`;
    });
    
    // Mouse up event - end dragging
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        
        // Final check to ensure panel is fully visible with proper margins
        this.ensurePanelVisible(10); // Enforce 10px margin from edges
        
        // Only save position if dragging is enabled
        if (this.isDraggingEnabled()) {
          this.savePosition();
        }
      }
    });
  }
  
  /**
   * Set up the resizing functionality
   */
  private setupResizing(): void {
    if (!this.leftResizeHandle || !this.rightResizeHandle || !this.paneContainer) return;
    
    let initialRight = 0; // Store the initial right edge position
    
    // Left resize handle
    this.leftResizeHandle.addEventListener('mousedown', (e) => {
      // Allow resizing even when dragging is disabled
      if (e.button !== 0) return;
      
      this.isResizing = true;
      this.resizeDirection = 'left';
      
      // Store initial width, position, and right edge position
      const rect = this.paneContainer!.getBoundingClientRect();
      this.initialWidth = rect.width;
      this.initialMouseX = e.clientX;
      initialRight = rect.right; // Save the right edge position
      
      // Prevent text selection during resize
      e.preventDefault();
    });
    
    // Right resize handle
    this.rightResizeHandle.addEventListener('mousedown', (e) => {
      // Allow resizing even when dragging is disabled
      if (e.button !== 0) return;
      
      this.isResizing = true;
      this.resizeDirection = 'right';
      
      // Store initial width
      const rect = this.paneContainer!.getBoundingClientRect();
      this.initialWidth = rect.width;
      this.initialMouseX = e.clientX;
      
      // Prevent text selection during resize
      e.preventDefault();
    });
    
    // Mouse move for resizing
    document.addEventListener('mousemove', (e) => {
      if (!this.isResizing || !this.paneContainer) return;
      
      // Get screen dimensions for boundary checking
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const margin = 10; // Always maintain 10px gap from edges
      
      if (this.resizeDirection === 'right') {
        // Right resize: just add deltaX to width
        const deltaX = e.clientX - this.initialMouseX;
        
        // Calculate proposed new width
        let newWidth = Math.max(this.initialWidth + deltaX, this.minWidth);
        
        // Check if resizing would put the panel off-screen
        const rect = this.paneContainer.getBoundingClientRect();
        if (rect.left + newWidth > screenWidth - margin) {
          // Limit width to keep it on screen with margin
          newWidth = screenWidth - rect.left - margin;
        }
        
        // Apply the new width if it meets minimum requirements
        if (newWidth >= this.minWidth) {
          this.paneContainer.style.width = `${newWidth}px`;
        }
      } else {
        // Left resize: we need to maintain the right edge position
        
        // Handle differently based on whether dragging is enabled
        if (this.isDraggingEnabled()) {
          // When dragging is enabled, we move both width and position
          const deltaX = e.clientX - this.initialMouseX;
          
          // Get current rect
          const rect = this.paneContainer.getBoundingClientRect();
          
          // Calculate proposed new width and left position
          let newWidth = Math.max(this.initialWidth - deltaX, this.minWidth);
          let newLeft = rect.left;
          
          // Calculate where the left edge would be after resize
          if (this.initialWidth - deltaX >= this.minWidth) {
            newLeft = parseFloat(this.paneContainer.style.left || '0') + deltaX;
          }
          
          // Make sure we don't go off-screen and maintain the margin
          if (newLeft < margin) {
            newLeft = margin;
            // Adjust width accordingly since we can't move further left
            newWidth = rect.right - newLeft;
          }
          
          // Make sure the right edge stays on screen too with margin
          if (newLeft + newWidth > screenWidth - margin) {
            newWidth = screenWidth - newLeft - margin;
          }
          
          // Apply the constrained values
          if (newWidth >= this.minWidth) {
            this.paneContainer.style.width = `${newWidth}px`;
            this.paneContainer.style.left = `${newLeft}px`;
          }
          
          // Fine-tune right edge position to keep it fixed
          const newRect = this.paneContainer.getBoundingClientRect();
          const rightDrift = initialRight - newRect.right;
          
          if (Math.abs(rightDrift) > 1) { // Only adjust if the drift is significant
            const adjustedLeft = parseFloat(this.paneContainer.style.left || '0') + rightDrift;
            if (adjustedLeft >= margin && adjustedLeft + newRect.width <= screenWidth - margin) {
              this.paneContainer.style.left = `${adjustedLeft}px`;
            }
          }
        } else {
          // When dragging is disabled, we're anchored to the right side
          const deltaX = this.initialMouseX - e.clientX; // Reversed for right-anchored panel
          
          // Calculate new width, ensuring it doesn't make the panel go off-screen
          let newWidth = Math.max(this.initialWidth + deltaX, this.minWidth);
          
          // Ensure the panel doesn't expand beyond the left edge of the screen
          // Since it's right-anchored, we need to check if the width would make it go off-screen
          if (screenWidth - margin - newWidth < margin) { // Maintain margin on both sides
            newWidth = screenWidth - (margin * 2); // Limit to screen width minus margins
          }
          
          this.paneContainer.style.width = `${newWidth}px`;
        }
      }
    });
    
    // Mouse up event - end resizing
    document.addEventListener('mouseup', () => {
      if (this.isResizing) {
        this.isResizing = false;
        
        // Final check to ensure panel is fully visible with consistent margin
        this.ensurePanelVisible(10); // Always use 10px margin
        
        // Save position after resize
        if (this.isDraggingEnabled()) {
          this.savePosition();
        }
      }
    });
  }
  
  /**
   * Check if dragging is enabled in settings
   */
  private isDraggingEnabled(): boolean {
    // Check settings monitor for drag setting
    if (this.settingsMonitor) {
      return this.settingsMonitor.isMonitorDragEnabled();
    }
    
    // Default to enabled if settings monitor not available yet
    try {
      // Try to get from localStorage directly
      const settingsJson = localStorage.getItem('epitome_settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        if (typeof settings.monitorDragEnabled === 'boolean') {
          return settings.monitorDragEnabled;
        }
      }
    } catch (error) {
      console.error('Error checking drag enabled setting:', error);
    }
    
    return true; // Default to enabled
  }
  
  /**
   * Update the monitor position based on current settings
   */
  private updateMonitorPosition(): void {
    if (!this.paneContainer) return;
    
    // Get the current width before making any changes
    const currentWidth = this.paneContainer.getBoundingClientRect().width;
    const margin = 10; // 10px margin from edges
    
    if (this.isDraggingEnabled()) {
      // Use saved position if dragging is enabled
      const savedPosition = this.loadPosition();
      console.log('DevMonitor: Applying saved position:', savedPosition);
      
      // Apply saved position
      this.paneContainer.style.left = `${savedPosition.x}px`;
      this.paneContainer.style.top = `${savedPosition.y}px`;
      this.paneContainer.style.right = 'auto';
      
      // Use saved width if available, otherwise use current width with minimum constraint
      const width = savedPosition.width || Math.max(currentWidth, this.minWidth);
      this.paneContainer.style.width = `${width}px`;
      
      // Show resize handles
      if (this.leftResizeHandle && this.rightResizeHandle) {
        this.leftResizeHandle.style.display = 'block';
        this.rightResizeHandle.style.display = 'block';
      }
      
      // Make sure it's within screen bounds
      this.ensurePanelVisible(margin);
      
      // Save the position to make sure it's stored correctly
      setTimeout(() => this.savePosition(), 100);
    } else {
      // Force position to top right if dragging is disabled
      console.log('DevMonitor: Positioning at top right (dragging disabled)');
      
      // Preserve the current width but ensure minimum width
      const width = Math.max(currentWidth, this.minWidth);
      this.paneContainer.style.width = `${width}px`;
      
      // Position at top right corner with margin
      this.paneContainer.style.right = `${margin}px`;
      this.paneContainer.style.top = `${margin}px`;
      this.paneContainer.style.left = 'auto';
      
      // Ensure it's not wider than the available space
      if (typeof window !== 'undefined') {
        const maxWidth = window.innerWidth - (margin * 2);
        if (width > maxWidth) {
          this.paneContainer.style.width = `${maxWidth}px`;
        }
      }
      
      // Always show resize handles, even when dragging is disabled
      if (this.leftResizeHandle && this.rightResizeHandle) {
        this.leftResizeHandle.style.display = 'block';
        this.rightResizeHandle.style.display = 'block';
      }
      
      // Save the current width
      setTimeout(() => this.savePosition(), 100);
    }
  }
  
  /**
   * Save the current position to localStorage
   */
  private savePosition(): void {
    if (!this.paneContainer) return;
    
    const rect = this.paneContainer.getBoundingClientRect();
    
    if (this.isDraggingEnabled()) {
      // Save both position and width
      const position: MonitorPosition = {
        x: rect.left,
        y: rect.top,
        width: rect.width
      };
      
      // Log for debugging
      console.log('DevMonitor: Saving position to storage:', position);
      
      // Save to all storage mechanisms
      this.savePositionToStorage(position);
    } else {
      // When dragging is disabled, still save the width
      // Get existing position or create new
      const savedPosition = storage.get<MonitorPosition>(this.POSITION_STORAGE_KEY) || {
        x: 10,
        y: 10
      };
      
      // Update just the width
      savedPosition.width = rect.width;
      
      // Log for debugging
      console.log('DevMonitor: Saving width to storage when dragging disabled:', savedPosition);
      
      // Save to all storage mechanisms
      this.savePositionToStorage(savedPosition);
    }
  }
  
  /**
   * Load the saved position from localStorage
   */
  private loadPosition(): MonitorPosition {
    const defaultPosition: MonitorPosition = { x: 10, y: 10, width: this.minWidth };
    const margin = 10; // Consistent 10px margin
    
    // If dragging is disabled, return position for top right
    if (!this.isDraggingEnabled()) {
      if (typeof window !== 'undefined') {
        return { 
          x: window.innerWidth - this.minWidth - margin,
          y: margin,
          width: this.minWidth
        };
      }
      return defaultPosition;
    }
    
    // Try localStorage directly first - this is more reliable
    let savedPosition: MonitorPosition | null = null;
    
    try {
      const positionStr = localStorage.getItem(this.POSITION_STORAGE_KEY);
      if (positionStr) {
        savedPosition = JSON.parse(positionStr);
        console.log('DevMonitor: Retrieved position from localStorage directly:', savedPosition);
      }
    } catch (error) {
      console.error('DevMonitor: Error loading position from localStorage:', error);
    }
    
    // If not found in localStorage, try the storage helper
    if (!savedPosition) {
      savedPosition = storage.get<MonitorPosition>(this.POSITION_STORAGE_KEY);
      if (savedPosition) {
        console.log('DevMonitor: Retrieved position from storage helper:', savedPosition);
        
        // Sync back to localStorage for future consistency
        try {
          localStorage.setItem(this.POSITION_STORAGE_KEY, JSON.stringify(savedPosition));
        } catch (error) {
          console.error('DevMonitor: Error syncing position to localStorage:', error);
        }
      }
    }
    
    // If still no saved position, calculate a good position based on current state
    if (!savedPosition) {
      console.log('DevMonitor: No saved position found, calculating a new one');
      
      // If we're re-enabling dragging and we have a pane container, calculate position 
      // based on the actual width of the panel
      if (this.paneContainer && typeof window !== 'undefined') {
        const rect = this.paneContainer.getBoundingClientRect();
        const panelWidth = Math.max(rect.width, this.minWidth);
        
        // If panel is currently positioned with right property (from non-draggable mode),
        // convert its visual position to left coordinates
        if (this.paneContainer.style.right && this.paneContainer.style.left === 'auto') {
          const rightValue = parseFloat(this.paneContainer.style.right) || margin;
          const newPosition = {
            x: window.innerWidth - panelWidth - rightValue,
            y: rect.top,
            width: panelWidth
          };
          console.log('DevMonitor: Converted right-anchored position to:', newPosition);
          
          // Save this position for future use
          this.savePositionToStorage(newPosition);
          
          return newPosition;
        }
        
        // Otherwise use current position
        const currentPosition = {
          x: rect.left,
          y: rect.top,
          width: panelWidth
        };
        console.log('DevMonitor: Using current visual position:', currentPosition);
        
        // Save this position for future use
        this.savePositionToStorage(currentPosition);
        
        return currentPosition;
      }
      console.log('DevMonitor: Using default position:', defaultPosition);
      
      // Save default position for future use
      this.savePositionToStorage(defaultPosition);
      
      return defaultPosition;
    }
    
    // Validate position (make sure it's on screen)
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let positionChanged = false;
      
      // If position is off-screen, reset to default
      if (savedPosition.x < margin || savedPosition.x > windowWidth - margin - 50 ||
          savedPosition.y < margin || savedPosition.y > windowHeight - margin - 50) {
        console.log('DevMonitor: Saved position is off-screen, using default position');
        savedPosition = { ...defaultPosition };
        positionChanged = true;
      }
      
      // Ensure width is at least the minimum
      if (!savedPosition.width || savedPosition.width < this.minWidth) {
        savedPosition.width = this.minWidth;
        positionChanged = true;
      }
      
      // Make sure width doesn't exceed screen bounds
      if (savedPosition.width > windowWidth - (margin * 2)) {
        savedPosition.width = windowWidth - (margin * 2);
        positionChanged = true;
      }
      
      // Make sure panel is within screen bounds
      if (savedPosition.x + savedPosition.width > windowWidth - margin) {
        savedPosition.x = windowWidth - savedPosition.width - margin;
        positionChanged = true;
      }
      
      // If position was adjusted, save the adjusted position
      if (positionChanged) {
        this.savePositionToStorage(savedPosition);
      }
    }
    
    console.log('DevMonitor: Using validated saved position:', savedPosition);
    return savedPosition;
  }
  
  /**
   * Save position to all storage mechanisms
   */
  private savePositionToStorage(position: MonitorPosition): void {
    // Save to storage helper
    storage.set(this.POSITION_STORAGE_KEY, position);
    
    // Also save directly to localStorage
    try {
      localStorage.setItem(this.POSITION_STORAGE_KEY, JSON.stringify(position));
      console.log('DevMonitor: Position saved to storage:', position);
    } catch (error) {
      console.error('DevMonitor: Error saving position to localStorage:', error);
    }
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

    // Set up settings change listeners
    this.setupSettingsListeners();
  }

  /**
   * Set up listeners for settings changes
   */
  private setupSettingsListeners(): void {
    // Check for storage events to react to settings changes from other components
    window.addEventListener('storage', (event) => {
      if (event.key === 'epitome_settings') {
        // Update our position if drag setting changed
        this.updateMonitorPosition();
      } else if (event.key === this.POSITION_STORAGE_KEY) {
        // Position was updated in another tab/window
        console.log('DevMonitor: Position updated in another tab/window, reloading');
        this.updateMonitorPosition();
      }
    });
    
    // Also set up a specific position reload listener for cross-component updates
    document.addEventListener('epitome:dev_monitor_position_changed', () => {
      console.log('DevMonitor: Received position change event, reloading');
      this.updateMonitorPosition();
    });
    
    // Handle visibility changes (page becomes visible after being in background)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('DevMonitor: Page became visible, checking position');
        setTimeout(() => this.initializePosition(), 100);
      }
    });
    
    // Handle beforeunload to save position before page unload
    window.addEventListener('beforeunload', () => {
      console.log('DevMonitor: Page unloading, saving final position');
      this.savePosition();
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
      
      // After settings are initialized, update the position
      this.updateMonitorPosition();
      
      // Save position to ensure it's properly stored
      this.savePosition();
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
    
    // Make sure position is correct after initialization
    setTimeout(() => {
      console.log('DevMonitor: Ensuring position after initialization');
      this.updateMonitorPosition();
      this.ensurePanelVisible(10);
    }, 200);
    
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

  /**
   * Handle window resize to ensure panel stays visible
   */
  private handleWindowResize(): void {
    if (!this.paneContainer) return;
    
    const margin = 10; // Consistent 10px margin
    
    // Get the current width
    const currentWidth = this.paneContainer.getBoundingClientRect().width;
    
    // Check if current width is less than minimum and adjust if needed
    if (currentWidth < this.minWidth) {
      this.paneContainer.style.width = `${this.minWidth}px`;
    }
    
    // If width would now exceed screen width, adjust it
    if (currentWidth > window.innerWidth - (margin * 2)) {
      this.paneContainer.style.width = `${window.innerWidth - (margin * 2)}px`;
    }
    
    if (this.isDraggingEnabled()) {
      // Check if panel is still visible after resize
      this.ensurePanelVisible(margin);
    } else {
      // If not draggable, just update position to stay at top right
      this.updateMonitorPosition();
    }
  }
  
  /**
   * Ensure panel is visible on screen
   */
  private ensurePanelVisible(margin: number = 10): void {
    if (!this.paneContainer) return;
    
    const rect = this.paneContainer.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    let needsUpdate = false;
    let newX = rect.left;
    let newY = rect.top;
    let newWidth = rect.width;
    
    // Ensure the minimum width
    if (newWidth < this.minWidth) {
      newWidth = this.minWidth;
      needsUpdate = true;
    }
    
    // Ensure the width isn't greater than screen width minus margins
    if (newWidth > screenWidth - (margin * 2)) {
      newWidth = screenWidth - (margin * 2);
      needsUpdate = true;
    }
    
    // Check horizontal position
    if (rect.right < margin) {
      // Too far left (right edge < margin), move it back
      newX = margin;
      needsUpdate = true;
    } else if (rect.left > screenWidth - margin) {
      // Too far right (left edge > screen width - margin), move it back
      newX = screenWidth - rect.width - margin;
      needsUpdate = true;
    } else if (rect.left < margin) {
      // Left edge < margin
      newX = margin;
      needsUpdate = true;
    } else if (rect.right > screenWidth - margin) {
      // Right edge > screen width - margin
      newX = screenWidth - rect.width - margin;
      needsUpdate = true;
    }
    
    // Check vertical position
    if (rect.bottom < margin) {
      // Too far up (bottom edge < margin), move it down
      newY = margin;
      needsUpdate = true;
    } else if (rect.top > screenHeight - margin) {
      // Too far down (top edge > screen height - margin), move it up
      newY = screenHeight - rect.height - margin;
      needsUpdate = true;
    } else if (rect.top < margin) {
      // Top edge < margin
      newY = margin;
      needsUpdate = true;
    } else if (rect.bottom > screenHeight - margin) {
      // Bottom edge > screen height - margin
      newY = screenHeight - rect.height - margin;
      needsUpdate = true;
    }
    
    // Apply updates if needed
    if (needsUpdate) {
      // Make sure final width is within allowed bounds
      newWidth = Math.max(this.minWidth, Math.min(newWidth, screenWidth - (margin * 2)));
      
      // Apply position updates
      this.paneContainer.style.width = `${newWidth}px`;
      this.paneContainer.style.left = `${Math.max(margin, newX)}px`;
      this.paneContainer.style.top = `${Math.max(margin, newY)}px`;
      
      // Save position
      this.savePosition();
      
      console.log('DevMonitor: Updated position to keep panel visible on screen');
    }
  }
  
  /**
   * Reset position if panel is off-screen
   * This is a safety measure if someone manages to get the panel off-screen
   */
  private resetPositionIfOffscreen(): void {
    if (!this.paneContainer) return;
    
    const rect = this.paneContainer.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const margin = 10; // 10px margin from edges
    
    // Check if panel is mostly off-screen in any direction
    const isOffScreen = 
      rect.left < margin || 
      rect.top < margin || 
      rect.left > screenWidth - margin || 
      rect.top > screenHeight - margin || 
      rect.right < margin ||
      rect.bottom < margin ||
      rect.right > screenWidth - margin ||
      rect.bottom > screenHeight - margin;
      
    if (isOffScreen) {
      if (this.isDraggingEnabled()) {
        // When draggable, reset to center of screen
        this.paneContainer.style.left = `${(screenWidth - rect.width) / 2}px`;
        this.paneContainer.style.top = `${(screenHeight - rect.height) / 2}px`;
      } else {
        // When not draggable, keep fixed to top right with margin
        this.paneContainer.style.right = `${margin}px`;
        this.paneContainer.style.top = `${margin}px`;
        this.paneContainer.style.left = 'auto';
      }
      
      // Ensure minimum width and maximum screen width
      const safeWidth = Math.min(Math.max(rect.width, this.minWidth), screenWidth - (margin * 2));
      this.paneContainer.style.width = `${safeWidth}px`;
      
      this.savePosition();
      console.log('DevMonitor: Reset position because panel was off-screen');
    }
  }
} 