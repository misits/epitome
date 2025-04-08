import { Logger } from '@lib/core/Logger';
import { TemplateContext } from '@/types/interfaces';
import { ContextResolver } from '@lib/engine/context/ContextResolver';
import { HtmlUtils } from '@lib/engine/utils/HtmlUtils';

/**
 * Processor for variable interpolation and special directives
 */
export class VariableProcessor {
  private logger: Logger;
  private contextResolver: ContextResolver;
  private htmlUtils: HtmlUtils;

  constructor(logger: Logger, contextResolver: ContextResolver, htmlUtils: HtmlUtils) {
    this.logger = logger;
    this.contextResolver = contextResolver;
    this.htmlUtils = htmlUtils;
  }

  /**
   * Process variables and special directives in a template
   */
  processVariables(template: string, context: TemplateContext): string {
    // Enhanced @ul and @ol directives with ID and class support
    let result = template.replace(/{{@(ul|ol)\s+([^}]+)}}/g, (fullMatch, listType, attributesStr) => {
      // Parse the attributes to extract id, classes, and the actual path
      const { id, classes, path } = this.htmlUtils.parseAttributes(attributesStr);
      
      // Get the array items
      const items = this.contextResolver.resolvePath(context, path);
      
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
        `<li>${this.htmlUtils.escapeHtml(String(item))}</li>`
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
        argValue = this.contextResolver.resolvePath(context, varArg);
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
      const value = this.contextResolver.resolvePath(context, variablePath.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });
    
    // Then, handle double-brace variables (with HTML escaping)
    result = result.replace(/{{([^#/@][^{}]*?)}}/g, (fullMatch, variablePath) => {
      const path = variablePath.trim();
      
      // Special case for {{this}}
      if (path === 'this') {
        if (context.this === undefined || context.this === null) {
          return '';
        }
        
        // For primitive values, just convert to string
        if (typeof context.this !== 'object' || context.this === null) {
          return this.htmlUtils.escapeHtml(String(context.this));
        }
        
        // For arrays, join with commas
        if (Array.isArray(context.this)) {
          return this.htmlUtils.escapeHtml(context.this.join(', '));
        }
        
        // For objects, convert to JSON for display
        return this.htmlUtils.escapeHtml(JSON.stringify(context.this));
      }
      
      // Log the path being processed for debugging
      this.logger.logLevel('data', `Processing variable: {{${path}}}`);
      
      const value = this.contextResolver.resolvePath(context, path);
      
      if (value === undefined || value === null) {
        // Enhanced logging for debugging nested paths
        if (path.includes('.')) {
          this.logger.logLevel('data', `Could not resolve nested path: ${path}`);
          
          // Log the parent object to help debugging
          const parts = path.split('.');
          const parentPath = parts[0];
          const parent = this.contextResolver.resolvePath(context, parentPath);
          
          if (parent !== undefined && parent !== null) {
            this.logger.logLevel('data', `Parent object '${parentPath}' exists:`);
            
            // For objects, log the keys to show what's available
            if (typeof parent === 'object' && !Array.isArray(parent)) {
              this.logger.logLevel('data', `Available keys: ${Object.keys(parent).join(', ')}`);
              
              // Check if the next level key exists
              if (parts.length > 1 && parts[1] in parent) {
                const secondLevel = parent[parts[1]];
                this.logger.logLevel('data', `Second level '${parts[1]}' exists and is a ${typeof secondLevel}`);
                
                if (typeof secondLevel === 'object' && secondLevel !== null) {
                  this.logger.logLevel('data', `Keys in second level: ${Object.keys(secondLevel).join(', ')}`);
                }
              } else if (parts.length > 1) {
                this.logger.logLevel('data', `Second level key '${parts[1]}' does not exist in parent object`);
              }
            } else if (Array.isArray(parent)) {
              this.logger.logLevel('data', `Parent is an array with ${parent.length} items`);
            } else {
              this.logger.logLevel('data', `Parent is a ${typeof parent} with value: ${parent}`);
            }
          } else {
            this.logger.logLevel('data', `Parent object '${parentPath}' does not exist`);
          }
        } else {
          this.logger.logLevel('data', `Variable not found: ${path}`);
        }
        return '';
      } else {
        this.logger.logLevel('data', `Successfully resolved variable {{${path}}}`);
      }
      
      // If the value is an array with a single item, unwrap it
      if (Array.isArray(value) && value.length === 1) {
        return this.htmlUtils.escapeHtml(String(value[0]));
      }
      
      // Return the value, converting arrays to strings as needed
      if (Array.isArray(value)) {
        // If it's an array, but we're not in an each block, join with commas
        return this.htmlUtils.escapeHtml(value.join(', '));
      }
      
      return this.htmlUtils.escapeHtml(String(value));
    });
    
    return result;
  }
} 