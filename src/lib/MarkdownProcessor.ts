import * as fs from 'fs';
import matter from 'gray-matter';
import { marked } from 'marked';
import { Logger } from './Logger';

/**
 * MarkdownProcessor - Handles parsing of markdown files with frontmatter
 */
export class MarkdownProcessor {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
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
      this.logger.error(`Error parsing markdown file: ${error}`);
      throw error;
    }
  }
  
  convertToHtml(markdown: string): string {
    this.logger.logLevel('parse', 'Converting markdown to HTML');
    return marked(markdown);
  }
  
  private normalizeData(data: any): any {
    const normalized = { ...data };
    
    // Find all properties that are likely to be arrays (collections)
    const arrayProperties = Object.keys(data).filter(key => {
      // Check if it's an array or might be a collection
      return Array.isArray(data[key]) || 
             (typeof data[key] === 'object' && data[key] !== null);
    });
    
    // Normalize all array properties dynamically
    arrayProperties.forEach(prop => {
      if (data[prop]) {
        normalized[prop] = this.normalizeArray(data[prop], prop);
      }
    });
    
    return normalized;
  }
  
  private normalizeArray(data: any, arrayName: string): any[] {
    // Fix nested array like experience.experience
    if (!Array.isArray(data) && data[arrayName] && Array.isArray(data[arrayName])) {
      this.logger.logLevel('data', `Fixed nested ${arrayName} array structure`);
      data = data[arrayName];
    }
  
    // Wrap in array if it's not already
    if (!Array.isArray(data)) {
      this.logger.logLevel('data', `Converted ${arrayName} to array`);
      data = [data];
    }
  
    // Normalize only objects, skip arrays of strings (e.g., tasks)
    return data.map((item: any) => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        Object.keys(item).forEach(key => {
          const value = item[key];
  
          // Skip if already an array of strings
          if (Array.isArray(value) && typeof value[0] === 'string') return;
  
          // Fix nested structure like tasks.tasks
          if (!Array.isArray(value) && value && value[key] && Array.isArray(value[key])) {
            this.logger.logLevel('data', `Fixed nested ${key} array structure in ${arrayName}`);
            item[key] = value[key];
          }
  
          // Convert single value into array
          if (value && !Array.isArray(value)) {
            this.logger.logLevel('data', `Converted ${key} to array in ${arrayName}`);
            item[key] = [value];
          }
        });
      }
      return item;
    });
  }
  
} 