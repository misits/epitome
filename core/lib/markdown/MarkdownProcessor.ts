import * as fs from 'fs';
import matter from 'gray-matter';
import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { Logger } from '@lib/core/Logger';

/**
 * MarkdownProcessor - Handles parsing of markdown files with frontmatter
 */
export class MarkdownProcessor {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
    this.logger.logLevel('debug', 'MarkdownProcessor initialized');
    
    // Configure marked to use gfmHeadingId extension
    marked.use(gfmHeadingId());
  }
  
  parse(filePath: string): { data: any, content: string } {
    this.logger.logLevel('parse', `Parsing markdown file: ${filePath}`);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);
      
      // Normalize the data structure
      const normalizedData = this.normalizeData(data);
      
      return { 
        data: normalizedData, 
        content 
      };
    } catch (error) {
      this.logger.error(`Error parsing markdown file:`, error);
      throw error;
    }
  }
  
  convertToHtml(markdown: string): string {
    this.logger.logLevel('parse', 'Converting markdown to HTML');
    // Use marked.parse instead of marked for synchronous operation
    return marked.parse(markdown, { async: false }) as string;
  }
  
  private normalizeData(data: any): any {
    const normalized = { ...data };
    
    // Find all properties that are likely to be arrays (collections)
    const arrayProperties = Object.keys(data).filter(key => {
      // ONLY consider arrays, not all objects
      return Array.isArray(data[key]);
    });
    
    // Find all properties that are nested objects but not arrays
    const objectProperties = Object.keys(data).filter(key => {
      return typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key]);
    });
    
    // Normalize all array properties dynamically
    arrayProperties.forEach(prop => {
      if (data[prop]) {
        normalized[prop] = this.normalizeArray(data[prop], prop);
      }
    });
    
    // Log the object properties for debugging
    if (objectProperties.length > 0) {
      this.logger.logLevel('data', `Found nested object properties: ${objectProperties.join(', ')}`);
    }
    
    // Keep nested objects intact
    objectProperties.forEach(prop => {
      // Log the structure for debugging
      this.logger.logLevel('data', `Preserving nested object structure for: ${prop}`);
      if (typeof data[prop] === 'object') {
        this.logger.logLevel('data', `Keys in ${prop}: ${Object.keys(data[prop]).join(', ')}`);
      }
    });
    
    return normalized;
  }
  
  private normalizeArray(data: any, arrayName: string): any[] {
    // ONLY normalize actual arrays, not objects
    if (!Array.isArray(data)) {
      // If it's not an array but has a same-named array property, extract it
      if (data[arrayName] && Array.isArray(data[arrayName])) {
        this.logger.debug(`Fixed nested ${arrayName} array structure`);
        data = data[arrayName];
      } else {
        // For other non-array objects, just return them intact
        this.logger.debug(`${arrayName} is not an array, returning as is`);
        return data;
      }
    }
  
    // For actual arrays, ensure each item is properly processed
    if (Array.isArray(data)) {
      return data.map((item: any) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          // For objects inside the array, process each property
          Object.keys(item).forEach(key => {
            const value = item[key];
  
            // Skip if already an array or if it's not a nested structure to normalize
            if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  
            // Fix nested structure like tasks.tasks, but ONLY if it has the expected structure
            if (value[key] && Array.isArray(value[key])) {
              this.logger.debug(`Fixed nested ${key} array structure in ${arrayName}`);
              item[key] = value[key];
            }
          });
        }
        return item;
      });
    }
    
    // Fallback case
    return Array.isArray(data) ? data : [data];
  }
} 