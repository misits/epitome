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
      debug: options.debug ?? false,
      minifyCss: options.minifyCss ?? true
    };
    
    // Initialize logger
    this.logger = new Logger();
    
    // Always enable basic logging
    this.logger.enable().setPrefix('[Generator]');
    
    if (this.options.debug) {
      // Enable verbose logging for debug mode
      this.logger.enableLevel('template');
      this.logger.enableLevel('data');
      this.logger.enableLevel('parse');
      this.logger.enableLevel('debug');
      this.logger.debug('Debug mode enabled with verbose logging');
    }
    
    // Initialize components
    this.templateEngine = new HandlebarsLikeEngine(this.logger, this.options.templatesDir);
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
  public build(mdFilename: string = 'index.md', outputHtmlFilename: string = 'index.html'): void {
    try {
      this.logger.info('Starting build process...');
      
      // 1. Parse the markdown file
      this.logger.info('Step 1: Reading markdown file...');
      const mdFilePath = path.join(process.cwd(), this.options.mdDir, mdFilename);
      const { data, content } = this.markdownProcessor.parse(mdFilePath);
      
      // 2. Convert markdown content to HTML
      this.logger.info('Step 2: Converting markdown to HTML...');
      const htmlContent = this.markdownProcessor.convertToHtml(content);
      
      // 3. Get the template file based on theme
      this.logger.info('Step 3: Getting template file...');
      const theme = data.theme || 'default';
      const templatePath = path.join(process.cwd(), this.options.templatesDir, `${theme}.html`);
      const template = fs.readFileSync(templatePath, 'utf8');
      
      // 4. Create context with all data and HTML content
      this.logger.info('Step 4: Creating context...');
      
      // Calculate page depth for relative URL handling
      let pageDepth = 0;
      if (outputHtmlFilename !== 'index.html') {
        // Count directory separators in the path
        pageDepth = (outputHtmlFilename.match(/\//g) || []).length;
      }
      
      const context = {
        ...data,
        content: htmlContent,
        page_depth: pageDepth,
        current_page: mdFilename.replace('.md', '')
      };
      
      // 5. Process the template with the context
      this.logger.info('Step 5: Processing template...');
      const processedHtml = this.templateEngine.render(template, context);
      
      // 6. Write the HTML output
      this.logger.info('Step 6: Writing HTML output...');
      const outputHtmlPath = path.join(process.cwd(), this.options.outputDir, outputHtmlFilename);
      fs.writeFileSync(outputHtmlPath, processedHtml);
      this.logger.info(`HTML written to: ${outputHtmlPath}`);
      
      // 7. Compile SCSS to CSS
      this.logger.info('Step 7: Compiling SCSS to CSS...');
      const sassFilePath = path.join(process.cwd(), this.options.scssDir, `${theme}.scss`);
      const outputCssPath = path.join(process.cwd(), this.options.outputDir, 'style.css');
      this.assetProcessor.compileSass(sassFilePath, outputCssPath, this.options.minifyCss);
      
      this.logger.success('Build completed successfully!');
    } catch (error) {
      this.logger.error('Build failed:', error);
      throw error;
    }
  }
  
  /**
   * Build all markdown files in the md directory
   */
  public buildAll(): void {
    this.logger.info('Building all markdown files...');
    const mdDir = path.join(process.cwd(), this.options.mdDir);
    
    // Get all md files in the directory
    const mdFiles = fs.readdirSync(mdDir)
      .filter(file => file.endsWith('.md'));
      
    if (mdFiles.length === 0) {
      this.logger.error('No markdown files found in directory:', mdDir);
      return;
    }
    
    // Build each file
    mdFiles.forEach(mdFile => {
      // Special case for index.md - keep at root
      if (mdFile === 'index.md') {
        this.build(mdFile, 'index.html');
      } else {
        // For all other files, create a folder structure
        const pageName = mdFile.replace('.md', '');
        const folderPath = path.join(process.cwd(), this.options.outputDir, pageName);
        
        // Create the directory if it doesn't exist
        this.ensureDirectoryExists(folderPath);
        
        // Build the file as index.html inside the folder
        this.build(mdFile, `${pageName}/index.html`);
      }
    });
    
    this.logger.success('✅ Build of all files completed successfully!');
  }
  
  /**
   * Build specific files for debugging
   */
  public buildSpecificFiles(): void {
    this.logger.info('Building specific files...');
    // Just build some important files for testing
    this.build('about.md', 'about/index.html');
    this.build('projects.md', 'projects/index.html');
    
    this.logger.success('Build of specific files completed successfully!');
  }
  
  /**
   * Watch for file changes and rebuild automatically
   */
  public watch(): void {
    try {
      this.logger.info('Starting watch mode...');
      this.buildAll();
      
      // Check if chokidar is available
      try {
        // Dynamic import to avoid dependency in prod builds
        const chokidar = require('chokidar');
        
        const mdDir = path.join(process.cwd(), this.options.mdDir);
        const templatesDir = path.join(process.cwd(), this.options.templatesDir);
        const scssDir = path.join(process.cwd(), this.options.scssDir);
        
        this.logger.info('Watching for file changes...');
        this.logger.info(`  - Markdown: ${mdDir}`);
        this.logger.info(`  - Templates: ${templatesDir}`);
        this.logger.info(`  - SCSS: ${scssDir}`);
        
        // Set up file watchers
        const watcher = chokidar.watch([
          path.join(mdDir, '**/*.md'),
          path.join(templatesDir, '**/*.html'),
          path.join(scssDir, '**/*.scss')
        ], {
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
          }
        });
        
        // Handle file changes
        watcher.on('change', (filePath: string) => {
          this.logger.info(`File changed: ${filePath}`);
          
          // Rebuild all files when any file changes
          this.buildAll();
        });
        
        // Handle file deletions
        watcher.on('unlink', (filePath: string) => {
          // Only handle markdown file deletions
          if (filePath.endsWith('.md')) {
            this.logger.info(`File deleted: ${filePath}`);
            
            // Get the base filename without extension
            const mdFile = path.basename(filePath);
            const pageName = mdFile.replace('.md', '');
            
            // Determine the path to remove from the public folder
            let pathToRemove;
            if (mdFile === 'index.md') {
              pathToRemove = path.join(process.cwd(), this.options.outputDir, 'index.html');
            } else {
              pathToRemove = path.join(process.cwd(), this.options.outputDir, pageName);
            }
            
            // Remove the file or directory
            if (fs.existsSync(pathToRemove)) {
              if (fs.statSync(pathToRemove).isDirectory()) {
                // Remove directory recursively
                this.logger.info(`Removing directory: ${pathToRemove}`);
                fs.rmSync(pathToRemove, { recursive: true, force: true });
              } else {
                // Remove file
                this.logger.info(`Removing file: ${pathToRemove}`);
                fs.unlinkSync(pathToRemove);
              }
              this.logger.success(`Removed ${pathToRemove}`);
            }
          }
        });
        
        this.logger.success('Watch mode started successfully!');
      } catch (error) {
        this.logger.error('Failed to initialize watch mode with chokidar:', error);
        this.logger.warn('Please install chokidar with: npm install chokidar');
      }
    } catch (error) {
      this.logger.error('Watch mode failed:', error);
      throw error;
    }
  }
  
  /**
   * Utility method to ensure a directory exists
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }
}