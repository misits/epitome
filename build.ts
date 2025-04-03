/// <reference types="node" />

import { Generator } from './src/lib/Generator';

/**
 * Main build script that generates a static CV site
 * from markdown with frontmatter
 */

try {
  // Create generator with default paths
  const generator = new Generator({
    debug: true,
    outputDir: './public',
    mdDir: './md',
    templatesDir: './src/templates',
    scssDir: './src/scss'
  });
  
  // Run the build process with the default profile.md file
  generator.build();
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}