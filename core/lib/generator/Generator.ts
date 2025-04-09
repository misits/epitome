import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../lib/core/Logger';
import { EpitomeEngine } from '../engine/EpitomeEngine';
import { MarkdownProcessor } from '../../lib/markdown/MarkdownProcessor';
import { AssetProcessor } from '../../lib/assets/AssetProcessor';
import { GeneratorOptions, ResolvedGeneratorOptions, TemplateEngine } from '../../types/interfaces';
import { SceneCompiler } from './SceneCompiler';

/**
 * Generator - Main class that orchestrates the generation process
 */
export class Generator {
  private options: ResolvedGeneratorOptions;
  private logger: Logger;
  private templateEngine: TemplateEngine;
  private markdownProcessor: MarkdownProcessor;
  private assetProcessor: AssetProcessor;
  private sceneCompiler: SceneCompiler;
  private isSpaMode: boolean;
  
  constructor(options: GeneratorOptions = {}) {
    // Initialize with default values
    this.options = {
      outputDir: options.outputDir ?? './public',
      mdDir: options.mdDir ?? './src/md',
      templatesDir: options.templatesDir ?? './src/templates',
      scssDir: options.scssDir ?? './src/scss',
      jsDir: options.jsDir ?? './src/js',
      debug: options.debug ?? false,
      minifyCss: options.minifyCss ?? true,
      minifyJs: options.minifyJs ?? true,
      extractComponents: options.extractComponents ?? true,
      extractCritical: options.extractCritical ?? false,
      moduleSplit: options.moduleSplit ?? false,
      purgeCss: options.purgeCss ?? false,
      mediaQueryGrouping: options.mediaQueryGrouping ?? false
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
    this.templateEngine = new EpitomeEngine(this.logger, this.options.templatesDir);
    this.markdownProcessor = new MarkdownProcessor(this.logger);
    this.assetProcessor = new AssetProcessor(this.logger);
    this.sceneCompiler = new SceneCompiler(this.logger);
    
    // Check if SPA mode is active
    this.isSpaMode = process.argv.includes('--spa');
    if (this.isSpaMode) {
      this.logger.info('SPA mode enabled - will generate a single page application');
      this.logger.info('In SPA mode, only index.html is generated and all markdown files are compiled into scenes.json');
      this.logger.info('Any existing individual page HTML files will be removed from the output directory');
    }
    
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
      const theme = data.theme || 'global';
      
      // In SPA mode, skip individual page generation if not the index page
      if (this.isSpaMode && mdFilename !== 'index.md') {
        this.logger.info(`Skipping HTML generation for ${mdFilename} in SPA mode`);
        return;
      }
      
      // Use SPA template in SPA mode, otherwise use theme template
      let templateName: string;
      if (this.isSpaMode) {
        // Check if there's a specialized template for this page
        const specializedTemplate = path.join(process.cwd(), this.options.templatesDir, 'index', 'spa.html');
        if (mdFilename === 'index.md' && fs.existsSync(specializedTemplate)) {
          templateName = 'index/spa.html';
          this.logger.info('Using specialized index SPA template');
        } else {
          templateName = 'spa.html';
        }
      } else {
        templateName = `${theme}.html`;
      }
      
      const templatePath = path.join(process.cwd(), this.options.templatesDir, templateName);
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
        current_page: mdFilename.replace('.md', ''),
        theme: theme, // Explicitly add theme to the context
        debug_mode: this.options.debug ? 'true' : 'false', // Pass as string for template
        current_year: new Date().getFullYear() // Add current year for copyright notices
      };
      
      // 5. Process the template with the context
      this.logger.info('Step 5: Processing template...');
      const processedHtml = this.templateEngine.render(template, context);
      
      // 6. Write the HTML output
      this.logger.info('Step 6: Writing HTML output...');
      const outputHtmlPath = path.join(process.cwd(), this.options.outputDir, outputHtmlFilename);
      fs.writeFileSync(outputHtmlPath, processedHtml);
      this.logger.info(`HTML written to: ${outputHtmlPath}`);
      
      // 7. Compile SCSS to CSS with enhanced options
      this.logger.info('Step 7: Compiling SCSS to CSS with enhanced splitting...');
      const sassFilePath = path.join(process.cwd(), this.options.scssDir, `${theme}.scss`);
      
      // Calculate purge CSS content paths if enabled
      let purgeCssContentPaths: string[] | undefined;
      if (this.options.purgeCss) {
        // Include HTML output and template files for PurgeCSS analysis
        purgeCssContentPaths = [
          outputHtmlPath,
          path.join(process.cwd(), this.options.templatesDir, '**/*.html')
        ];
        this.logger.info('PurgeCSS enabled with content paths for unused CSS removal');
      }
      
      // Compile SASS with all selected options - use theme name as output name
      this.assetProcessor.compileSass({
        sassFilePath,
        outputName: theme, // Use theme name for the output CSS file
        minify: this.options.minifyCss,
        extractComponents: this.options.extractComponents,
        extractCritical: this.options.extractCritical,
        moduleSplit: this.options.moduleSplit,
        purgeCss: this.options.purgeCss,
        purgeCssContentPaths,
        mediaQueryGrouping: this.options.mediaQueryGrouping
      });
      
      // In SPA mode, also compile the engine.scss
      if (this.isSpaMode) {
        const engineSassFilePath = path.join(process.cwd(), this.options.scssDir, 'engine.scss');
        if (fs.existsSync(engineSassFilePath)) {
          this.logger.info('Compiling engine.scss for SPA mode...');
          this.assetProcessor.compileSass({
            sassFilePath: engineSassFilePath,
            outputName: 'engine',
            minify: this.options.minifyCss
          });
        } else {
          this.logger.warn('engine.scss not found, skipping compilation');
        }
      }
      
      // 8. Process JavaScript files
      this.logger.info('Step 8: Processing JavaScript files...');
      this.processJavaScript();
      
      this.logger.success('Build completed successfully!');
    } catch (error) {
      this.logger.error('Build failed:', error);
      throw error;
    }
  }
  
  /**
   * Process JavaScript files from the jsDir
   */
  private processJavaScript(): void {
    const jsDir = path.join(process.cwd(), this.options.jsDir);
    
    // Check if JS directory exists
    if (!fs.existsSync(jsDir)) {
      this.logger.info(`JavaScript directory not found: ${jsDir}, skipping JS processing`);
      return;
    }
    
    // In SPA mode, process the engine.js and main.js files
    if (this.isSpaMode) {
      const outputJsDir = path.join(process.cwd(), this.options.outputDir, 'assets/js');
      this.ensureDirectoryExists(outputJsDir);
      
      // Copy the engine.js to the assets directory
      const engineJsPath = path.join(jsDir, 'engine.js');
      if (fs.existsSync(engineJsPath)) {
        this.logger.info('Processing engine.js for SPA mode...');
        const outputEnginePath = path.join(outputJsDir, 'engine.js');
        fs.copyFileSync(engineJsPath, outputEnginePath);
        this.logger.info(`engine.js copied to: ${outputEnginePath}`);
      } else {
        this.logger.warn('engine.js not found in jsDir. SPA mode requires this file.');
      }
      
      // Copy the main.js to the assets directory
      const mainJsPath = path.join(jsDir, 'main.js');
      if (fs.existsSync(mainJsPath)) {
        this.logger.info('Processing main.js for SPA mode...');
        const outputMainPath = path.join(outputJsDir, 'main.js');
        fs.copyFileSync(mainJsPath, outputMainPath);
        this.logger.info(`main.js copied to: ${outputMainPath}`);
      } else {
        this.logger.warn('main.js not found in jsDir. SPA mode requires this file.');
      }
    }
    
    // Check for main.js or index.js as entry point
    const mainJsPath = path.join(jsDir, 'main.js');
    const indexJsPath = path.join(jsDir, 'index.js');
    
    if (fs.existsSync(mainJsPath)) {
      this.logger.info('Found main.js as entry point');
      
      // Bundle with code splitting for better performance
      this.assetProcessor.bundleJs({
        entryPoint: mainJsPath,
        outputName: 'main',
        minify: this.options.minifyJs,
        splitting: true, // Enable code splitting
        formats: ['esm'] // Modern module format
      });
      
    } else if (fs.existsSync(indexJsPath)) {
      this.logger.info('Found index.js as entry point');
      
      // Bundle with code splitting for better performance
      this.assetProcessor.bundleJs({
        entryPoint: indexJsPath,
        outputName: 'main',
        minify: this.options.minifyJs,
        splitting: true, // Enable code splitting
        formats: ['esm'] // Modern module format
      });
      
    } else {
      this.logger.info('No main entry point (main.js or index.js) found. Skipping JavaScript processing.');
      this.logger.info('To process JavaScript, create a main.js or index.js file that imports the files you want to include.');
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
    
    // In SPA mode, clean the output directory first, then compile scenes.json
    if (this.isSpaMode) {
      // Clean the output directory to remove individual HTML files
      this.cleanOutputDirectoryForSpa();
      
      this.logger.info('SPA mode: Compiling scenes.json...');
      const dataDir = path.join(process.cwd(), this.options.outputDir, 'assets/data');
      this.ensureDirectoryExists(dataDir);
      
      const scenesJsonPath = path.join(dataDir, 'scenes.json');
      this.sceneCompiler.compileScenes(mdDir, scenesJsonPath);
      
      // Build only the index.html in SPA mode
      this.build('index.md', 'index.html');
    } else {
      // Normal mode: build each file as separate HTML
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
    }
    
    this.logger.success('✅ Build of all files completed successfully!');
  }
  
  /**
   * Build specific files for debugging
   */
  public buildSpecificFiles(): void {
    this.logger.info('Building specific files...');
    
    // Example for debugging
    this.build('index.md', 'index.html');
    
    // Example for specific categories
    this.build('chapter-1a.md', 'chapter-1a/index.html');
    this.build('chapter-1b.md', 'chapter-1b/index.html');
    
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
        const jsDir = path.join(process.cwd(), this.options.jsDir);
        
        this.logger.info('Watching for file changes...');
        this.logger.info(`  - Markdown: ${mdDir}`);
        this.logger.info(`  - Templates: ${templatesDir}`);
        this.logger.info(`  - SCSS: ${scssDir}`);
        this.logger.info(`  - JavaScript: ${jsDir}`);
        
        if (this.isSpaMode) {
          this.logger.info('SPA mode: Changes to any markdown file will update the scenes.json file');
        }
        
        // Watch md files
        chokidar.watch(`${mdDir}/**/*.md`).on('change', (filePath: string) => {
          const filename = filePath.split('/').pop() || '';
          this.logger.info(`Markdown file changed: ${filename}`);
          
          if (this.isSpaMode) {
            // In SPA mode, recompile scenes.json and rebuild only index.html
            const dataDir = path.join(process.cwd(), this.options.outputDir, 'assets/data');
            this.ensureDirectoryExists(dataDir);
            
            const scenesJsonPath = path.join(dataDir, 'scenes.json');
            this.sceneCompiler.compileScenes(mdDir, scenesJsonPath);
            
            // If index.md changed, also rebuild the index.html
            if (filename === 'index.md') {
              this.build(filename, 'index.html');
            }
          } else {
            // Normal mode: rebuild the changed file
            if (filename === 'index.md') {
              this.build(filename, 'index.html');
            } else {
              const pageName = filename.replace('.md', '');
              this.build(filename, `${pageName}/index.html`);
            }
          }
        });
        
        // Watch template files
        chokidar.watch(`${templatesDir}/**/*.html`).on('change', (filePath: string) => {
          this.logger.info(`Template file changed: ${filePath}`);
          
          if (this.isSpaMode) {
            // In SPA mode, only rebuild index.html with spa.html template
            if (filePath.includes('spa.html') || filePath.includes('partials')) {
              this.build('index.md', 'index.html');
            }
          } else {
            // In normal mode, rebuild all files when a template changes
            this.buildAll();
          }
        });
        
        // Watch SCSS files
        chokidar.watch(`${scssDir}/**/*.scss`).on('change', (filePath: string) => {
          this.logger.info(`SCSS file changed: ${filePath}`);
          
          // If engine.scss changed, only recompile that file in SPA mode
          if (this.isSpaMode && filePath.includes('engine.scss')) {
            const engineSassFilePath = path.join(scssDir, 'engine.scss');
            this.assetProcessor.compileSass({
              sassFilePath: engineSassFilePath,
              outputName: 'engine',
              minify: this.options.minifyCss
            });
            return;
          }
          
          // Otherwise rebuild all markdown files
          this.buildAll();
        });
        
        // Watch JS files
        chokidar.watch(`${jsDir}/**/*.js`).on('change', (filePath: string) => {
          this.logger.info(`JavaScript file changed: ${filePath}`);
          
          // If engine.js changed in SPA mode, just copy it
          if (this.isSpaMode && filePath.includes('engine.js')) {
            const engineJsPath = path.join(jsDir, 'engine.js');
            if (fs.existsSync(engineJsPath)) {
              this.logger.info('Processing engine.js for SPA mode...');
              
              // Copy the engine.js to the assets directory
              const outputJsDir = path.join(process.cwd(), this.options.outputDir, 'assets/js');
              this.ensureDirectoryExists(outputJsDir);
              
              const outputEnginePath = path.join(outputJsDir, 'engine.js');
              fs.copyFileSync(engineJsPath, outputEnginePath);
              
              this.logger.info(`engine.js copied to: ${outputEnginePath}`);
            }
            return;
          }
          
          // Otherwise process JavaScript normally
          this.processJavaScript();
        });
        
        this.logger.success('Watching for changes. Press Ctrl+C to stop.');
      } catch (error) {
        this.logger.error('Chokidar is not available. Please install it with: npm install chokidar');
        throw error;
      }
    } catch (error) {
      this.logger.error('Error starting watch mode:', error);
      throw error;
    }
  }
  
  /**
   * Create a directory if it doesn't already exist
   */
  private ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logger.info(`Created directory: ${dirPath}`);
      }
    } catch (error) {
      this.logger.error(`Error creating directory: ${dirPath}`, error);
      throw error;
    }
  }
  
  /**
   * Clean the output directory when in SPA mode to remove individual HTML files
   * that are not needed in SPA mode
   */
  private cleanOutputDirectoryForSpa(): void {
    if (!this.isSpaMode) return;
    
    try {
      this.logger.info('SPA mode: Cleaning output directory of individual page files...');
      
      const outputDir = path.join(process.cwd(), this.options.outputDir);
      
      // Track how many files/directories were deleted
      let removedHtmlCount = 0;
      let removedDirCount = 0;
      
      const trackRemoval = (type: 'html' | 'dir') => {
        if (type === 'html') removedHtmlCount++;
        else removedDirCount++;
      };
      
      this.cleanDirectory(outputDir, true, trackRemoval);
      
      // Log summary of the cleaning
      this.logger.success(`Output directory cleaned for SPA mode: ${removedHtmlCount} HTML files and ${removedDirCount} directories removed`);
    } catch (error) {
      this.logger.error('Error cleaning output directory:', error);
    }
  }
  
  /**
   * Recursively clean a directory, removing HTML files (except index.html in the root)
   * and empty directories
   * @param dirPath The directory to clean
   * @param isRoot Whether this is the root output directory
   * @param onRemove Callback when a file or directory is removed
   * @returns Whether the directory is empty after cleaning
   */
  private cleanDirectory(
    dirPath: string, 
    isRoot: boolean = true,
    onRemove?: (type: 'html' | 'dir') => void
  ): boolean {
    if (!fs.existsSync(dirPath)) return true;
    
    let isEmpty = true;
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      // Skip essential directories that shouldn't be cleaned
      if (isRoot && ['assets', 'favicon', '.git'].includes(item)) {
        isEmpty = false;
        continue;
      }
      
      if (stat.isDirectory()) {
        // Recursively clean subdirectory and remove if empty
        const subdirEmpty = this.cleanDirectory(itemPath, false, onRemove);
        if (subdirEmpty) {
          this.logger.debug(`Removing empty directory: ${itemPath}`);
          fs.rmdirSync(itemPath);
          if (onRemove) onRemove('dir');
        } else {
          isEmpty = false;
        }
      } else {
        // Handle files
        const ext = path.extname(item);
        const fileName = path.basename(item);
        
        // Delete HTML files except root index.html
        if (ext === '.html' && !(isRoot && fileName === 'index.html')) {
          this.logger.debug(`Removing HTML file: ${itemPath}`);
          fs.unlinkSync(itemPath);
          if (onRemove) onRemove('html');
        } else {
          isEmpty = false;
        }
      }
    }
    
    return isEmpty;
  }
} 