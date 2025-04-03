import { Logger } from '@lib/core/Logger';
import { TemplateContext } from '@/types/interfaces';

/**
 * Class for handling path resolution and context operations
 */
export class ContextResolver {
  private logger: Logger;
  private currentItemContext: any = null; // Track current item context for better nested access

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Reset the current item context
   */
  reset(): void {
    this.currentItemContext = null;
  }

  /**
   * Set the current item context for nested processing
   */
  setCurrentItemContext(context: any): void {
    this.currentItemContext = context;
  }

  /**
   * Get the current item context
   */
  getCurrentItemContext(): any {
    return this.currentItemContext;
  }

  /**
   * Resolve a path in the provided context
   */
  resolvePath(context: TemplateContext, path: string): any {
    if (!path) return context;
    if (!context) return undefined;
    
    // Special case for 'this'
    if (path === 'this') {
      return context.this;
    }
    
    // Look in the current item context first (for nested contexts)
    if (this.currentItemContext && typeof this.currentItemContext === 'object') {
      if (path in this.currentItemContext) {
        return this.currentItemContext[path];
      }
    }
    
    // Handle direct property access
    if (path in context) {
      return context[path];
    }
    
    // Try context.this as fallback
    if (context.this && typeof context.this === 'object' && path in context.this) {
      return context.this[path];
    }
    
    // Handle dot notation paths
    const parts = path.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      if (!(part in current)) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }

  /**
   * Get an array from the context by path
   */
  getArray(context: TemplateContext, arrayPath: string): any[] {
    // CRITICAL: For nested arrays, look in the current item context first
    if (this.currentItemContext && typeof this.currentItemContext === 'object') {
      if (arrayPath in this.currentItemContext) {
        const value = this.currentItemContext[arrayPath];
        if (Array.isArray(value)) {
          this.logger.logLevel('data', `Found ${arrayPath} in current item context`);
          return value;
        }
      }
    }
    
    // Then check direct property access
    if (arrayPath in context) {
      const value = context[arrayPath];
      if (Array.isArray(value)) {
        this.logger.logLevel('data', `Found ${arrayPath} directly in context`);
        return value;
      }
    }
    
    // Then try context.this
    if (context.this && typeof context.this === 'object') {
      if (arrayPath in context.this) {
        const value = context.this[arrayPath];
        if (Array.isArray(value)) {
          this.logger.logLevel('data', `Found ${arrayPath} in context.this`);
          return value;
        }
      }
    }
    
    // Try dot notation paths
    if (arrayPath.includes('.')) {
      const parts = arrayPath.split('.');
      let current: any = context;
      
      for (const part of parts) {
        if (!current || typeof current !== 'object') break;
        if (!(part in current)) break;
        current = current[part];
      }
      
      if (Array.isArray(current)) {
        this.logger.logLevel('data', `Found ${arrayPath} using dot notation`);
        return current;
      }
    }
    
    // Log the failure and return empty array
    this.logger.logLevel('data', `Could not find array: ${arrayPath}`);
    return [];
  }

  /**
   * Create a context for an item in an each block
   */
  createItemContext(item: any, arrayPath: string, parentContext: TemplateContext): TemplateContext {
    // For primitive values (strings, numbers, etc.)
    if (typeof item !== 'object' || item === null) {
      this.logger.logLevel('data', `Creating context for primitive value: ${item}`);
      return { this: item };
    }
    
    // For object values, create a full context
    const itemContext: TemplateContext = {};
    
    // Add the item as 'this'
    itemContext.this = item;
    
    // If item is an object, unwrap any single-item arrays and add properties
    for (const key of Object.keys(item)) {
      if (Array.isArray(item[key])) {
        // Keep arrays intact - don't unwrap
        itemContext[key] = item[key];
      } else {
        // Non-array properties
        itemContext[key] = item[key];
      }
    }
    
    // Include parent context properties for reference
    for (const key of Object.keys(parentContext)) {
      // Don't overwrite item properties with parent properties
      if (!(key in itemContext) && key !== arrayPath) {
        itemContext[key] = parentContext[key];
      }
    }
    
    return itemContext;
  }
} 