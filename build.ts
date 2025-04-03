/// <reference types="node" />

import { Generator } from './src/lib/Generator';

/**
 * Main build script that generates a static CV site
 * from markdown with frontmatter
 */

// Check if watch mode is enabled
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');

// Check if specific files mode is enabled (for debugging)
const isSpecificFilesMode = process.argv.includes('--specific') || process.argv.includes('-s');

// Check if CSS minification should be disabled
const disableMinify = process.argv.includes('--no-minify');

try {
  // Create generator with default paths
  const generator = new Generator({
    debug: true,
    outputDir: './public',
    mdDir: './md',
    templatesDir: './src/templates',
    scssDir: './src/scss',
    minifyCss: !disableMinify
  });
  
  if (isWatchMode) {
    console.log('🔄 Starting watch mode...');
    // Watch for file changes and rebuild automatically
    generator.watch();
  } else if (isSpecificFilesMode) {
    console.log('🔨 Building specific files (about.md and projects.md)...');
    // Build specific files for debugging
    generator.buildSpecificFiles();
  } else {
    // Build all markdown files in the md directory
    generator.buildAll();
    console.log('✅ Build completed successfully!');
  }
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}