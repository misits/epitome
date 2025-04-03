import { Logger } from './Logger';
import { TemplateContext, TemplateEngine } from '../types/interfaces';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HandlebarsLikeEngine - Template engine that implements a subset of Handlebars syntax
 * with improved handling of nested arrays
 */
export class HandlebarsLikeEngine implements TemplateEngine {
  private logger: Logger;
  private currentItemContext: any = null; // Track current item context for better nested access
  private templatesDir: string = './src/templates'; // Default templates directory
  private partialsDir: string = 'partials'; // Subdirectory for partials
  private yieldBlocks: Map<string, string> = new Map(); // Store yield blocks

  constructor(logger: Logger, templatesDir?: string) {
    this.logger = logger;
    // Don't overwrite the main prefix - this will just be used in specific log messages
    // to clarify which component is logging
    this.logger.logLevel('debug', 'HandlebarsLikeEngine initialized');
    
    if (templatesDir) {
      this.templatesDir = templatesDir;
    }
  }

  render(template: string, context: TemplateContext): string {
    // Reset yield blocks for this render
    this.yieldBlocks.clear();
    
    // Add URL helper functions to the context
    const enhancedContext: TemplateContext & {
      assetPath: (path: string) => string;
      urlPath: (path: string) => string;
    } = {
      ...context,
      // Function to generate correct relative paths for assets
      assetPath: (path: string) => {
        const currentPageDepth = context.page_depth || 0;
        const prefix = currentPageDepth > 0 ? '../'.repeat(currentPageDepth) : './';
        return `${prefix}${path}`;
      },
      // Function to generate correct relative paths for pages
      urlPath: (path: string) => {
        // Handle special case for root path
        if (path === '/' || path === '') {
          const currentPageDepth = context.page_depth || 0;
          return currentPageDepth > 0 ? '../'.repeat(currentPageDepth) : './';
        }
        
        // Strip any leading slash
        if (path.startsWith('/')) {
          path = path.substring(1);
        }
        
        // Strip any trailing .html
        if (path.endsWith('.html')) {
          path = path.substring(0, path.length - 5);
        }
        
        // Add trailing slash if not present
        if (!path.endsWith('/')) {
          path = path + '/';
        }
        
        // Add relative prefix based on current page depth
        const currentPageDepth = context.page_depth || 0;
        const prefix = currentPageDepth > 0 ? '../'.repeat(currentPageDepth) : './';
        
        return `${prefix}${path}`;
      }
    };
    
    // Process the template in the correct order to handle nested structures
    this.logger.logLevel('template', 'Starting template processing');
    
    // Create a clean version of the context for logging (without large HTML content)
    const loggableContext = { ...enhancedContext };
    if (loggableContext.content && typeof loggableContext.content === 'string') {
      // Replace HTML content with summary to avoid huge log output
      const contentLength = loggableContext.content.length;
      loggableContext.content = contentLength > 100 
        ? `[HTML content: ${contentLength} chars]` 
        : loggableContext.content;
    }
    
    this.logger.logLevel('data', 'Initial context:', loggableContext);
    
    // UPDATED FLOW FOR INSERTION APPROACH:
    // 1. Extract yield blocks from the child template (saves them for insertion)
    let extractedTemplate = this.extractYieldBlocks(template);
    
    // 2. Process partials in the child template
    let processed = this.processPartials(extractedTemplate, enhancedContext);
    
    // 3. Process yield blocks (inserts content into yield areas)
    processed = this.processYields(processed);
    
    // 4. Process conditionals and each blocks (in the combined template)
    processed = this.processEachBlocks(processed, enhancedContext);
    processed = this.processConditionals(processed, enhancedContext);
    
    // 5. Process variables
    processed = this.processVariables(processed, enhancedContext);
    
    // 6. Clean up any remaining template tags
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
      
      // Create a loggable version of the value
      let loggableValue = value;
      if (typeof value === 'string' && value.length > 100) {
        // If it's HTML content
        if (value.includes('<') && value.includes('>')) {
          const firstTagMatch = value.match(/<([a-zA-Z0-9]+)/);
          if (firstTagMatch) {
            loggableValue = `[HTML <${firstTagMatch[1]}...> ${value.length} chars]`;
          } else {
            loggableValue = `[String: ${value.length} chars]`;
          }
        } else {
          // Long non-HTML string
          loggableValue = `[String: ${value.length} chars]`;
        }
      }
      
      this.logger.logLevel('template', `Condition value for ${conditionPath}: ${loggableValue}`);
      
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
    
    // Handle special function calls like @assetPath and @urlPath
    // Match pattern like {{@assetPath 'style.css'}} or {{@urlPath 'about'}}
    // Also handles variable arguments like {{@assetPath preview}}
    result = result.replace(/{{@(assetPath|urlPath)\s+(?:['"]([^'"]+)['"]|([^}\s]+))(\s*)}}/g, (fullMatch, fnName, stringArg, varArg) => {
      if (!(fnName in context) || typeof context[fnName] !== 'function') {
        this.logger.logLevel('template', `Function ${fnName} not found in context`);
        return '';
      }
      
      let argValue;
      
      // If stringArg is defined, use it directly (it's a string literal like 'style.css')
      if (stringArg !== undefined) {
        argValue = stringArg;
      } 
      // Otherwise, it's a variable reference, so look it up in the context
      else if (varArg !== undefined) {
        argValue = this.resolvePath(context, varArg);
        if (argValue === undefined || argValue === null) {
          this.logger.error(`Variable ${varArg} not found for ${fnName} call`);
          return '';
        }
      } else {
        this.logger.error(`Invalid arguments for ${fnName} call`);
        return '';
      }
      
      try {
        // Call the function with the resolved argument
        return context[fnName](argValue);
      } catch (error) {
        this.logger.error(`Error calling ${fnName} with argument ${argValue}:`, error);
        return '';
      }
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
    
    // Remove any {{@partial ...}} tags
    result = result.replace(/{{@partial\s+[^}]+}}/g, '');
    
    // Remove any {{@yield ...}} and {{/yield}} tags
    result = result.replace(/{{@yield\s+[^}]+}}/g, '');
    result = result.replace(/{{\/yield}}/g, '');
    
