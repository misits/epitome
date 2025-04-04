// Core interfaces
export interface TemplateContext {
  [key: string]: any;
  
  // Content property may contain HTML content
  content?: string;
  
  // Navigation properties
  page_depth?: number;
  current_page?: string;
}

export interface GeneratorOptions {
  outputDir?: string;
  mdDir?: string;
  templatesDir?: string;
  scssDir?: string;
  debug?: boolean;
  minifyCss?: boolean;
}

// Ensure all options have defaults
export interface ResolvedGeneratorOptions {
  outputDir: string;
  mdDir: string;
  templatesDir: string;
  scssDir: string;
  debug: boolean;
  minifyCss: boolean;
}

export interface TemplateEngine {
  render(template: string, context: TemplateContext): string;
} 