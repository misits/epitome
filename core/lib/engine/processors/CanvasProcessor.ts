import { Logger } from '@lib/core/Logger';
import { TemplateContext } from '@/types/interfaces';
import { ContextResolver } from '@lib/engine/context/ContextResolver';
import { HtmlUtils } from '@lib/engine/utils/HtmlUtils';

/**
 * Processor for canvas tags like {{@canvas}} for WebGL, Three.js, etc.
 */
export class CanvasProcessor {
  private logger: Logger;
  private contextResolver: ContextResolver;
  private htmlUtils: HtmlUtils;

  constructor(logger: Logger, contextResolver: ContextResolver, htmlUtils: HtmlUtils) {
    this.logger = logger;
    this.contextResolver = contextResolver;
    this.htmlUtils = htmlUtils;
  }

  /**
   * Process canvas directives in a template
   * Format: {{@canvas width height #id .class1 .class2 var1 var2 var3}}
   * Creates a canvas with specified dimensions and variables as data attributes
   * Width and height can be numeric pixels or percentage values (e.g., "100%")
   */
  processCanvas(template: string, context: TemplateContext): string {
    const canvasPattern = /{{@canvas\s+([^}]+)}}/g;
    let result = template;
    
    return result.replace(canvasPattern, (fullMatch, attributesStr) => {
      // Parse the attributes string to extract id, classes, and variables
      const { id, classes, path } = this.htmlUtils.parseAttributes(attributesStr);
      const tokens = path.trim().split(/\s+/);
      
      // Extract width and height if they're the first two tokens
      // Support both numeric and percentage values
      let width = '300';
      let height = '150';
      let variableTokens: string[] = [...tokens];
      
      // Check if first token is width (could be numeric or percentage)
      if (tokens.length >= 1) {
        const firstToken = tokens[0];
        // Check if it's a percentage value or a numeric value
        if (firstToken.endsWith('%') || !isNaN(Number(firstToken))) {
          width = firstToken;
          variableTokens.shift();
        }
      }
      
      // Check if second token is height (could be numeric or percentage)
      if (tokens.length >= 2) {
        const secondToken = tokens[1];
        // Check if it's a percentage value or a numeric value
        if (secondToken.endsWith('%') || !isNaN(Number(secondToken)) || secondToken.endsWith("vh") || secondToken.endsWith("vw")) {
          height = secondToken;
          variableTokens.shift();
        }
      }
      
      // Create the base canvas element with width and height
      let canvasAttributes = `width="${width}" height="${height}"`;
      
      // Add style attribute for percentage dimensions to make them work correctly
      if (width.endsWith('%') || height.endsWith('%') || height.endsWith('vh') || height.endsWith('vw')) {
        let styleAttr = 'style="';
        if (width.endsWith('%')) {
          styleAttr += `width:${width};`;
        }
        if (height.endsWith('%')) {
          styleAttr += `height:${height};`;
        }
        if (height.endsWith('vh')) {
          styleAttr += `height:${height};`;
        }
        if (height.endsWith('vw')) {
          styleAttr += `width:${height};`;
        }
        styleAttr += '"';
        canvasAttributes += ` ${styleAttr}`;
      }
      
      // Add ID if specified
      if (id) {
        canvasAttributes += ` id="${id}"`;
      }
      
      // Add classes if specified
      if (classes && classes.length > 0) {
        canvasAttributes += ` class="${classes.join(' ')}"`;
      }
      
      // Process any additional variables as data-* attributes
      const dataAttributes = variableTokens.map(varName => {
        const trimmedName = varName.trim();
        const value = this.contextResolver.resolvePath(context, trimmedName);
        
        if (value === undefined || value === null) {
          this.logger.logLevel('data', `Canvas variable not found: ${trimmedName}`);
          return '';
        }
        
        // Convert the variable name to kebab-case for HTML attributes
        const attrName = trimmedName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        
        // Sanitize the value for safe use in data attributes
        const sanitizedValue = this.htmlUtils.sanitizeForDataAttribute(value);
        
        return `data-${attrName}=${sanitizedValue}`;
      }).filter(attr => attr !== '').join(' ');
      
      // Combine all attributes
      if (dataAttributes) {
        canvasAttributes += ` ${dataAttributes}`;
      }
      
      this.logger.logLevel('template', `Creating canvas element with attributes: ${canvasAttributes}`);
      
      // Return the complete canvas element
      return `<canvas ${canvasAttributes}></canvas>`;
    });
  }
} 