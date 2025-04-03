import * as fs from 'fs';
import * as sass from 'sass';
import * as csso from 'csso';
import { Logger } from '@lib/core/Logger';

/**
 * AssetProcessor - Handles processing of assets like SCSS
 */
export class AssetProcessor {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
    this.logger.logLevel('debug', 'AssetProcessor initialized');
  }
  
  compileSass(sassFilePath: string, outputCssPath: string, minify: boolean = true): void {
    this.logger.info(`Compiling SASS file: ${sassFilePath}`);
    
    try {
      const result = sass.compile(sassFilePath);
      let css = result.css;
      
      // Minify CSS if enabled
      if (minify) {
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
} 