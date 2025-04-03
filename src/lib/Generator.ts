import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';
import { HandlebarsLikeEngine } from './HandlebarsLikeEngine';
import { MarkdownProcessor } from './MarkdownProcessor';
import { AssetProcessor } from './AssetProcessor';
import { GeneratorOptions, ResolvedGeneratorOptions, TemplateEngine } from '../types/interfaces';

/**
 * Generator - Main class that orchestrates the CV generation process
 */
export class Generator {
  private options: ResolvedGeneratorOptions;
  private logger: Logger;
  private templateEngine: TemplateEngine;
  private markdownProcessor: MarkdownProcessor;
  private assetProcessor: AssetProcessor;
  
  constructor(options: GeneratorOptions = {}) {
    // Initialize with default values
    this.options = {
      outputDir: options.outputDir ?? './public',
      mdDir: options.mdDir ?? './md',
      templatesDir: options.templatesDir ?? './src/templates',
      scssDir: options.scssDir ?? './src/scss',
      debug: options.debug ?? false
    };
    
    // Initialize logger
    this.logger = new Logger();
    if (this.options.debug) {
      this.logger.enable().setPrefix('[Generator]');
      this.logger.enableLevel('template');
      this.logger.enableLevel('data');
      this.logger.enableLevel('parse');
    }
    
    // Initialize components
    this.templateEngine = new HandlebarsLikeEngine(this.logger);
    this.markdownProcessor = new MarkdownProcessor(this.logger);
    this.assetProcessor = new AssetProcessor(this.logger);
    
    // Ensure output directory exists
    this.ensureDirectoryExists(this.options.outputDir);
  }
  
  /**
   * Enable specific debug levels
   * @param levels Array of level names to enable
   */
  public enableDebugLevels(levels: string[]): this {
    if (this.options.debug) {
      levels.forEach(level => {
        this.logger.enableLevel(level);
        this.logger.log(`Enabled debug level: ${level}`);
      });
    }
    return this;
  }
  
  /**
   * Build the CV site from markdown to HTML with styling
   * @param mdFilename The markdown file to process
   * @param outputHtmlFilename The output HTML filename
   */
  public build(mdFilename: string = 'page.md', outputHtmlFilename: string = 'index.html'): void {
    try {
      this.logger.log('Starting build process...');
      
      // 1. Parse the markdown file
      this.logger.log('Step 1: Reading markdown file...');
      const mdFilePath = path.join(process.cwd(), this.options.mdDir, mdFilename);
      const { data, content } = this.markdownProcessor.parse(mdFilePath);
      
      // 2. Convert markdown content to HTML
      this.logger.log('Step 2: Converting markdown to HTML...');
      const htmlContent = this.markdownProcessor.convertToHtml(content);
      
      // 3. Get the template file based on theme
      this.logger.log('Step 3: Getting template file...');
      const theme = data.theme || 'default';
      const templatePath = path.join(process.cwd(), this.options.templatesDir, `${theme}.html`);
      const template = fs.readFileSync(templatePath, 'utf8');
      
      // 4. Create context with all data and HTML content
      this.logger.log('Step 4: Creating context...');
      const context = {
        ...data,
        content: htmlContent
      };
      
      // 5. Process the template with the context
      this.logger.log('Step 5: Processing template...');
      const processedHtml = this.templateEngine.render(template, context);
      
      // 6. Write the HTML output
      this.logger.log('Step 6: Writing HTML output...');
      const outputHtmlPath = path.join(process.cwd(), this.options.outputDir, outputHtmlFilename);
      fs.writeFileSync(outputHtmlPath, processedHtml);
      this.logger.log(`HTML written to: ${outputHtmlPath}`);
      
      // 7. Compile SCSS to CSS
      this.logger.log('Step 7: Compiling SCSS to CSS...');
      const sassFilePath = path.join(process.cwd(), this.options.scssDir, `${theme}.scss`);
      const outputCssPath = path.join(process.cwd(), this.options.outputDir, 'style.css');
      this.assetProcessor.compileSass(sassFilePath, outputCssPath);
      
      this.logger.log('Build completed successfully!');
    } catch (error) {
      this.logger.error('Build failed:', error);
      throw error;
    }
  }
  
  /**
   * Utility method to ensure a directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created directory: ${dirPath}`);
    }
  }
}