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
  extractCritical?: boolean;
  moduleSplit?: boolean;
  purgeCss?: boolean;
  purgeCssContentPaths?: string[];
  mediaQueryGrouping?: boolean;
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
        extractComponents: false,
        extractCritical: false,
        moduleSplit: false,
        purgeCss: false,
        mediaQueryGrouping: false
      };
    } else {
      options = {
        ...optionsOrPath,
        minify: optionsOrPath.minify !== undefined ? optionsOrPath.minify : true,
        extractComponents: optionsOrPath.extractComponents !== undefined ? optionsOrPath.extractComponents : false,
        extractCritical: optionsOrPath.extractCritical !== undefined ? optionsOrPath.extractCritical : false,
        moduleSplit: optionsOrPath.moduleSplit !== undefined ? optionsOrPath.moduleSplit : false,
        purgeCss: optionsOrPath.purgeCss !== undefined ? optionsOrPath.purgeCss : false,
        mediaQueryGrouping: optionsOrPath.mediaQueryGrouping !== undefined ? optionsOrPath.mediaQueryGrouping : false
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
      
      // Extract component styles if enabled
      if (options.extractComponents) {
        this.extractComponentStyles(options.sassFilePath, options.minify);
        this.logger.info('Component styles extracted to separate files');
      }
      
      // Extract critical CSS if enabled
      if (options.extractCritical) {
        this.extractCriticalCss(css, options.outputName, options.minify);
        this.logger.info('Critical CSS extracted');
      }
      
      // Split by modules if enabled
      if (options.moduleSplit) {
        this.splitCssByModule(options.sassFilePath, options.minify);
        this.logger.info('CSS split by modules');
      }
      
      // Group media queries if enabled (reduces duplication)
      if (options.mediaQueryGrouping) {
        css = this.groupMediaQueries(css);
        this.logger.info('Media queries grouped');
      }
      
      // Apply PurgeCSS to remove unused selectors if enabled
      if (options.purgeCss) {
        css = this.purgeCss(css, options.purgeCssContentPaths);
        this.logger.info('Unused CSS purged');
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
          
          // Create a dynamic loader JavaScript file that can be used for on-demand component loading
          const jsLoaderPath = path.join(componentsOutputDir, `${outputName}.loader.js`);
          const jsLoaderContent = `
// Dynamic CSS loader for ${outputName} component
export function load${outputName.charAt(0).toUpperCase() + outputName.slice(1)}Styles() {
  if (document.querySelector('link[data-component="${outputName}"]')) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './assets/css/components/${outputName}.css';
    link.dataset.component = '${outputName}';
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load ${outputName} styles'));
    
    document.head.appendChild(link);
  });
}`;
          
          fs.writeFileSync(jsLoaderPath, jsLoaderContent);
          this.logger.info(`Component CSS written: ${outputName}.css with dynamic loader`);
        } catch (compError) {
          this.logger.error(`Error compiling component ${file}:`, compError);
          // Continue with other components
        }
      });
      
      // Create an index file that exports all component loaders
      const indexPath = path.join(componentsOutputDir, 'index.js');
      let indexContent = '// Auto-generated index of all component CSS loaders\n\n';
      
      componentFiles.forEach(file => {
        const componentName = file.replace('.scss', '');
        const exportName = `load${componentName.charAt(0).toUpperCase() + componentName.slice(1)}Styles`;
        indexContent += `export { ${exportName} } from './${componentName}.loader.js';\n`;
      });
      
      fs.writeFileSync(indexPath, indexContent);
      
      this.logger.success(`Component styles extracted to: ${componentsOutputDir} with dynamic loaders`);
    } catch (error) {
      this.logger.error('Error extracting component styles:', error);
      // Don't throw here, as this is an enhancement and shouldn't block the main compilation
    }
  }

  /**
   * Extracts critical CSS (above-the-fold styles) from the main CSS
   * @param css The main CSS content
   * @param baseName Base name for the output file
   * @param minify Whether to minify the output
   */
  private extractCriticalCss(css: string, baseName: string, minify: boolean = true): void {
    try {
      // This is a simplified implementation - in a real-world scenario, you would:
      // 1. Use a tool like critical or criticalCSS to extract above-the-fold CSS
      // 2. Analyze the HTML to determine what's visible without scrolling
      
      // For demonstration, we'll look for a special comment marker in the CSS
      // In real usage, you would implement proper critical path CSS extraction
      
      const criticalCssRegex = /\/\*\s*CRITICAL_START\s*\*\/([\s\S]*?)\/\*\s*CRITICAL_END\s*\*\//g;
      let criticalCss = '';
      let match;
      
      // Extract all sections marked as critical
      while ((match = criticalCssRegex.exec(css)) !== null) {
        criticalCss += match[1] + '\n';
      }
      
      if (!criticalCss) {
        // If no explicit critical markers, use a simplified heuristic:
        // Extract reset, typography, layout, and header styles as likely critical
        
        // This is just an example - real implementation would be more sophisticated
        const heuristicCriticalSelectors = [
          'html', 'body', 'h1', 'h2', 'h3', 'p', '.container', '.header', 
          '.nav', '.logo', '.main-header', '.hero',
          '@font-face'
        ];
        
        const cssLines = css.split('\n');
        let inCriticalBlock = false;
        let bracketCount = 0;
        
        for (const line of cssLines) {
          if (!inCriticalBlock) {
            // Check if line contains any of our critical selectors
            const hasCriticalSelector = heuristicCriticalSelectors.some(selector => 
              line.includes(selector) && line.includes('{')
            );
            
            if (hasCriticalSelector) {
              inCriticalBlock = true;
              bracketCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
              criticalCss += line + '\n';
            }
          } else {
            criticalCss += line + '\n';
            
            bracketCount += (line.match(/\{/g) || []).length;
            bracketCount -= (line.match(/\}/g) || []).length;
            
            if (bracketCount <= 0) {
              inCriticalBlock = false;
            }
          }
        }
      }
      
      if (criticalCss) {
        // Minify if needed
        if (minify) {
          const minifiedResult = csso.minify(criticalCss);
          criticalCss = minifiedResult.css;
        }
        
        // Write to critical CSS file
        const criticalOutputPath = this.resolveCssOutputPath(`${baseName.replace('.css', '')}.critical.css`);
        fs.writeFileSync(criticalOutputPath, criticalCss);
        
        // Create an inline version for easy embedding in HTML
        const inlineOutputPath = this.resolveCssOutputPath(`${baseName.replace('.css', '')}.critical.inline.css`);
        fs.writeFileSync(inlineOutputPath, criticalCss.replace(/\n/g, ' ').replace(/\s{2,}/g, ' '));
        
        this.logger.success(`Critical CSS extracted to: ${criticalOutputPath}`);
      } else {
        this.logger.info('No critical CSS was identified. Consider adding /* CRITICAL_START */ and /* CRITICAL_END */ markers to your CSS.');
      }
    } catch (error) {
      this.logger.error('Error extracting critical CSS:', error);
    }
  }
  
  /**
   * Splits CSS by module (sections/features of the site)
   * @param mainSassPath The main SASS file path
   * @param minify Whether to minify the output
   */
  private splitCssByModule(mainSassPath: string, minify: boolean = true): void {
    try {
      // Get the directory containing the main SASS file
      const sassDir = path.dirname(mainSassPath);
      
      // Look for a modules directory
      const modulesDir = path.join(sassDir, 'modules');
      
      if (!fs.existsSync(modulesDir)) {
        this.logger.info(`No modules directory found at ${modulesDir}, skipping module splitting`);
        return;
      }
      
      // Get all SCSS files in the modules directory
      const moduleFiles = fs.readdirSync(modulesDir)
        .filter(file => file.endsWith('.scss'));
        
      if (moduleFiles.length === 0) {
        this.logger.info('No module SCSS files found');
        return;
      }
      
      // Create a modules output directory
      const modulesOutputDir = path.join(this.cssOutputDir, 'modules');
      this.ensureOutputDirExists(modulesOutputDir);
      
      // Compile each module file
      this.logger.info(`Processing ${moduleFiles.length} module SCSS files`);
      
      const moduleImports: string[] = [];
      
      moduleFiles.forEach(file => {
        const modulePath = path.join(modulesDir, file);
        const moduleName = file.replace('.scss', '');
        const outputPath = path.join(modulesOutputDir, `${moduleName}.css`);
        
        try {
          // Compile the module
          const result = sass.compile(modulePath);
          let css = result.css;
          
          // Minify if needed
          if (minify) {
            const minifiedResult = csso.minify(css);
            css = minifiedResult.css;
          }
          
          // Write to output
          fs.writeFileSync(outputPath, css);
          
          // Add to imports for the loader
          moduleImports.push(moduleName);
          
          this.logger.info(`Module CSS written: ${moduleName}.css`);
        } catch (compError) {
          this.logger.error(`Error compiling module ${file}:`, compError);
          // Continue with other modules
        }
      });
      
      // Create a dynamic loader for modules
      const loaderPath = path.join(modulesOutputDir, 'module-loader.js');
      let loaderContent = `
// Auto-generated module CSS loader
const MODULES = ${JSON.stringify(moduleImports)};

/**
 * Dynamically load a module's CSS
 * @param {string} moduleName - The name of the module to load
 * @returns {Promise} - Resolves when the CSS is loaded
 */
export function loadModuleCSS(moduleName) {
  if (!MODULES.includes(moduleName)) {
    console.warn(\`Module \${moduleName} not found in available modules: \${MODULES.join(', ')}\`);
    return Promise.reject(new Error(\`Module \${moduleName} not found\`));
  }
  
  if (document.querySelector(\`link[data-module="\${moduleName}"]\`)) {
    return Promise.resolve(); // Already loaded
  }
  
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = \`./assets/css/modules/\${moduleName}.css\`;
    link.dataset.module = moduleName;
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(\`Failed to load \${moduleName} module styles\`));
    
    document.head.appendChild(link);
  });
}

/**
 * Load multiple module CSS files
 * @param {string[]} moduleNames - Array of module names to load
 * @returns {Promise} - Resolves when all modules are loaded
 */
export function loadModules(moduleNames) {
  return Promise.all(moduleNames.map(name => loadModuleCSS(name)));
}

/**
 * Lazy load modules based on element presence in the DOM
 * Call this function when you want to check for elements with data-module attributes
 * and load their corresponding CSS
 */
export function autoloadModules() {
  const moduleElements = document.querySelectorAll('[data-module]');
  const modulesToLoad = new Set();
  
  moduleElements.forEach(el => {
    const moduleNames = el.dataset.module.split(' ');
    moduleNames.forEach(name => modulesToLoad.add(name));
  });
  
  return loadModules(Array.from(modulesToLoad));
}

// Add a convenience method to load modules when the DOM is ready
export function autoloadModulesOnDOMContentLoaded() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoloadModules);
  } else {
    autoloadModules();
  }
  
  return true;
}
`;
      
      fs.writeFileSync(loaderPath, loaderContent);
      
      this.logger.success(`CSS split by modules to: ${modulesOutputDir} with dynamic loader`);
    } catch (error) {
      this.logger.error('Error splitting CSS by module:', error);
    }
  }
  
  /**
   * Groups media queries to reduce duplication
   * This is a simplified implementation - in production, you'd use a tool like clean-css
   * @param css The CSS content
   * @returns CSS with grouped media queries
   */
  private groupMediaQueries(css: string): string {
    try {
      // This is a simplified implementation
      // In a real-world scenario, you would use a proper CSS parser
      // and handle nesting, complex queries, etc.
      
      // For now, we'll use a regex-based approach for demonstration
      const mediaQueryPattern = /@media\s+([^{]+)\s*{([^@}]+)}/g;
      const mediaQueries: Record<string, string[]> = {};
      let match;
      
      // Extract all media queries
      while ((match = mediaQueryPattern.exec(css)) !== null) {
        const mediaQueryRule = match[1].trim();
        const content = match[2];
        
        if (!mediaQueries[mediaQueryRule]) {
          mediaQueries[mediaQueryRule] = [];
        }
        
        mediaQueries[mediaQueryRule].push(content);
      }
      
      // Remove media queries from original CSS
      let newCss = css.replace(mediaQueryPattern, '');
      
      // Add grouped media queries at the end
      for (const [rule, contents] of Object.entries(mediaQueries)) {
        newCss += `\n@media ${rule} {\n${contents.join('\n')}\n}\n`;
      }
      
      return newCss;
    } catch (error) {
      this.logger.error('Error grouping media queries:', error);
      return css; // Return original CSS if an error occurs
    }
  }
  
  /**
   * Purges unused CSS using content paths to determine what's needed
   * Note: This is a simplified implementation. In production, you'd use PurgeCSS library.
   * @param css The CSS content
   * @param contentPaths Paths to content files to analyze for used selectors
   * @returns Purged CSS
   */
  private purgeCss(css: string, contentPaths: string[] = []): string {
    try {
      if (!contentPaths || contentPaths.length === 0) {
        this.logger.warn('No content paths provided for PurgeCSS, skipping');
        return css;
      }
      
      // Check if PurgeCSS is available
      try {
        const { PurgeCSS } = require('purgecss');
        
        this.logger.info('Using PurgeCSS to remove unused selectors');
        
        const result = new PurgeCSS().purge({
          content: contentPaths,
          css: [{ raw: css }],
          safelist: ['html', 'body', 'active', 'disabled', 'focus', 'hover'],
        });
        
        if (result.length > 0 && result[0].css) {
          const originalSize = css.length;
          const purgedSize = result[0].css.length;
          const percentage = Math.round((purgedSize / originalSize) * 100);
          
          this.logger.info(
            `Original CSS size: ${originalSize} bytes, Purged size: ${purgedSize} bytes (${percentage}% of original)`
          );
          
          return result[0].css;
        }
        
        return css;
      } catch (purgeError) {
        this.logger.warn('PurgeCSS is not available. To enable PurgeCSS, install it: npm install purgecss');
        return css;
      }
    } catch (error) {
      this.logger.error('Error purging CSS:', error);
      return css; // Return original CSS if an error occurs
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