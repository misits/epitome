import { Logger } from './Logger';
import { TemplateContext, TemplateEngine } from '../types/interfaces';

/**
 * HandlebarsLikeEngine - Template engine that implements a subset of Handlebars syntax
 * with improved handling of nested arrays
 */
export class HandlebarsLikeEngine implements TemplateEngine {
  private logger: Logger;
  private currentItemContext: any = null; // Track current item context for better nested access

  constructor(logger: Logger) {
    this.logger = logger;
  }

  render(template: string, context: TemplateContext): string {
    // Process the template in the correct order to handle nested structures
    this.logger.logLevel('template', 'Starting template processing');
    this.logger.logLevel('data', 'Initial context:', JSON.stringify(context));
    
    // First handle the top-level each blocks (both traditional and @ syntax)
    let processed = this.processEachBlocks(template, context);
    
    // Then handle any remaining conditionals (both traditional and @ syntax)
    processed = this.processConditionals(processed, context);
    
    // Then process variables
    processed = this.processVariables(processed, context);
    
    // Clean up any remaining template tags
    processed = this.cleanupRemainingTags(processed);
    
    return processed;
  }

  private processConditionals(template: string, context: TemplateContext): string {
    // Support both traditional syntax {{#if ...}} and the new @ syntax {{@if ...}}
    const conditionalPattern = /{{(?:#|@)if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    let result = template;
    
    // Add a safety mechanism to prevent infinite loops
    const MAX_ITERATIONS = 100;
    let iterations = 0;
    
    let match;
    while ((match = conditionalPattern.exec(result)) !== null) {
      iterations++;
      
      // Safety check for max iterations
      if (iterations > MAX_ITERATIONS) {
        this.logger.error(`Maximum number of iterations (${MAX_ITERATIONS}) exceeded in processConditionals. Possible infinite loop detected.`);
        break;
      }
      
      const [fullMatch, condition, content] = match;
      const conditionPath = condition.trim();
      
      this.logger.logLevel('template', `Evaluating condition: ${conditionPath} (iteration ${iterations})`);
      
      const value = this.resolvePath(context, conditionPath);
      this.logger.logLevel('template', `Condition value for ${conditionPath}: ${JSON.stringify(value)}`);
      
      // Determine if the condition is truthy
      // Arrays with elements, objects, non-empty strings, numbers != 0 are truthy
      const isTruthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
      this.logger.logLevel('template', `Condition ${conditionPath} is ${isTruthy ? 'truthy' : 'falsy'}`);
      
      const replacement = isTruthy ? content : '';
      
      // Replace this specific occurrence
      result = result.substring(0, match.index) + 
               replacement + 
               result.substring(match.index + fullMatch.length);
      
      // Reset regex to start from the beginning since we modified the string
      conditionalPattern.lastIndex = 0;
    }

    return result;
  }

  private processEachBlocks(template: string, context: TemplateContext): string {
    // Support both traditional syntax {{#each ...}} and the new @ syntax {{@each ...}}
    const eachPattern = /{{(?:#|@)each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
    let result = template;
    
    // Add a safety mechanism to prevent infinite loops
    const MAX_ITERATIONS = 100;
    let iterations = 0;
    
    let match;
    while ((match = eachPattern.exec(result)) !== null) {
      iterations++;
      
      // Safety check for max iterations
      if (iterations > MAX_ITERATIONS) {
        this.logger.error(`Maximum number of iterations (${MAX_ITERATIONS}) exceeded in processEachBlocks. Possible infinite loop detected.`);
        break;
      }
      
      const [fullMatch, arrayPath, itemTemplate] = match;
      const trimmedArrayPath = arrayPath.trim();
      
      this.logger.logLevel('template', `Processing each block for array: ${trimmedArrayPath}`);
      
      // Store the parent context for use in nested each blocks
      const parentContext = this.currentItemContext || context;
      
      // Get the array from the context
      let array = this.getArray(context, trimmedArrayPath);
      
      // Process the array
      let processedContent = '';
      if (array && array.length > 0) {
        this.logger.logLevel('data', `Processing array with ${array.length} items for ${trimmedArrayPath}`);
        
        processedContent = array.map((item: any, index: number) => {
          // Set the current item context for use in nested processing
          const prevItemContext = this.currentItemContext;
          this.currentItemContext = item;
          
          // Create a context for this item
          const itemContext = this.createItemContext(item, trimmedArrayPath, context);
          
          // Process the template with this context
          let processedItem = itemTemplate;
          
          // First process any nested each blocks
          if (processedItem.includes('{{#each') || processedItem.includes('{{@each')) {
            processedItem = this.processEachBlocks(processedItem, itemContext);
          }
          
          // Then process conditionals
          if (processedItem.includes('{{#if') || processedItem.includes('{{@if')) {
            processedItem = this.processConditionals(processedItem, itemContext);
          }
          
          // Then process variables
          processedItem = this.processVariables(processedItem, itemContext);
          
          // Restore the previous item context
          this.currentItemContext = prevItemContext;
          
          return processedItem;
        }).join('');
      }
      
      // Replace the entire {{#each}} block with its processed content
      result = result.substring(0, match.index) + 
               processedContent + 
               result.substring(match.index + fullMatch.length);
      
      // Reset the regex to start from the beginning
      eachPattern.lastIndex = 0;
    }
    
    return result;
  }

  private getArray(context: TemplateContext, arrayPath: string): any[] {
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

  private createItemContext(item: any, arrayPath: string, parentContext: TemplateContext): TemplateContext {
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

  private parseAttributes(attributesStr: string): { id?: string; classes?: string[]; path: string } {
    let id: string | undefined;
    const classes: string[] = [];
    
    // Start with empty path
    let path = attributesStr.trim();
    
    // Extract ID and class attributes from the string
    const tokens = attributesStr.trim().split(/\s+/);
    
    // Look for ID (#id) and class (.class) selectors
    const attributeTokens: string[] = [];
    const pathTokens: string[] = [];
    
    for (const token of tokens) {
      if (token.startsWith('#')) {
        // Found an ID
        id = token.slice(1); // Remove the # prefix
      } else if (token.startsWith('.')) {
        // Found a class
        classes.push(token.slice(1)); // Remove the . prefix
      } else {
        // Assume it's part of the path
        pathTokens.push(token);
      }
    }
    
    // The remaining tokens make up the path
    path = pathTokens.join(' ');
    
    return { id, classes, path };
  }

  private processVariables(template: string, context: TemplateContext): string {
    // Enhanced @ul and @ol directives with ID and class support
    let result = template.replace(/{{@(ul|ol)\s+([^}]+)}}/g, (fullMatch, listType, attributesStr) => {
      // Parse the attributes to extract id, classes, and the actual path
      const { id, classes, path } = this.parseAttributes(attributesStr);
      
      // Get the array items
      const items = this.resolvePath(context, path);
      
      // If not an array, return empty string
      if (!Array.isArray(items)) {
        this.logger.logLevel('template', `@${listType} directive: ${path} is not an array`);
        return '';
      }
      
      // Create the HTML attributes string
      let attributesHTML = '';
      if (id) {
        attributesHTML += ` id="${id}"`;
      }
      if (classes && classes.length > 0) {
        attributesHTML += ` class="${classes.join(' ')}"`;
      }
      
      // Convert array to <ul> or <ol> with <li> elements
      const listItems = items.map(item => 
        `<li>${this.escapeHtml(String(item))}</li>`
      ).join('');
      
      return `<${listType}${attributesHTML}>${listItems}</${listType}>`;
    });
    
    // Then, handle triple-brace variables (unescaped HTML)
    result = result.replace(/{{{([^{}]*?)}}}/g, (_, variablePath) => {
      const value = this.resolvePath(context, variablePath.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });
    
    // Then, handle double-brace variables (with HTML escaping)
    result = result.replace(/{{([^#/@][^{}]*?)}}/g, (_, variablePath) => {
      const path = variablePath.trim();
      
      // Special case for {{this}}
      if (path === 'this') {
        if (context.this === undefined || context.this === null) {
          return '';
        }
        
        // For primitive values, just convert to string
        if (typeof context.this !== 'object' || context.this === null) {
          return this.escapeHtml(String(context.this));
        }
        
        // For arrays, join with commas
        if (Array.isArray(context.this)) {
          return this.escapeHtml(context.this.join(', '));
        }
        
        // For objects, convert to JSON for display
        return this.escapeHtml(JSON.stringify(context.this));
      }
      
      const value = this.resolvePath(context, path);
      
      if (value === undefined || value === null) {
        return '';
      }
      
      // If the value is an array with a single item, unwrap it
      if (Array.isArray(value) && value.length === 1) {
        return this.escapeHtml(String(value[0]));
      }
      
      // Return the value, converting arrays to strings as needed
      if (Array.isArray(value)) {
        // If it's an array, but we're not in an each block, join with commas
        return this.escapeHtml(value.join(', '));
      }
      
      return this.escapeHtml(String(value));
    });
    
    return result;
  }

  private resolvePath(context: TemplateContext, path: string): any {
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

  private escapeHtml(str: string): string {
    if (str === undefined || str === null) {
      return '';
    }
    
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private cleanupRemainingTags(template: string): string {
    // Remove any remaining template tags
    let result = template;
    
    // Remove any {{#each ...}} and {{@each ...}} tags
    result = result.replace(/{{(?:#|@)each\s+[^}]+}}/g, '');
    
    // Remove any {{#if ...}} and {{@if ...}} tags
    result = result.replace(/{{(?:#|@)if\s+[^}]+}}/g, '');
    
    // Remove any {{/each}} and {{/if}} tags
    result = result.replace(/{{\/each}}/g, '');
    result = result.replace(/{{\/if}}/g, '');
    
    // Remove any remaining {{...}} or {{{...}}} tags
    result = result.replace(/{{{[^}]*}}}/g, '');
    result = result.replace(/{{[^}]*}}/g, '');
    
    return result;
  }
}