import { Logger } from '@lib/core/Logger';

/**
 * Processor for yield blocks and insertion points
 */
export class YieldProcessor {
  private logger: Logger;
  private yieldBlocks: Map<string, string> = new Map(); // Store yield blocks

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Reset the processor state
   */
  reset(): void {
    this.yieldBlocks.clear();
  }

  /**
   * Extract yield blocks from the template and store them for later use
   */
  extractYieldBlocks(template: string): string {
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
  processYields(template: string): string {
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
} 