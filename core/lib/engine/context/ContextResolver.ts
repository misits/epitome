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
    
    // If it's a dot notation path, we need to traverse the object
    if (path.includes('.')) {
      const parts = path.split('.');
      const firstPart = parts[0];
      
      // Try to find the root object in different contexts
      let rootObject = null;
      
      // First check in currentItemContext
      if (this.currentItemContext && typeof this.currentItemContext === 'object' && firstPart in this.currentItemContext) {
        rootObject = this.currentItemContext[firstPart];
      }
      // Then check in direct context
      else if (firstPart in context) {
        rootObject = context[firstPart];
      }
      // Then check in context.this
      else if (context.this && typeof context.this === 'object' && firstPart in context.this) {
        rootObject = context.this[firstPart];
      }
      
      // If we found the root object, traverse the path
      if (rootObject !== null && rootObject !== undefined) {
        // Follow the path through the nested structure
        let current = rootObject;
        
        // Start from the second part since we already have the first part
        for (let i = 1; i < parts.length; i++) {
          if (current === null || current === undefined) {
            this.logger.logLevel('data', `Path traversal failed at ${parts.slice(0, i).join('.')}`);
            return undefined;
          }
          
          if (typeof current !== 'object') {
            this.logger.logLevel('data', `Cannot traverse ${parts[i]} in ${parts.slice(0, i).join('.')} because it's not an object`);
            return undefined;
          }
          
          if (!(parts[i] in current)) {
            this.logger.logLevel('data', `Property ${parts[i]} not found in ${parts.slice(0, i).join('.')}`);
            return undefined;
          }
          
          current = current[parts[i]];
        }
        
        return current;
      }
      
      // We couldn't find the root object, log it and return undefined
      this.logger.logLevel('data', `Root object ${firstPart} not found for path ${path}`);
      return undefined;
    }
    
    // Non-dot notation path - direct lookups
    
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
    
    this.logger.logLevel('data', `Could not resolve path: ${path}`);
    return undefined;
  }

  /**
   * Get an array from the context by path
   */
  getArray(context: TemplateContext, arrayPath: string): any[] {
    // If it's a dot notation path, first resolve to the potential array
    if (arrayPath.includes('.')) {
      const resolvedValue = this.resolvePath(context, arrayPath);
      
      if (Array.isArray(resolvedValue)) {
        this.logger.logLevel('data', `Found array at path ${arrayPath}`);
        return resolvedValue;
      }
      
      // If it's not an array but an object, handle edge cases
      if (resolvedValue !== null && typeof resolvedValue === 'object' && !Array.isArray(resolvedValue)) {
        // Check if it's an object containing an array with the same name as the last part of the path
        const parts = arrayPath.split('.');
        const lastPart = parts[parts.length - 1];
        
        if (lastPart in resolvedValue && Array.isArray(resolvedValue[lastPart])) {
          this.logger.logLevel('data', `Found nested array at ${arrayPath}.${lastPart}`);
          return resolvedValue[lastPart];
        }
        
        // Convert object to array with one item if it's not found otherwise
        this.logger.logLevel('data', `Converting object at ${arrayPath} to singleton array`);
        return [resolvedValue];
      }
    }
    
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