    // Remove any yield placeholders or insertions
    result = result.replace(/{{@yield:placeholder:[^}]+}}/g, '');
    result = result.replace(/{{@yield:insert:[^}]+}}/g, '');
    
    // Remove any remaining {{...}} or {{{...}}} tags
    result = result.replace(/{{{[^}]*}}}/g, '');
    result = result.replace(/{{[^}]*}}/g, '');
    
    // Remove HTML comments that were used to document templates
    result = result.replace(/<!--\s*(?:This template|Instead of|The engine).*?-->/g, '');
    
    // Critical fix: Remove any duplicate content after the HTML closing tag
    // This can happen if yield blocks are processed incorrectly
    const htmlEndTagPos = result.lastIndexOf('</html>');
    if (htmlEndTagPos > -1) {
      // Keep only what's before the </html> tag plus the tag itself
      result = result.substring(0, htmlEndTagPos + 7).trim();
    }
    
    return result;
  }

  /**
   * Extract yield blocks from the template and store them for later use
   */
  private extractYieldBlocks(template: string): string {
    // Match yield blocks: {{@yield name}}...content...{{/yield}}
    const yieldPattern = /{{@yield\s+(?:['"]([^'"]+)['"]|([^}\s]+))(?:\s+[^}]*)?}}([\s\S]*?){{\/yield}}/g;
    let result = template;
    
    let match;
    while ((match = yieldPattern.exec(template)) !== null) {
      const [fullMatch, stringBlockName, varBlockName, content] = match;
      const blockName = stringBlockName || varBlockName || 'default';
      
      this.logger.logLevel('template', `Extracted yield block: ${blockName}`);
      
      // Store the block content (to be inserted later)
      this.yieldBlocks.set(blockName, content.trim());
      
      // For the new insertion-based approach, we don't need to replace the blocks
      // in the child template, as we want the content to remain in the output
      // We can just remove these blocks completely from the child template
      result = result.replace(fullMatch, '');
    }
    
    return result;
  }
  
  /**
   * Process yield placeholders and insert the corresponding block content
   */
  private processYields(template: string): string {
    // Replace yield placeholders with their content
    let result = template;
    
    // Debug what yield blocks we have stored
    const blockNames = Array.from(this.yieldBlocks.keys());
    this.logger.logLevel('template', `Available yield blocks: ${blockNames.join(', ')}`);
    
    // Support two styles of yields:
    // 1. {{@yield "name"}} - Simple insertion point (new style)
    // 2. {{@yield "name"}}...default content...{{/yield}} - Block with default content (traditional style)
    
    // First, handle wrapped yield blocks: {{@yield "name"}}...default content...{{/yield}}
    const yieldDefinitionPattern = /{{@yield\s+(?:['"]([^'"]+)['"]|([^}\s]+))(?:\s+[^}]*)?}}([\s\S]*?){{\/yield}}/g;
    
    result = result.replace(yieldDefinitionPattern, (fullMatch, stringBlockName, varBlockName, defaultContent) => {
      const blockName = stringBlockName || varBlockName || 'default';
      const customContent = this.yieldBlocks.get(blockName);
      
      if (customContent !== undefined) {
        // If we have custom content from a child template, insert it
        this.logger.logLevel('template', `Inserting custom content in block: ${blockName}`);
        return defaultContent + customContent;  // Insert custom after default
      } else {
        // Otherwise keep the default content
        this.logger.logLevel('template', `Using default content for block: ${blockName}`);
        return defaultContent;
      }
    });
    
    // Then, handle simple insertion points: {{@yield "name"}}
    const simpleYieldPattern = /{{@yield\s+(?:['"]([^'"]+)['"]|([^}\s]+))(?:\s+[^}]*)?}}/g;
    
    result = result.replace(simpleYieldPattern, (fullMatch, stringBlockName, varBlockName) => {
      const blockName = stringBlockName || varBlockName || 'default';
      const customContent = this.yieldBlocks.get(blockName);
      
      if (customContent !== undefined) {
        // If we have custom content from a child template, insert it
        this.logger.logLevel('template', `Inserting content at insertion point: ${blockName}`);
        return customContent;
      } else {
        // Otherwise just leave the yield tag (will be cleaned up later)
        this.logger.logLevel('template', `No content to insert at point: ${blockName}`);
        return '';
      }
    });
    
    return result;
  }

  /**
   * Process partials directives like {{@partial name}}
   */
  private processPartials(template: string, context: TemplateContext): string {
    // Support {{@partial 'name'}} or {{@partial name}}
    const partialPattern = /{{@partial\s+(?:['"]([^'"]+)['"]|([^}\s]+))(\s*)}}/g;
    let result = template;
    
    // Add a safety mechanism to prevent infinite loops or deep recursive includes
    const MAX_ITERATIONS = 50;
    let iterations = 0;
    
    let match;
    while ((match = partialPattern.exec(result)) !== null) {
      iterations++;
      
      // Safety check for max iterations
      if (iterations > MAX_ITERATIONS) {
        this.logger.error(`Maximum number of iterations (${MAX_ITERATIONS}) exceeded in processPartials. Possible infinite loop detected.`);
        break;
      }
      
      const [fullMatch, stringPartialName, varPartialName] = match;
      let partialName = stringPartialName || varPartialName;
      
      // If it's a variable, resolve it
      if (!stringPartialName && varPartialName) {
        const resolvedName = this.resolvePath(context, varPartialName);
        if (resolvedName !== undefined && resolvedName !== null) {
          partialName = String(resolvedName);
        } else {
          this.logger.error(`Variable ${varPartialName} not found for partial directive`);
          // Replace with empty string and continue
          result = result.substring(0, match.index) + 
                  '' + 
                  result.substring(match.index + fullMatch.length);
          partialPattern.lastIndex = match.index;
          continue;
        }
      }
      
      this.logger.logLevel('template', `Loading partial: ${partialName}`);
      
      try {
        // Ensure the partialName has .html extension
        if (!partialName.endsWith('.html')) {
          partialName = `${partialName}.html`;
        }
        
        // Load the partial template file
        const partialPath = path.join(process.cwd(), this.templatesDir, this.partialsDir, partialName);
        let partialContent;
        
        if (fs.existsSync(partialPath)) {
          partialContent = fs.readFileSync(partialPath, 'utf8');
          
          // Replace the partial directive with the partial content
          result = result.substring(0, match.index) + 
                  partialContent + 
                  result.substring(match.index + fullMatch.length);
          
          // Reset the regex to start from the beginning of the replacement
          // This allows nested partials to be processed
          partialPattern.lastIndex = match.index;
        } else {
          this.logger.error(`Partial template not found: ${partialPath}`);
          // Replace with empty string and continue
          result = result.substring(0, match.index) + 
                  '' + 
                  result.substring(match.index + fullMatch.length);
          partialPattern.lastIndex = match.index;
        }
      } catch (error) {
        this.logger.error(`Error loading partial ${partialName}:`, error);
        // Replace with empty string and continue
        result = result.substring(0, match.index) + 
                '' + 
                result.substring(match.index + fullMatch.length);
        partialPattern.lastIndex = match.index;
      }
    }
    
    return result;
  }
}