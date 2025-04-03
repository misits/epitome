/**
 * Utility class for HTML operations
 */
export class HtmlUtils {
  /**
   * Escape HTML special characters in a string
   */
  escapeHtml(str: string): string {
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

  /**
   * Parse ID and class attributes from a string in the format "#id .class1 .class2 path"
   */
  parseAttributes(attributesStr: string): { id?: string; classes?: string[]; path: string } {
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
} 