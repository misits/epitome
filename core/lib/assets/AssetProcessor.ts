import * as fs from 'fs';
import * as sass from 'sass';
import * as csso from 'csso';
import * as path from 'path';
import { Logger } from '@lib/core/Logger';

interface JsBundleOptions {
  entryPoint: string;
  outputName?: string;
  minify?: boolean;
  splitting?: boolean;
  formats?: ('esm' | 'cjs' | 'iife')[];
}

interface SassCompileOptions {
  sassFilePath: string;
  outputName: string;
  minify?: boolean;
  extractComponents?: boolean;
}

/**
 * AssetProcessor - Handles processing of assets like SCSS and JavaScript
 */
export class AssetProcessor {
  private logger: Logger;
  private cssOutputDir: string = 'public/assets/css';
  private jsOutputDir: string = 'public/assets/js';
  
  constructor(logger: Logger, cssOutputDir?: string, jsOutputDir?: string) {
    this.logger = logger;
    if (cssOutputDir) {
      this.cssOutputDir = cssOutputDir;
    }
    if (jsOutputDir) {
      this.jsOutputDir = jsOutputDir;
    }
    this.logger.logLevel('debug', 'AssetProcessor initialized');
  }
  
  /**
   * Ensures the specified output directory exists
   * @private
   * @param outputDir The directory to ensure exists
   */
  private ensureOutputDirExists(outputDir: string): void {
    const fullPath = path.resolve(process.cwd(), outputDir);
    if (!fs.existsSync(fullPath)) {
      this.logger.info(`Creating output directory: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Resolves the output path for a CSS file
   * @param outputName - The name of the output file (with or without .css extension)
   * @returns The full path to the output CSS file
   */
  resolveCssOutputPath(outputName: string): string {
    const baseName = outputName.endsWith('.css') ? outputName : `${outputName}.css`;
    return path.resolve(process.cwd(), this.cssOutputDir, baseName);
  }
  
  /**
   * Resolves the output path for a JavaScript file
   * @param outputName - The name of the output file (with or without .js extension)
   * @returns The full path to the output JS file
   */
  resolveJsOutputPath(outputName: string): string {
    const baseName = outputName.endsWith('.js') ? outputName : `${outputName}.js`;
    return path.resolve(process.cwd(), this.jsOutputDir, baseName);
  }
  
  /**
   * Compiles SCSS to CSS with enhanced options
   * @param options Compilation options
   */
  compileSass(options: SassCompileOptions): void;
  compileSass(sassFilePath: string, outputName: string, minify?: boolean): void;
  compileSass(optionsOrPath: SassCompileOptions | string, outputName?: string, minify: boolean = true): void {
    // Handle overloaded method signatures
    let options: SassCompileOptions;
    
    if (typeof optionsOrPath === 'string') {
      options = {
        sassFilePath: optionsOrPath,
        outputName: outputName || 'style',
        minify: minify,
        extractComponents: false
      };
    } else {
      options = {
        ...optionsOrPath,
        minify: optionsOrPath.minify !== undefined ? optionsOrPath.minify : true,
        extractComponents: optionsOrPath.extractComponents !== undefined ? optionsOrPath.extractComponents : false
      };
    }
    
    this.logger.info(`Compiling SASS file: ${options.sassFilePath}`);
    
    try {
      // Ensure output directory exists
      this.ensureOutputDirExists(this.cssOutputDir);
      
      // Resolve the full output path
      const outputCssPath = this.resolveCssOutputPath(options.outputName);
      
      const result = sass.compile(options.sassFilePath);
      let css = result.css;
      
      // If we want to extract component CSS
      if (options.extractComponents) {
        this.extractComponentStyles(options.sassFilePath, options.minify);
        this.logger.info('Component styles extracted to separate files');
      }
      
      // Minify CSS if enabled
      if (options.minify) {
        this.logger.info('Minifying CSS...');
        const minifiedResult = csso.minify(css);
        css = minifiedResult.css;
        
        const originalSize = result.css.length;
        const minifiedSize = css.length;
        const percentage = Math.round((minifiedSize / originalSize) * 100);
        
        this.logger.info(
          `Original size: ${originalSize} bytes, Minified size: ${minifiedSize} bytes (${percentage}% of original)`
        );
      }
      
      fs.writeFileSync(outputCssPath, css);
      this.logger.success(`CSS written to: ${outputCssPath}`);
    } catch (error) {
      this.logger.error(`Error compiling SASS:`, error);
      throw error;
    }
  }
  
  /**
   * Extracts component styles from a directory into separate CSS files
   * @param mainSassPath The main SASS file path
   * @param minify Whether to minify the output CSS
   */
  extractComponentStyles(mainSassPath: string, minify: boolean = true): void {
    try {
      // Get the directory containing the main SASS file
      const sassDir = path.dirname(mainSassPath);
      
      // Look for a components directory
      const componentsDir = path.join(sassDir, 'components');
      
      if (!fs.existsSync(componentsDir)) {
        this.logger.info(`No components directory found at ${componentsDir}, skipping component extraction`);
        return;
      }
      
      // Get all SCSS files in the components directory
      const componentFiles = fs.readdirSync(componentsDir)
        .filter(file => file.endsWith('.scss'));
        
      if (componentFiles.length === 0) {
        this.logger.info('No component SCSS files found');
        return;
      }
      
      // Create a components output directory
      const componentsOutputDir = path.join(this.cssOutputDir, 'components');
      this.ensureOutputDirExists(componentsOutputDir);
      
      // Compile each component file
      this.logger.info(`Processing ${componentFiles.length} component SCSS files`);
      
      componentFiles.forEach(file => {
        const componentPath = path.join(componentsDir, file);
        const outputName = file.replace('.scss', '');
        const outputPath = path.join(componentsOutputDir, `${outputName}.css`);
        
        try {
          // Compile the component
          const result = sass.compile(componentPath);
          let css = result.css;
          
          // Minify if needed
          if (minify) {
            const minifiedResult = csso.minify(css);
            css = minifiedResult.css;
          }
          
          // Write to output
          fs.writeFileSync(outputPath, css);
          this.logger.info(`Component CSS written: ${outputName}.css`);
        } catch (compError) {
          this.logger.error(`Error compiling component ${file}:`, compError);
          // Continue with other components
        }
      });
      
      this.logger.success(`Component styles extracted to: ${componentsOutputDir}`);
    } catch (error) {
      this.logger.error('Error extracting component styles:', error);
      // Don't throw here, as this is an enhancement and shouldn't block the main compilation
    }
  }

  /**
   * Bundles JavaScript files with support for code splitting
   * @param options Bundle options
   */
  bundleJs(options: JsBundleOptions): void;
  bundleJs(entryPoint: string, outputName?: string, minify?: boolean): void;
  bundleJs(optionsOrEntryPoint: JsBundleOptions | string, outputName: string = 'main', minify: boolean = true): void {
    // Handle overloaded method signatures
    let options: Required<JsBundleOptions>;
    
    if (typeof optionsOrEntryPoint === 'string') {
      options = {
        entryPoint: optionsOrEntryPoint,
        outputName: outputName,
        minify: minify,
        splitting: false,
        formats: ['esm']
      };
    } else {
      options = {
        entryPoint: optionsOrEntryPoint.entryPoint,
        outputName: optionsOrEntryPoint.outputName || 'main',
        minify: optionsOrEntryPoint.minify !== undefined ? optionsOrEntryPoint.minify : true,
        splitting: optionsOrEntryPoint.splitting !== undefined ? optionsOrEntryPoint.splitting : false,
        formats: optionsOrEntryPoint.formats || ['esm']
      };
    }
    
    this.logger.info(`Bundling JavaScript from entry point: ${options.entryPoint}`);
    
    try {
      // Ensure output directory exists
      this.ensureOutputDirExists(this.jsOutputDir);
      
      // Try to use esbuild for bundling
      try {
        const esbuild = require('esbuild');
        
        this.logger.info(`Using esbuild for JavaScript bundling${options.splitting ? ' with code splitting' : ''}`);
        
        // Determine output structure based on code splitting
        const outfile = options.splitting 
          ? undefined 
          : this.resolveJsOutputPath(options.outputName);
        
        const outdir = options.splitting 
          ? path.resolve(process.cwd(), this.jsOutputDir) 
          : undefined;
        
        // Build with dynamic imports and code splitting if enabled
        esbuild.buildSync({
          entryPoints: [options.entryPoint],
          bundle: true,
          minify: options.minify,
          outfile: outfile,
          outdir: outdir,
          format: options.formats[0], // Use the first format by default
          splitting: options.splitting,
          chunkNames: options.splitting ? 'chunks/[name]-[hash]' : undefined,
          target: ['es2020'],
          metafile: true
        });
        
        // If multiple formats are requested, build each format separately
        if (options.formats.length > 1 && !options.splitting) {
          options.formats.slice(1).forEach(format => {
            const formatSuffix = format === 'esm' ? '.esm' : format === 'cjs' ? '.cjs' : '.iife';
            const formatOutfile = options.outputName.replace('.js', '') + formatSuffix + '.js';
            
            esbuild.buildSync({
              entryPoints: [options.entryPoint],
              bundle: true,
              minify: options.minify,
              outfile: this.resolveJsOutputPath(formatOutfile),
              format: format,
              target: ['es2020']
            });
            
            this.logger.info(`Additional format built: ${format}`);
          });
        }
        
        const message = options.splitting
          ? `JavaScript bundled with code splitting to: ${this.jsOutputDir}`
          : `JavaScript bundled and written to: ${outfile || 'default location'}`;
        
        this.logger.success(message);
      } catch (esbuildError) {
        this.logger.error('Error bundling JavaScript: esbuild is required for bundling');
        this.logger.info('To enable bundling, install esbuild: npm install esbuild');
        throw new Error('esbuild is required for JavaScript bundling');
      }
    } catch (error) {
      this.logger.error(`Error bundling JavaScript:`, error);
      throw error;
    }
  }
  
  /**
   * Compiles a single JavaScript file (without bundling dependencies)
   * Use this only when you need a standalone file without processing imports
   * @param jsFilePath Path to the JavaScript file
   * @param outputName Name for the output JS file
   * @param minify Whether to minify the JS output
   */
  compileJs(jsFilePath: string, outputName: string, minify: boolean = true): void {
    this.logger.info(`Processing standalone JavaScript file: ${jsFilePath}`);
    
    try {
      // Ensure output directory exists
      this.ensureOutputDirExists(this.jsOutputDir);
      
      // Resolve the full output path
      const outputJsPath = this.resolveJsOutputPath(outputName);
      
      // Try to use esbuild for minification if enabled
      if (minify) {
        try {
          const esbuild = require('esbuild');
          
          this.logger.info('Using esbuild for JavaScript minification');
          
          esbuild.buildSync({
            entryPoints: [jsFilePath],
            bundle: false, // Just minify, don't bundle
            minify: true,
            outfile: outputJsPath,
          });
          
          this.logger.success(`JavaScript minified and written to: ${outputJsPath}`);
          return;
        } catch (esbuildError) {
          this.logger.info('esbuild not available, falling back to simple file copying');
          this.logger.info('To enable minification, install esbuild: npm install esbuild');
        }
      }
      
      // Fallback to simple file copying
      const jsContent = fs.readFileSync(jsFilePath, 'utf8');
      fs.writeFileSync(outputJsPath, jsContent);
      
      this.logger.success(`JavaScript copied to: ${outputJsPath}`);
    } catch (error) {
      this.logger.error(`Error processing JavaScript:`, error);
      throw error;
    }
  }
} 