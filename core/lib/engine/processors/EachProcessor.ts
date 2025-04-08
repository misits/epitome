import { Logger } from '@lib/core/Logger';
import { TemplateContext } from '@/types/interfaces';
import { ContextResolver } from '@lib/engine/context/ContextResolver';

/**
 * Processor for each blocks like {{#each}} and {{@each}}
 */
export class EachProcessor {
  private logger: Logger;
  private contextResolver: ContextResolver;

  constructor(logger: Logger, contextResolver: ContextResolver) {
    this.logger = logger;
    this.contextResolver = contextResolver;
  }

  /**
   * Reset the processor state
   */
  reset(): void {
    this.contextResolver.reset();
  }

  /**
   * Process each blocks in a template
   */
  processEachBlocks(template: string, context: TemplateContext): string {
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
      
      // Get the array from the context
      let array = this.contextResolver.getArray(context, trimmedArrayPath);
      
      // Process the array
      let processedContent = '';
      if (array && array.length > 0) {
        this.logger.logLevel('data', `Processing array with ${array.length} items for ${trimmedArrayPath}`);
        
        processedContent = array.map((item: any, index: number) => {
          // Set the current item context for use in nested processing
          const prevItemContext = this.contextResolver.getCurrentItemContext();
          this.contextResolver.setCurrentItemContext(item);
          
          // Create a context for this item
          const itemContext = this.contextResolver.createItemContext(item, trimmedArrayPath, context);
          
          // Add the index to the item context for access with {{@index}}, starting from 1 instead of 0
          itemContext['@index'] = index + 1;
          
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
          this.contextResolver.setCurrentItemContext(prevItemContext);
          
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

  /**
   * Process conditionals in a template (called within each blocks)
   */
  private processConditionals(template: string, context: TemplateContext): string {
    const conditionalPattern = /{{(?:#|@)if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    let result = template;
    let match;
    let iterations = 0;
    const MAX_ITERATIONS = 100;
    
    while ((match = conditionalPattern.exec(result)) !== null) {
      iterations++;
      if (iterations > MAX_ITERATIONS) {
        this.logger.error(`Maximum iterations exceeded in nested conditionals.`);
        break;
      }
      
      const [fullMatch, condition, content] = match;
      const value = this.contextResolver.resolvePath(context, condition.trim());
      const isTruthy = Array.isArray(value) ? value.length > 0 : Boolean(value);
      const replacement = isTruthy ? content : '';
      
      result = result.substring(0, match.index) + 
               replacement + 
               result.substring(match.index + fullMatch.length);
      
      conditionalPattern.lastIndex = 0;
    }
    
    return result;
  }

  /**
   * Process variables in a template (called within each blocks)
   */
  private processVariables(template: string, context: TemplateContext): string {
    let result = template;
    
    // Handle triple-brace variables (unescaped HTML)
    result = result.replace(/{{{([^{}]*?)}}}/g, (_, variablePath) => {
      const value = this.contextResolver.resolvePath(context, variablePath.trim());
      return value !== undefined && value !== null ? String(value) : '';
    });
    
    // Handle special variables with @ prefix
    result = result.replace(/{{(@[^{}]*?)}}/g, (_, variablePath) => {
      const path = variablePath.trim();
      const value = context[path]; // Direct access for special variables
      
      if (value === undefined || value === null) {
        return '';
      }
      
      return String(value);
    });
    
    // Handle double-brace variables (with HTML escaping)
    result = result.replace(/{{([^#/@][^{}]*?)}}/g, (_, variablePath) => {
      const path = variablePath.trim();
      const value = this.contextResolver.resolvePath(context, path);
      
      if (value === undefined || value === null) {
        return '';
      }
      
      // Simple conversion to string - the actual escaping will be done by VariableProcessor
      return String(value);
    });
    
    return result;
  }
} 