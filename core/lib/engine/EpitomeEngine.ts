import { Logger } from '@lib/core/Logger';
import { TemplateContext, TemplateEngine } from '@/types/interfaces';
import { ConditionalProcessor } from '@lib/engine/processors/ConditionalProcessor';
import { EachProcessor } from '@lib/engine/processors/EachProcessor';
import { VariableProcessor } from '@lib/engine/processors/VariableProcessor';
import { YieldProcessor } from '@lib/engine/processors/YieldProcessor';
import { PartialProcessor } from '@lib/engine/processors/PartialProcessor';
import { ContextResolver } from '@lib/engine/context/ContextResolver';
import { HtmlUtils } from '@lib/engine/utils/HtmlUtils';

/**
 * EpitomeEngine - Template engine that implements a subset of Handlebars syntax
 * with improved handling of nested arrays
 */
export class EpitomeEngine implements TemplateEngine {
  private logger: Logger;
  private templatesDir: string = './src/templates'; // Default templates directory
  private partialsDir: string = 'partials'; // Subdirectory for partials
  
  // Processors
  private conditionalProcessor: ConditionalProcessor;
  private eachProcessor: EachProcessor;
  private variableProcessor: VariableProcessor;
  private yieldProcessor: YieldProcessor;
  private partialProcessor: PartialProcessor;
  private contextResolver: ContextResolver;
  private htmlUtils: HtmlUtils;

  constructor(logger: Logger, templatesDir?: string) {
    this.logger = logger;
    this.logger.logLevel('debug', 'EpitomeEngine initialized');
    
    if (templatesDir) {
      this.templatesDir = templatesDir;
    }
    
    // Create utility classes
    this.contextResolver = new ContextResolver(this.logger);
    this.htmlUtils = new HtmlUtils();
    
    // Create processors
    this.conditionalProcessor = new ConditionalProcessor(this.logger, this.contextResolver);
    this.eachProcessor = new EachProcessor(this.logger, this.contextResolver);
    this.variableProcessor = new VariableProcessor(this.logger, this.contextResolver, this.htmlUtils);
    this.yieldProcessor = new YieldProcessor(this.logger);
    this.partialProcessor = new PartialProcessor(
      this.logger, 
      this.templatesDir, 
      this.partialsDir,
      this.contextResolver
    );
    
    // Connect processors that need references to each other
    this.eachProcessor.setPartialProcessor(this.partialProcessor);
    
    // Log initialization
    this.logger.logLevel('template', `Initialized EpitomeEngine with templates directory: ${this.templatesDir}`);
  }

  render(template: string, context: TemplateContext): string {
    // Reset state for this render
    this.yieldProcessor.reset();
    this.eachProcessor.reset();
    
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
    
    // PROCESSING FLOW:
    // 1. Extract yield blocks from the child template (saves them for insertion)
    let extractedTemplate = this.yieldProcessor.extractYieldBlocks(template);
    
    // 2. Process partials in the child template
    let processed = this.partialProcessor.processPartials(extractedTemplate, enhancedContext);
    
    // 3. Process yield blocks (inserts content into yield areas)
    processed = this.yieldProcessor.processYields(processed);
    
    // 4. Process partials again to handle partials inside yield blocks
    processed = this.partialProcessor.processPartials(processed, enhancedContext);
    
    // 5. Process conditionals and each blocks (in the combined template)
    processed = this.eachProcessor.processEachBlocks(processed, enhancedContext);
    processed = this.conditionalProcessor.processConditionals(processed, enhancedContext);
    
    // 6. Process variables
    processed = this.variableProcessor.processVariables(processed, enhancedContext);
    
    // 7. Clean up any remaining template tags
    processed = this.cleanupRemainingTags(processed);
    
    return processed;
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
    
    // Remove any {{@sanitize ...}} tags
    result = result.replace(/{{@sanitize\s+[^}]+}}/g, '');
    
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
} 