#!/usr/bin/env node
/// <reference types="node" />

import { Generator } from './lib/Generator';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { parseArgs } from './utils/parseArgs';

// Use require for browser-sync since it's a CommonJS module
const browserSync = require('browser-sync');

/**
 * Development server for Epito.me
 * Watches for changes in markdown, templates, and SCSS files
 * Runs the generator when changes are detected
 * Serves the output directory with live reload
 */

// Parse command line arguments
const options = parseArgs(process.argv.slice(2));

// Enable debug by default in dev mode
options.debug = true;

// Paths (resolved)
const cwd = process.cwd();
const outputDir = path.resolve(cwd, options.outputDir || './public');
const mdDir = path.resolve(cwd, options.mdDir || './md');
const templatesDir = path.resolve(cwd, options.templatesDir || './src/templates');
const scssDir = path.resolve(cwd, options.scssDir || './src/scss');

// Create the generator with debug enabled
const generator = new Generator({
  outputDir: options.outputDir,
  mdDir: options.mdDir,
  templatesDir: options.templatesDir,
  scssDir: options.scssDir,
  debug: true
});

// Initialize BrowserSync
const bs = browserSync.create();

// Start BrowserSync server
bs.init({
  server: outputDir,
  watch: true,
  notify: true,
  open: true,
  ui: false
});

// Function to ensure the output directory exists
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Function to build the site
function buildSite(mdFile: string = 'page.md'): void {
  try {
    ensureDirectoryExists(outputDir);
    console.log(`Building site from ${mdFile}...`);
    generator.build(mdFile, 'index.html');
    console.log('✅ Build completed successfully!');
    
    // Reload the browser
    bs.reload();
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

// Initial build
buildSite(options.page || 'page.md');

// Watch for file changes
console.log('👀 Watching for file changes...');
console.log(`  - Markdown: ${mdDir}`);
console.log(`  - Templates: ${templatesDir}`);
console.log(`  - SCSS: ${scssDir}`);

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
watcher.on('change', (filePath) => {
  console.log(`File changed: ${filePath}`);
  
  // Determine which file changed and build accordingly
  if (filePath.endsWith('.md')) {
    const mdFile = path.basename(filePath);
    buildSite(mdFile);
  } else {
    // For template or SCSS changes, rebuild with the default or specified page
    buildSite(options.page || 'page.md');
  }
});

// Log server information
console.log(`
🚀 Development server started!
📁 Serving files from: ${outputDir}
💻 Local: http://localhost:3000
⚡ Live reload is enabled
Press Ctrl+C to stop
`); 