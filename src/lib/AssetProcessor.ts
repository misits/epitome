import * as fs from 'fs';
import * as sass from 'sass';
import { Logger } from './Logger';

/**
 * AssetProcessor - Handles processing of assets like SCSS
 */
export class AssetProcessor {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
  
  compileSass(sassFilePath: string, outputCssPath: string): void {
    this.logger.log(`Compiling SASS file: ${sassFilePath}`);
    
    try {
      const result = sass.compile(sassFilePath);
      fs.writeFileSync(outputCssPath, result.css);
      this.logger.log(`CSS written to: ${outputCssPath}`);
    } catch (error) {
      this.logger.error(`Error compiling SASS: ${error}`);
      throw error;
    }
  }
} 