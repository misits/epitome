// Core interfaces
export interface TemplateContext {
  [key: string]: any;
}

export interface GeneratorOptions {
  outputDir?: string;
  mdDir?: string;
  templatesDir?: string;
  scssDir?: string;
  debug?: boolean;
}

// Ensure all options have defaults
export interface ResolvedGeneratorOptions {
  outputDir: string;
  mdDir: string;
  templatesDir: string;
  scssDir: string;
  debug: boolean;
}

export interface TemplateEngine {
  render(template: string, context: TemplateContext): string;
} 