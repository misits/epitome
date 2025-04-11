/**
 * FrontmatterMonitor
 * A Tweakpane-based monitor for viewing and editing scene frontmatter data
 * directly from markdown files
 */

import { Pane } from 'tweakpane';
import { Scene } from '@/types/spa';

export interface FrontmatterMonitorOptions {
  title?: string;
  expanded?: boolean;
  apiEndpoint?: string; // Endpoint for accessing markdown files
  autoSave?: boolean;    // Whether to auto-save changes
  autoSaveDelay?: number; // Delay in ms for auto-save
  textFieldConfig?: {
    introductionRows?: number;
    summaryRows?: number;
    longTextThreshold?: {
      words?: number;
      chars?: number;
    };
    longTextRows?: {
      min?: number;
      medium?: number;
      large?: number;
    };
  };
}

export class FrontmatterMonitor {
  private pane: Pane | null = null;
  private folder: any = null; // Tweakpane folder
  private currentScene: Scene | null = null;
  private engineInstance: any = null;
  private apiEndpoint: string;
  private frontmatterData: Record<string, any> = {};
  private frontmatterBindings: Record<string, any> = {};
  private autoSave: boolean;
  private autoSaveDelay: number;
  private autoSaveTimeout: number | null = null;
  private isSaving: boolean = false;
  private hasUnsavedChanges: boolean = false;
  
  // Text field configuration defaults
  private textFieldConfig = {
    introductionRows: 14,
    summaryRows: 6,
    longTextThreshold: {
      words: 5,
      chars: 30
    },
    longTextRows: {
      min: 5,
      medium: 7,
      large: 10
    }
  };

  // Registry of discovered scene types (populated dynamically)
  private discoveredSceneTypes: Record<string, string> = {};

  constructor(pane: Pane, options: FrontmatterMonitorOptions = {}) {
    this.pane = pane;
    this.apiEndpoint = options.apiEndpoint || '/api/scenes';
    this.autoSave = options.autoSave !== undefined ? options.autoSave : false; // Default to false
    this.autoSaveDelay = options.autoSaveDelay || 2000; // Default 2 seconds
    
    // Apply custom text field configuration if provided
    if (options.textFieldConfig) {
      // Merge with defaults
      this.textFieldConfig = {
        ...this.textFieldConfig,
        ...options.textFieldConfig,
        longTextThreshold: {
          ...this.textFieldConfig.longTextThreshold,
          ...options.textFieldConfig.longTextThreshold || {}
        },
        longTextRows: {
          ...this.textFieldConfig.longTextRows,
          ...options.textFieldConfig.longTextRows || {}
        }
      };
    }
    
    if (!this.pane) {
      console.error('FrontmatterMonitor: Pane is required');
      return;
    }
    
    // Create the folder
    this.folder = this.pane.addFolder({
      title: options.title || 'Frontmatter',
      expanded: options.expanded || false
    });
    
    // Add a more prominent save button (renamed from "Apply Changes" to "Save Changes")
    this.folder.addButton({
      title: 'Save Changes'
    }).on('click', () => {
      this.saveChanges();
    });
  }

  /**
   * Initialize with the engine instance and register scene types
   */
  public initialize(engineInstance: any): void {
    this.engineInstance = engineInstance;
    
    // If engine instance has sceneTypes, register them
    if (engineInstance && engineInstance.sceneTypes) {
      this.registerSceneTypes(engineInstance.sceneTypes);
    }
  }

  /**
   * Register available scene types
   */
  public registerSceneTypes(sceneTypes: Record<string, string> | string[]): void {
    // Clear existing scene types
    this.discoveredSceneTypes = {};
    
    if (Array.isArray(sceneTypes)) {
      // If it's an array of strings, use the values as both keys and values
      sceneTypes.forEach(type => {
        // Capitalize first letter for display
        const displayName = type.charAt(0).toUpperCase() + type.slice(1);
        this.discoveredSceneTypes[displayName] = type;
      });
    } else {
      // If it's an object, use it directly
      this.discoveredSceneTypes = { ...sceneTypes };
    }
    
    // Always ensure 'custom' is available
    if (!Object.values(this.discoveredSceneTypes).includes('custom')) {
      this.discoveredSceneTypes['Custom'] = 'custom';
    }
    
    console.log('FrontmatterMonitor: Registered scene types:', this.discoveredSceneTypes);
  }

