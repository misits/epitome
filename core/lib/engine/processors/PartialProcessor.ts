import { Logger } from '@lib/core/Logger';
import { TemplateContext } from '@/types/interfaces';
import { ContextResolver } from '@lib/engine/context/ContextResolver';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Processor for partial includes
 */
export class PartialProcessor {
  private logger: Logger;
  private templatesDir: string;
  private partialsDir: string;
  private contextResolver: ContextResolver;

  constructor(
    logger: Logger, 
    templatesDir: string, 
    partialsDir: string,
    contextResolver: ContextResolver
  ) {
    this.logger = logger;
    this.templatesDir = templatesDir;
    this.partialsDir = partialsDir;
    this.contextResolver = contextResolver;
  }

  /**
   * Process partials directives like {{@partial name}}
   */
  processPartials(template: string, context: TemplateContext): string {
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
        const resolvedName = this.contextResolver.resolvePath(context, varPartialName);
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