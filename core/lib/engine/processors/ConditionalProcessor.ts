import { Logger } from '@lib/core/Logger';
import { TemplateContext } from '@/types/interfaces';
import { ContextResolver } from '@lib/engine/context/ContextResolver';

/**
 * Processor for conditional tags like {{#if}} and {{@if}}
 */
export class ConditionalProcessor {
  private logger: Logger;
  private contextResolver: ContextResolver;

  constructor(logger: Logger, contextResolver: ContextResolver) {
    this.logger = logger;
    this.contextResolver = contextResolver;
  }

  /**
   * Process conditional blocks in a template
   */
  processConditionals(template: string, context: TemplateContext): string {
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
      
      const value = this.contextResolver.resolvePath(context, conditionPath);
      
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
} 