  /**
   * Update the monitor with current scene data
   * This loads data directly from the markdown file, not from scenes.json
   */
  public async update(scene: Scene, quiet: boolean = false): Promise<void> {
    if (!scene || !scene.id) return;
    
    this.currentScene = scene;
    const sceneId = scene.id;
    
    if (!quiet) {
      console.log('FrontmatterMonitor: Loading data for scene:', sceneId);
    }
    
    try {
      // Fetch the scene data directly from the markdown file via API
      const response = await fetch(`${this.apiEndpoint}/${sceneId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scene: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.scene) {
        throw new Error('Invalid scene data received');
      }
      
      // The frontmatter is all properties except content/html
      this.frontmatterData = { ...data.scene };
      delete this.frontmatterData.content;
      delete this.frontmatterData.html;
      
      if (!quiet) {
        console.log('FrontmatterMonitor: Loaded frontmatter from markdown file:', this.frontmatterData);
      }
      
      // Clear existing bindings
      this.clearBindings();
      
      // Create new bindings based on frontmatter
      this.createBindingsFromFrontmatter();
      
    } catch (error) {
      console.error('Failed to load frontmatter from markdown file:', error);
    }
  }
  
  /**
   * Clear all existing bindings in the folder
   */
  private clearBindings(): void {
    // Remove all children except the Save button
    if (this.folder && this.folder.children) {
      // Find the save button (last child)
      const saveButton = this.folder.children[this.folder.children.length - 1];
      const isSaveButton = saveButton && saveButton.title && 
                          (saveButton.title.includes('Save Changes') || 
                           saveButton.title.includes('Apply Changes'));
      
      // Store save button reference if it exists
      const saveButtonRef = isSaveButton ? saveButton : null;
      
      // Remove all children
      while (this.folder.children.length > 0) {
        this.folder.remove(this.folder.children[0]);
      }
      
      // Re-add the save button if we found it
      if (saveButtonRef) {
        // Add a new save button since we can't reuse the old one
        const newSaveButton = this.folder.addButton({
          title: this.hasUnsavedChanges ? '⚠️ Save Changes (unsaved)' : 'Save Changes'
        }).on('click', () => {
          this.saveChanges();
        });
      } else {
        // If we somehow lost the save button, add a new one
        this.folder.addButton({
          title: this.hasUnsavedChanges ? '⚠️ Save Changes (unsaved)' : 'Save Changes'
        }).on('click', () => {
          this.saveChanges();
        });
      }
    }
    
    // Reset bindings dictionary
    this.frontmatterBindings = {};
  }
  
  /**
   * Create UI bindings based on frontmatter structure
   */
  private createBindingsFromFrontmatter(): void {
    if (!this.folder || !this.frontmatterData) return;
    
    // First ensure we have a save button (in case it was lost)
    this.ensureSaveButtonExists();
    
    // Group keys by importance/category
    const primaryKeys = ['id', 'title', 'name'];
    const navigationKeys = ['next', 'previous'];
    const metadataKeys = ['theme', 'condition', 'summary', 'introduction', 'variables'];
    
    // Get all keys and sort them
    const allKeys = Object.keys(this.frontmatterData).sort();
    
    // Filter out keys we've already handled specifically
    const otherKeys = allKeys.filter(key => 
      !primaryKeys.includes(key) && 
      !navigationKeys.includes(key) && 
      !metadataKeys.includes(key) &&
      key !== 'content' && 
      key !== 'html'
    );
    
    // Create primary fields first (always visible)
    primaryKeys.forEach(key => {
      if (key in this.frontmatterData) {
        this.createBindingForProperty(key, this.frontmatterData[key]);
      }
    });
    
    // Create navigation fields
    const hasNavigation = navigationKeys.some(key => key in this.frontmatterData);
    if (hasNavigation) {
      navigationKeys.forEach(key => {
        if (key in this.frontmatterData) {
          this.createBindingForProperty(key, this.frontmatterData[key]);
        }
      });
    }
    
    // Create metadata fields
    metadataKeys.forEach(key => {
      if (key in this.frontmatterData) {
        this.createBindingForProperty(key, this.frontmatterData[key]);
      }
    });
    
    // Create other fields
    otherKeys.forEach(key => {
      this.createBindingForProperty(key, this.frontmatterData[key]);
    });
    
    // Refresh the UI
    if (this.pane) {
      this.pane.refresh();
    }
  }
  
  /**
   * Ensure the save button exists and is the last child
   */
  private ensureSaveButtonExists(): void {
    if (!this.folder) return;
    
    // Check if the last child is a save button
    let hasSaveButton = false;
    if (this.folder.children && this.folder.children.length > 0) {
      const lastChild = this.folder.children[this.folder.children.length - 1];
      if (lastChild && lastChild.title && 
         (lastChild.title.includes('Save Changes') || lastChild.title.includes('Apply Changes'))) {
        hasSaveButton = true;
      }
    }
    
    // If no save button, add one
    if (!hasSaveButton) {
      this.folder.addButton({
        title: this.hasUnsavedChanges ? '⚠️ Save Changes (unsaved)' : 'Save Changes'
      }).on('click', () => {
        this.saveChanges();
      });
    }
  }
  
  /**
   * Trigger auto-save with debouncing
   */
  private triggerAutoSave(): void {
    // Track that we have unsaved changes
    if (!this.hasUnsavedChanges) {
      this.hasUnsavedChanges = true;
      // Update the save button to indicate there are changes
      this.updateSaveButtonState();
    }
    
    // If auto-save is disabled, do nothing more
    if (!this.autoSave) return;
    
    // Clear any existing timeout
    if (this.autoSaveTimeout !== null) {
      window.clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    
    // Set a new timeout
    this.autoSaveTimeout = window.setTimeout(() => {
      this.saveChanges(true);
    }, this.autoSaveDelay);
  }
  
  /**
   * Update the save button state based on whether there are unsaved changes
   */
  private updateSaveButtonState(): void {
    if (this.folder && this.folder.children && this.folder.children.length > 0) {
      // The save button should be the first child
      const saveButton = this.folder.children[this.folder.children.length - 1];
      if (saveButton && saveButton.title !== undefined) {
        if (this.hasUnsavedChanges) {
          saveButton.title = '⚠️ Save Changes (unsaved)';
        } else {
          saveButton.title = 'Save Changes';
        }
      }
    }
  }
  
  /**
   * Create appropriate binding based on property type
   */
  private createBindingForProperty(key: string, value: any): void {
    // Skip if null or undefined
    if (value === null || value === undefined) return;
    
    const valueType = typeof value;
    
    // Special handling for known 3D/graphics fields
    if (key === 'cameraConfig' || key === 'lightConfig' || key === 'sceneConfig') {
      this.createSpecializedConfigFolder(key, value);
      return;
    }
    
    // Handle color fields
    if ((valueType === 'string' && /^#[0-9A-F]{6}$/i.test(value)) || 
        (key.toLowerCase().includes('color') && valueType === 'string')) {
      // Create a color picker for hex color values
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, {
        label: key,
        view: 'color'
      }).on('change', () => {
        this.triggerAutoSave();
      });
      return;
    }
    
    // Special handling for known fields
    if (key === 'theme') {
      // Create a dropdown for theme selection
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, {
        label: key,
        options: {
          'Default': 'default',
          'Dark': 'dark',
          'Light': 'light',
          'Global': 'global',
          'Custom': 'custom'
        }
      }).on('change', () => {
        this.triggerAutoSave();
      });
      return;
    }
    
    // Handle ID field specially (read-only if current scene)
    if (key === 'id') {
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, {
        label: key,
        readonly: true
      });
      return;
    }
    
    // Handle title and name fields (important, so give more space)
    if (key === 'title' || key === 'name') {
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, {
        label: key,
        multiline: false
      }).on('change', () => {
        this.triggerAutoSave();
      });
      return;
    }
    
    // Handle summary and introduction (always multiline)
    if (key === 'summary' || key === 'introduction') {
      // Always use multiline for these important content fields
      // Following Tweakpane docs: multiline: true with rows parameter
      
      let config: Record<string, any> = {
        label: key,
        multiline: true
      };
      
      // Introduction should always be large, regardless of content length
      if (key === 'introduction') {
        config = {
          ...config,
          rows: this.textFieldConfig.introductionRows,
          w: 1  // Force full width
        };
      } else if (key === 'summary') {
        // Slightly smaller for summary, but still generous
        const wordCount = typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0;
        const charCount = typeof value === 'string' ? value.length : 0;
        
        // Calculate rows based on content and configured values
        const baseRows = this.textFieldConfig.summaryRows;
        const mediumThreshold = this.textFieldConfig.longTextThreshold.words * 3; // 3x the basic threshold
        const largeThreshold = this.textFieldConfig.longTextThreshold.chars * 4; // 4x the basic char threshold
        
        config = {
          ...config,
          rows: Math.max(
            baseRows, 
            charCount > largeThreshold ? this.textFieldConfig.longTextRows.large : 
              (wordCount > mediumThreshold ? this.textFieldConfig.longTextRows.medium : baseRows)
          )
        };
      }
      
      // Create a more generous text area for these important fields
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, config)
        .on('change', () => {
          this.triggerAutoSave();
        });
      return;
    }
    
    // Let the enhanced handlers take care of common data types
    
    // Handle strings
    if (valueType === 'string') {
      // Count words and characters for better detection of long text
      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
      const charCount = value.length;
      
      // More sensitive detection of long content using configured thresholds
      const isLongString = wordCount > this.textFieldConfig.longTextThreshold.words || 
                            charCount > this.textFieldConfig.longTextThreshold.chars || 
                            value.includes('\n');
      
      // Create configuration with multiline set properly
      const config: Record<string, any> = {
        label: key,
        multiline: isLongString
      };
      
      // Add rows only when multiline is true
      if (isLongString) {
        const largeThreshold = this.textFieldConfig.longTextThreshold.words * 6;
        const mediumThreshold = this.textFieldConfig.longTextThreshold.words * 2;
        
        Object.assign(config, {
          rows: wordCount > largeThreshold ? this.textFieldConfig.longTextRows.large : 
                (wordCount > mediumThreshold ? this.textFieldConfig.longTextRows.medium : 
                  this.textFieldConfig.longTextRows.min),
          w: charCount > this.textFieldConfig.longTextThreshold.chars * 3 ? 1 : undefined
        });
      }
      
      // Create the text field
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, config)
        .on('change', () => {
          this.triggerAutoSave();
        });
    }
    
    // Handle numbers
    else if (valueType === 'number') {
      // Determine the appropriate number input type based on the value
      const isInteger = Number.isInteger(value);
      const isPercent = value >= 0 && value <= 1;
      const isSmall = Math.abs(value) < 10;
      
      // Settings for different number types
      let settings: Record<string, any> = {
        label: key
      };
      
      if (isPercent) {
        // Create a slider for percentages (0-1)
        settings = {
          ...settings,
          min: 0,
          max: 1,
          step: 0.01,
          format: (v: number) => `${(v * 100).toFixed(0)}%`
        };
      } else if (isInteger) {
        // Integer input
        settings = {
          ...settings,
          step: 1
        };
        
        // Add reasonable min/max for common integer types
        if (key.includes('index') || key.includes('order') || key.includes('position')) {
          settings.min = 0;
        }
      } else {
        // Floating point number
        settings = {
          ...settings,
          step: isSmall ? 0.1 : 1
        };
      }
      
      // Create the number input
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, settings)
        .on('change', () => {
          this.triggerAutoSave();
        });
    }
    
    // Handle booleans
    else if (valueType === 'boolean') {
      // Create a checkbox for boolean values
      this.frontmatterBindings[key] = this.folder.addBinding(this.frontmatterData, key, {
        label: key
      }).on('change', () => {
        this.triggerAutoSave();
      });
    }
    
    // Handle arrays
    else if (valueType === 'object' && Array.isArray(value)) {
      // Create a folder for the array
      const arrayFolder = this.folder.addFolder({
        title: key,
        expanded: false
      });
      
      // For arrays of objects with id fields (like choices, navigation links)
      if (value.length > 0 && typeof value[0] === 'object' && (value[0].id || value[0].text)) {
        // Add hint based on array content
        let hintText = 'Array of objects';
        if (value[0].id && value[0].text) {
          hintText = 'Format: [{"id": "item1", "text": "Item 1"}, ...]';
        } else if (value[0].id && value[0].label) {
          hintText = 'Format: [{"id": "item1", "label": "Item 1"}, ...]';
        }
        
        arrayFolder.addBinding({ info: hintText }, 'info', { readonly: true });
        
        // Create an accordion for each item in the array
        for (let i = 0; i < value.length; i++) {
          const itemFolder = arrayFolder.addFolder({
            title: `Item ${i + 1}${value[i].id ? ` (${value[i].id})` : ''}`,
            expanded: false
          });
          
          // For each property in the object, create a field
          Object.keys(value[i]).forEach(propKey => {
            const propValue = value[i][propKey];
            const propType = typeof propValue;
            
            if (propType === 'string') {
              // Create a string field
              const isLongString = propValue.length > 50 || propValue.includes('\n');
              const tempObj = { value: propValue };
              
              itemFolder.addBinding(tempObj, 'value', {
                label: propKey,
                multiline: isLongString,
                rows: isLongString ? 3 : 1
              }).on('change', (ev: { value: string }) => {
                this.frontmatterData[key][i][propKey] = ev.value;
                this.triggerAutoSave();
              });
            } else if (propType === 'number') {
              // Create a number field
              const tempObj = { value: propValue };
              
              itemFolder.addBinding(tempObj, 'value', {
                label: propKey
              }).on('change', (ev: { value: number }) => {
                this.frontmatterData[key][i][propKey] = ev.value;
                this.triggerAutoSave();
              });
            } else if (propType === 'boolean') {
              // Create a checkbox
              const tempObj = { value: propValue };
              
              itemFolder.addBinding(tempObj, 'value', {
                label: propKey
              }).on('change', (ev: { value: boolean }) => {
                this.frontmatterData[key][i][propKey] = ev.value;
                this.triggerAutoSave();
              });
            }
          });
          
          // Add a button to remove this item
          itemFolder.addButton({
            title: 'Remove Item'
          }).on('click', () => {
            this.frontmatterData[key].splice(i, 1);
            this.clearBindings();
            this.createBindingsFromFrontmatter();
            this.triggerAutoSave();
          });
        }
        
        // Add a button to add a new item
        arrayFolder.addButton({
          title: 'Add Item'
        }).on('click', () => {
          // Create a template based on the first item
          const template = value.length > 0 
            ? JSON.parse(JSON.stringify(value[0])) 
            : { id: '', text: '' };
          
          // Reset all values
          Object.keys(template).forEach(k => {
            if (typeof template[k] === 'string') template[k] = '';
            else if (typeof template[k] === 'number') template[k] = 0;
            else if (typeof template[k] === 'boolean') template[k] = false;
          });
          
          // Add the new item
          this.frontmatterData[key].push(template);
          this.clearBindings();
          this.createBindingsFromFrontmatter();
          this.triggerAutoSave();
        });
      } else {
        // Simple array of primitives
        // Add a text field for JSON editing
        const jsonValue = JSON.stringify(value, null, 2);
        const tempObj = { value: jsonValue };
        
        arrayFolder.addBinding(tempObj, 'value', {
          label: 'Edit as JSON',
          multiline: true,
          rows: Math.min(value.length + 2, 8)
        }).on('change', (ev: { value: string }) => {
          try {
            // Parse the JSON string back to an array
            this.frontmatterData[key] = JSON.parse(ev.value);
            if (this.pane) {
              this.pane.refresh();
            }
            this.triggerAutoSave();
          } catch (e) {
            console.error(`Invalid JSON for ${key}:`, e);
          }
        });
        
        // If it's an array of primitives, create individual fields
        if (value.length > 0 && ['string', 'number', 'boolean'].includes(typeof value[0])) {
          const elementsFolder = arrayFolder.addFolder({
            title: 'Items',
            expanded: true
          });
          
          // Create a field for each item
          for (let i = 0; i < value.length; i++) {
            const itemValue = value[i];
            const itemType = typeof itemValue;
            const tempItemObj = { value: itemValue };
            
            elementsFolder.addBinding(tempItemObj, 'value', {
              label: `[${i}]`,
              multiline: itemType === 'string' && (itemValue.length > 50 || itemValue.includes('\n')),
              rows: itemType === 'string' && (itemValue.length > 50 || itemValue.includes('\n')) ? 3 : 1
            }).on('change', (ev: { value: any }) => {
              this.frontmatterData[key][i] = ev.value;
              this.triggerAutoSave();
            });
          }
          
          // Add button to add a new item
          elementsFolder.addButton({
            title: 'Add Item'
          }).on('click', () => {
            // Add a new item based on the type of the first item
            const firstItemType = typeof value[0];
            let newItem;
            
            if (firstItemType === 'string') newItem = '';
            else if (firstItemType === 'number') newItem = 0;
            else if (firstItemType === 'boolean') newItem = false;
            else newItem = null;
            
            this.frontmatterData[key].push(newItem);
            this.clearBindings();
            this.createBindingsFromFrontmatter();
            this.triggerAutoSave();
          });
        }
      }
      
      // Store reference to the folder
      this.frontmatterBindings[key] = arrayFolder;
    }
    
    // Handle objects
    else if (valueType === 'object') {
      // Create a folder for the object
      const objectFolder = this.folder.addFolder({
        title: key,
        expanded: false
      });
      
      // Add a text field for JSON editing
      const jsonValue = JSON.stringify(value, null, 2);
      const tempObj = { jsonValue };
      
      objectFolder.addBinding(tempObj, 'jsonValue', {
        label: 'Edit as JSON',
        multiline: true,
        rows: Math.min(Object.keys(value).length + 2, 10)
      }).on('change', (ev: { value: string }) => {
        try {
          // Parse the JSON string back to an object
          this.frontmatterData[key] = JSON.parse(ev.value);
          if (this.pane) {
            this.pane.refresh();
          }
          this.triggerAutoSave();
        } catch (e) {
          console.error(`Invalid JSON for ${key}:`, e);
        }
      });
      
      // Create property fields for direct editing
      const propsFolder = objectFolder.addFolder({
        title: 'Properties',
        expanded: true
      });
      
      // Create a field for each property
      Object.keys(value).forEach(propKey => {
        const propValue = value[propKey];
        const propType = typeof propValue;
        
        if (propType === 'string') {
          // Create a string field
          const isLongString = propValue.length > 50 || propValue.includes('\n');
          const tempPropObj = { value: propValue };
          
          propsFolder.addBinding(tempPropObj, 'value', {
            label: propKey,
            multiline: isLongString,
            rows: isLongString ? 3 : 1
          }).on('change', (ev: { value: string }) => {
            this.frontmatterData[key][propKey] = ev.value;
            // Update the JSON field
            tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
            this.triggerAutoSave();
          });
        } else if (propType === 'number') {
          // Create a number field
          const tempPropObj = { value: propValue };
          
          propsFolder.addBinding(tempPropObj, 'value', {
            label: propKey
          }).on('change', (ev: { value: number }) => {
            this.frontmatterData[key][propKey] = ev.value;
            // Update the JSON field
            tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
            this.triggerAutoSave();
          });
        } else if (propType === 'boolean') {
          // Create a checkbox
          const tempPropObj = { value: propValue };
          
          propsFolder.addBinding(tempPropObj, 'value', {
            label: propKey
          }).on('change', (ev: { value: boolean }) => {
            this.frontmatterData[key][propKey] = ev.value;
            // Update the JSON field
            tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
            this.triggerAutoSave();
          });
        } else if (propType === 'object') {
          // Create a read-only field with a description
          propsFolder.addBinding({
            info: Array.isArray(propValue) 
              ? `Array with ${propValue.length} items` 
              : `Object with ${Object.keys(propValue).length} properties`
          }, 'info', {
            readonly: true,
            label: propKey
          });
        }
      });
      
      // Add and remove property buttons
      const addPropFolder = objectFolder.addFolder({
        title: 'Add/Remove Properties',
        expanded: false
      });
      
      // Add property form
      interface PropData {
        key: string;
        type: string;
        value: string;
      }

      const newPropData: PropData = { key: '', type: 'string', value: '' };
      
      addPropFolder.addBinding(newPropData, 'key', {
        label: 'Property Name'
      });
      
      addPropFolder.addBinding(newPropData, 'type', {
        label: 'Type',
        options: {
          'String': 'string',
          'Number': 'number',
          'Boolean': 'boolean',
          'Object': 'object',
          'Array': 'array'
        }
      });
      
      addPropFolder.addBinding(newPropData, 'value', {
        label: 'Value',
        multiline: true
      });
      
      // Add property button
      addPropFolder.addButton({
        title: 'Add Property'
      }).on('click', () => {
        if (!newPropData.key) {
          this.showNotification('Property name is required', 'error');
          return;
        }
        
        try {
          let parsedValue: any = newPropData.value;
          
          // Parse the value based on the selected type
          if (newPropData.type === 'string') {
            parsedValue = String(newPropData.value);
          } else if (newPropData.type === 'number') {
            parsedValue = Number(newPropData.value);
            if (isNaN(parsedValue)) {
              throw new Error('Invalid number');
            }
          } else if (newPropData.type === 'boolean') {
            const lowerValue = String(newPropData.value).toLowerCase();
            if (['true', 'yes', '1'].includes(lowerValue)) {
              parsedValue = true;
            } else if (['false', 'no', '0'].includes(lowerValue)) {
              parsedValue = false;
            } else {
              throw new Error('Invalid boolean value');
            }
          } else if (newPropData.type === 'object' || newPropData.type === 'array') {
            parsedValue = JSON.parse(newPropData.value);
          }
          
          // Add the property
          this.frontmatterData[key][newPropData.key] = parsedValue;
          
          // Reset form
          newPropData.key = '';
          newPropData.value = '';
          
          // Refresh
          this.clearBindings();
          this.createBindingsFromFrontmatter();
          this.triggerAutoSave();
        } catch (e: any) {
          this.showNotification(`Invalid value: ${e.message || 'Unknown error'}`, 'error');
        }
      });
      
      // Remove property form
      const removePropData = { key: '' };
      
      // Create a dropdown with all property keys
      const propertyOptions: Record<string, string> = {};
      Object.keys(value).forEach(k => {
        propertyOptions[k] = k;
      });
      
      addPropFolder.addBinding(removePropData, 'key', {
        label: 'Property to Remove',
        options: propertyOptions
      });
      
      // Remove property button
      addPropFolder.addButton({
        title: 'Remove Property'
      }).on('click', () => {
        if (!removePropData.key) {
          this.showNotification('Please select a property to remove', 'error');
          return;
        }
        
        // Delete the property
        delete this.frontmatterData[key][removePropData.key];
        
        // Refresh
        this.clearBindings();
        this.createBindingsFromFrontmatter();
        this.triggerAutoSave();
      });
      
      // Store reference to the folder
      this.frontmatterBindings[key] = objectFolder;
    }
  }
  
  /**
   * Create a specialized folder for 3D configuration objects
   */
  private createSpecializedConfigFolder(key: string, value: any): void {
    // Create a folder for the configuration
    const configFolder = this.folder.addFolder({
      title: key,
      expanded: false
    });
    
    // Add a text field for JSON editing
    const jsonValue = JSON.stringify(value, null, 2);
    const tempObj = { jsonValue };
    
    configFolder.addBinding(tempObj, 'jsonValue', {
      label: 'Edit as JSON',
      multiline: true,
      rows: Math.min(Object.keys(value).length + 2, 10)
    }).on('change', (ev: { value: string }) => {
      try {
        // Parse the JSON string back to an object
        this.frontmatterData[key] = JSON.parse(ev.value);
        if (this.pane) {
          this.pane.refresh();
        }
        this.triggerAutoSave();
      } catch (e) {
        console.error(`Invalid JSON for ${key}:`, e);
      }
    });
    
    // Create property fields for direct editing with specialized controls
    const propsFolder = configFolder.addFolder({
      title: 'Properties',
      expanded: true
    });
    
    // Create appropriate fields for each property based on type and name
    Object.keys(value).forEach(propKey => {
      const propValue = value[propKey];
      const propType = typeof propValue;
      
      // Handle nested position objects (common in 3D configs)
      if (propKey === 'position' && propType === 'object' && !Array.isArray(propValue)) {
        const posFolder = propsFolder.addFolder({
          title: 'position',
          expanded: true
        });
        
        // Create a slider for each coordinate
        ['x', 'y', 'z'].forEach(coord => {
          if (coord in propValue) {
            const coordValue = propValue[coord];
            const tempCoordObj = { value: coordValue };
            
            posFolder.addBinding(tempCoordObj, 'value', {
              label: coord,
              min: -20,
              max: 20,
              step: 0.1
            }).on('change', (ev: { value: number }) => {
              this.frontmatterData[key][propKey][coord] = ev.value;
              // Update the JSON field
              tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
              this.triggerAutoSave();
            });
          }
        });
      }
      // Handle lookAt objects (for camera)
      else if (propKey === 'lookAt' && propType === 'object' && !Array.isArray(propValue)) {
        const lookAtFolder = propsFolder.addFolder({
          title: 'lookAt',
          expanded: true
        });
        
        // Create a slider for each coordinate
        ['x', 'y', 'z'].forEach(coord => {
          if (coord in propValue) {
            const coordValue = propValue[coord];
            const tempCoordObj = { value: coordValue };
            
            lookAtFolder.addBinding(tempCoordObj, 'value', {
              label: coord,
              min: -20,
              max: 20,
              step: 0.1
            }).on('change', (ev: { value: number }) => {
              this.frontmatterData[key][propKey][coord] = ev.value;
              // Update the JSON field
              tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
              this.triggerAutoSave();
            });
          }
        });
      }
      // Handle color properties
      else if (propKey === 'color' || propKey.toLowerCase().includes('color')) {
        if (propType === 'string' && propValue.startsWith('#')) {
          const tempColorObj = { value: propValue };
          
          propsFolder.addBinding(tempColorObj, 'value', {
            label: propKey,
            view: 'color'
          }).on('change', (ev: { value: string }) => {
            this.frontmatterData[key][propKey] = ev.value;
            // Update the JSON field
            tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
            this.triggerAutoSave();
          });
        }
      }
      // Handle intensity properties (common in lights)
      else if (propKey === 'intensity' && propType === 'number') {
        const tempIntensityObj = { value: propValue };
        
        propsFolder.addBinding(tempIntensityObj, 'value', {
          label: propKey,
          min: 0,
          max: 5,
          step: 0.1
        }).on('change', (ev: { value: number }) => {
          this.frontmatterData[key][propKey] = ev.value;
          // Update the JSON field
          tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
          this.triggerAutoSave();
        });
      }
      // Handle ambient/directional objects (for lights)
      else if ((propKey === 'ambient' || propKey === 'directional') && propType === 'object') {
        const lightFolder = propsFolder.addFolder({
          title: propKey,
          expanded: true
        });
        
        Object.keys(propValue).forEach(lightProp => {
          const lightPropValue = propValue[lightProp];
          const lightPropType = typeof lightPropValue;
          
          if (lightProp === 'color' && lightPropType === 'string') {
            const tempLightColorObj = { value: lightPropValue };
            
            lightFolder.addBinding(tempLightColorObj, 'value', {
              label: lightProp,
              view: 'color'
            }).on('change', (ev: { value: string }) => {
              this.frontmatterData[key][propKey][lightProp] = ev.value;
              // Update the JSON field
              tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
              this.triggerAutoSave();
            });
          }
          else if (lightProp === 'intensity' && lightPropType === 'number') {
            const tempLightIntensityObj = { value: lightPropValue };
            
            lightFolder.addBinding(tempLightIntensityObj, 'value', {
              label: lightProp,
              min: 0,
              max: 5,
              step: 0.1
            }).on('change', (ev: { value: number }) => {
              this.frontmatterData[key][propKey][lightProp] = ev.value;
              // Update the JSON field
              tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
              this.triggerAutoSave();
            });
          }
          else if (lightProp === 'position' && lightPropType === 'object') {
            const lightPosFolder = lightFolder.addFolder({
              title: 'position',
              expanded: true
            });
            
            // Create a slider for each coordinate
            ['x', 'y', 'z'].forEach(coord => {
              if (coord in lightPropValue) {
                const coordValue = lightPropValue[coord];
                const tempCoordObj = { value: coordValue };
                
                lightPosFolder.addBinding(tempCoordObj, 'value', {
                  label: coord,
                  min: -20,
                  max: 20,
                  step: 0.1
                }).on('change', (ev: { value: number }) => {
                  this.frontmatterData[key][propKey][lightProp][coord] = ev.value;
                  // Update the JSON field
                  tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
                  this.triggerAutoSave();
                });
              }
            });
          }
        });
      }
      // Handle type/preset selection for scene configuration
      else if (propKey === 'type' && propType === 'string' && key === 'sceneConfig') {
        this.createSceneTypeControl(propsFolder, key, propKey, propValue, tempObj);
      }
      // Handle standard string properties
      else if (propType === 'string') {
        const tempStrObj = { value: propValue };
        
        propsFolder.addBinding(tempStrObj, 'value', {
          label: propKey
        }).on('change', (ev: { value: string }) => {
          this.frontmatterData[key][propKey] = ev.value;
          // Update the JSON field
          tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
          this.triggerAutoSave();
        });
      }
      // Handle standard number properties
      else if (propType === 'number') {
        const tempNumObj = { value: propValue };
        
        propsFolder.addBinding(tempNumObj, 'value', {
          label: propKey,
          step: 0.1
        }).on('change', (ev: { value: number }) => {
          this.frontmatterData[key][propKey] = ev.value;
          // Update the JSON field
          tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
          this.triggerAutoSave();
        });
      }
      // Handle standard boolean properties
      else if (propType === 'boolean') {
        const tempBoolObj = { value: propValue };
        
        propsFolder.addBinding(tempBoolObj, 'value', {
          label: propKey
        }).on('change', (ev: { value: boolean }) => {
          this.frontmatterData[key][propKey] = ev.value;
          // Update the JSON field
          tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
          this.triggerAutoSave();
        });
      }
      // For other complex nested objects, just show as JSON
      else if (propType === 'object') {
        propsFolder.addBinding({
          info: Array.isArray(propValue) 
            ? `Array with ${propValue.length} items` 
            : `Object with ${Object.keys(propValue).length} properties`
        }, 'info', {
          readonly: true,
          label: propKey
        });
      }
    });
    
    // Add and remove property buttons
    const addPropFolder = configFolder.addFolder({
      title: 'Add/Remove Properties',
      expanded: false
    });
    
    // Add property form
    interface PropData {
      key: string;
      type: string;
      value: string;
    }

    const newPropData: PropData = { key: '', type: 'string', value: '' };
    
    addPropFolder.addBinding(newPropData, 'key', {
      label: 'Property Name'
    });
    
    addPropFolder.addBinding(newPropData, 'type', {
      label: 'Type',
      options: {
        'String': 'string',
        'Number': 'number',
        'Boolean': 'boolean',
        'Color': 'color',
        'Object': 'object',
        'Array': 'array'
      }
    });
    
    addPropFolder.addBinding(newPropData, 'value', {
      label: 'Value',
      multiline: true
    });
    
    // Add property button
    addPropFolder.addButton({
      title: 'Add Property'
    }).on('click', () => {
      if (!newPropData.key) {
        this.showNotification('Property name is required', 'error');
        return;
      }
      
      try {
        let parsedValue: any = newPropData.value;
        
        // Parse the value based on the selected type
        if (newPropData.type === 'string') {
          parsedValue = String(newPropData.value);
        } else if (newPropData.type === 'number') {
          parsedValue = Number(newPropData.value);
          if (isNaN(parsedValue)) {
            throw new Error('Invalid number');
          }
        } else if (newPropData.type === 'boolean') {
          const lowerValue = String(newPropData.value).toLowerCase();
          if (['true', 'yes', '1'].includes(lowerValue)) {
            parsedValue = true;
          } else if (['false', 'no', '0'].includes(lowerValue)) {
            parsedValue = false;
          } else {
            throw new Error('Invalid boolean value');
          }
        } else if (newPropData.type === 'color') {
          // Ensure it's a valid color format
          if (!newPropData.value.startsWith('#')) {
            parsedValue = '#' + newPropData.value;
          } else {
            parsedValue = newPropData.value;
          }
          // Validate hex color
          if (!/^#[0-9A-F]{6}$/i.test(parsedValue)) {
            throw new Error('Invalid color format. Use #RRGGBB');
          }
        } else if (newPropData.type === 'object' || newPropData.type === 'array') {
          parsedValue = JSON.parse(newPropData.value);
        }
        
        // Add the property
        this.frontmatterData[key][newPropData.key] = parsedValue;
        
        // Reset form
        newPropData.key = '';
        newPropData.value = '';
        
        // Refresh
        this.clearBindings();
        this.createBindingsFromFrontmatter();
        this.triggerAutoSave();
      } catch (e: any) {
        this.showNotification(`Invalid value: ${e.message || 'Unknown error'}`, 'error');
      }
    });
    
    // Remove property form
    const removePropData = { key: '' };
    
    // Create a dropdown with all property keys
    const propertyOptions: Record<string, string> = {};
    Object.keys(value).forEach(k => {
      propertyOptions[k] = k;
    });
    
    addPropFolder.addBinding(removePropData, 'key', {
      label: 'Property to Remove',
      options: propertyOptions
    });
    
    // Remove property button
    addPropFolder.addButton({
      title: 'Remove Property'
    }).on('click', () => {
      if (!removePropData.key) {
        this.showNotification('Please select a property to remove', 'error');
        return;
      }
      
      // Delete the property
      delete this.frontmatterData[key][removePropData.key];
      
      // Refresh
      this.clearBindings();
      this.createBindingsFromFrontmatter();
      this.triggerAutoSave();
    });
    
    // Store reference to the folder
    this.frontmatterBindings[key] = configFolder;
  }
  
  /**
   * Handle type/preset selection for scene configuration
   */
  private createSceneTypeControl(propsFolder: any, key: string, propKey: string, propValue: string, tempObj: any): void {
    const tempTypeObj = { value: propValue };
    
    // Create options object from registered scene types
    const sceneTypeOptions: Record<string, string> = {};
    
    // If we have discovered scene types, use them
    if (Object.keys(this.discoveredSceneTypes).length > 0) {
      Object.assign(sceneTypeOptions, this.discoveredSceneTypes);
    } else {
      // Otherwise, include the current value and a custom option
      const displayName = propValue.charAt(0).toUpperCase() + propValue.slice(1);
      sceneTypeOptions[displayName] = propValue;
      sceneTypeOptions['Custom'] = 'custom';
    }
    
    propsFolder.addBinding(tempTypeObj, 'value', {
      label: propKey,
      options: sceneTypeOptions
    }).on('change', (ev: { value: string }) => {
      this.frontmatterData[key][propKey] = ev.value;
      // Update the JSON field
      tempObj.jsonValue = JSON.stringify(this.frontmatterData[key], null, 2);
      this.triggerAutoSave();
    });
  }
  
  /**
   * Save changes to the markdown file
   */
  private async saveChanges(isAutoSave: boolean = false): Promise<void> {
    if (!this.currentScene) {
      console.error('No current scene to save');
      return;
    }
    
    // If nothing has changed, no need to save
    if (!this.hasUnsavedChanges && !isAutoSave) {
      this.showNotification('No changes to save', 'info');
      return;
    }
    
    // Prevent multiple simultaneous saves
    if (this.isSaving) {
      console.log('Already saving, skipping this save request');
      return;
    }
    
    this.isSaving = true;
    
    try {
      const sceneId = this.currentScene.id;
      if (!sceneId) {
        console.error('Scene ID is required');
        this.isSaving = false;
        return;
      }
      
      // Prepare the payload with ONLY frontmatter changes
      // Do NOT modify or include content/html in the changes
      const payload = {
        sceneId,
        frontmatter: this.frontmatterData
      };
      
      console.log('FrontmatterMonitor: Saving frontmatter to markdown file:', payload);
      
      // Send to server
      const response = await fetch(`${this.apiEndpoint}/save-frontmatter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('FrontmatterMonitor: Save successful:', result);
      
      // Only show notification for manual saves (not auto-saves)
      if (!isAutoSave) {
        this.showNotification('Frontmatter saved to markdown file', 'success');
      }
      
      // Reset the unsaved changes flag
      this.hasUnsavedChanges = false;
      
      // Update save button state
      this.updateSaveButtonState();
      
      // Update the UI (quietly for auto-saves)
      this.update(this.currentScene, isAutoSave);
      
    } catch (error: any) {
      this.showNotification(`Error: ${error.message || 'Failed to save'}`, 'error');
      console.error('Failed to save frontmatter to markdown file:', error);
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Show a notification message
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create a status message in the UI
    const existingElement = document.getElementById('frontmatter-notification');
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