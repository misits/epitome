#!/usr/bin/env node
/// <reference types="node" />

import { Generator } from '../lib';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { parseArgs } from '../utils/parseArgs';
import { createServer } from 'vite';

/**
 * Development server for Epito.me
 * Watches for changes in markdown, templates, and SCSS files
 * Runs the generator when changes are detected
 * Serves the output directory with Vite for fast reloading
 */

// Parse command line arguments
const options = parseArgs(process.argv.slice(2));

// Enable debug by default in dev mode
options.debug = true;

// Check if build all mode is disabled (single file mode)
const singleFileMode = process.argv.includes('--single-file') || process.argv.includes('-s');

// Paths (resolved)
const cwd = process.cwd();
const outputDir = path.resolve(cwd, options.outputDir || './public');
const mdDir = path.resolve(cwd, options.mdDir || './src/md');
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

// Function to ensure the output directory exists
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Function to build a single file
function buildSite(mdFile: string = 'index.md'): void {
  try {
    ensureDirectoryExists(outputDir);
    console.log(`Building site from ${mdFile}...`);
    
    // Special case for index.md
    if (mdFile === 'index.md') {
      generator.build(mdFile, 'index.html');
    } else {
      // For other files, create a folder structure
      const pageName = mdFile.replace('.md', '');
      const folderPath = path.join(outputDir, pageName);
      
      // Create the directory if it doesn't exist
      ensureDirectoryExists(folderPath);
      
      // Build the file as index.html inside the folder
      generator.build(mdFile, `${pageName}/index.html`);
    }
    
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

// Function to build all markdown files
function buildAllSites(): void {
  try {
    ensureDirectoryExists(outputDir);
    console.log('Building all markdown files...');
    generator.buildAll();
    console.log('✅ Build of all files completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
  }
}

// Initial build - build all files by default, or just one if in single file mode
if (singleFileMode) {
  console.log('🔍 Single file mode: building only the specified or default page');
  buildSite(options.page || 'index.md');
} else {
  console.log('🏗️ Building all markdown files...');
  buildAllSites();
}

// Watch for file changes
console.log('👀 Watching for file changes...');
console.log(`  - Markdown: ${mdDir}`);
console.log(`  - Templates: ${templatesDir}`);
console.log(`  - SCSS: ${scssDir}`);

// Start Vite dev server
async function startDevServer() {
  const server = await createServer({
    // Use Vite config from file but override some options
    configFile: path.resolve(cwd, 'vite.config.ts'),
    root: outputDir, // Set the output directory as the root
    server: {
      port: 3000,
      host: "0.0.0.0",
      open: false,
      watch: {
        // Don't let Vite handle these, we'll do it ourselves
        ignored: [
          path.join(mdDir, '**/*.md'),
          path.join(templatesDir, '**/*.html'),
          path.join(scssDir, '**/*.scss')
        ],
      }
    }
  });
  
  await server.listen();
  server.printUrls();
  
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
  watcher.on('change', async (filePath) => {
    console.log(`File changed: ${filePath}`);
    
    // Determine which file changed and build accordingly
    if (filePath.endsWith('.md')) {
      if (singleFileMode) {
        // In single file mode, only rebuild the changed file
        const mdFile = path.basename(filePath);
        buildSite(mdFile);
      } else {
        // In build all mode, rebuild all files when any markdown changes
        // This ensures consistent site-wide changes
        buildAllSites();
      }
    } else if (filePath.endsWith('.html') || filePath.endsWith('.scss')) {
      // For template or SCSS changes, rebuild all files since these affect the entire site
      if (singleFileMode) {
        // In single file mode, only rebuild the specified or default page
        buildSite(options.page || 'index.md');
      } else {
        // In build all mode, rebuild all files
        buildAllSites();
      }
    }
    
    // Reload browser using Vite's HMR API
    if (server.ws) {
      server.ws.send({
        type: 'full-reload',
        path: '*'
      });
    }
  });
  
  // Handle file deletions
  watcher.on('unlink', (filePath) => {
    // Only handle markdown file deletions
    if (filePath.endsWith('.md')) {
      console.log(`File deleted: ${filePath}`);
      
      // Get the base filename without extension
      const mdFile = path.basename(filePath);
      const pageName = mdFile.replace('.md', '');
      
      // Determine the path to remove from the public folder
      let pathToRemove;
      if (mdFile === 'index.md') {
        pathToRemove = path.join(outputDir, 'index.html');
      } else {
        pathToRemove = path.join(outputDir, pageName);
      }
      
      // Remove the file or directory
      if (fs.existsSync(pathToRemove)) {
        if (fs.statSync(pathToRemove).isDirectory()) {
          // Remove directory recursively
          console.log(`Removing directory: ${pathToRemove}`);
          fs.rmSync(pathToRemove, { recursive: true, force: true });
        } else {
          // Remove file
          console.log(`Removing file: ${pathToRemove}`);
          fs.unlinkSync(pathToRemove);
        }
        console.log(`✅ Removed ${pathToRemove}`);
        
        // Reload browser using Vite's HMR API
        if (server.ws) {
          server.ws.send({
            type: 'full-reload',
            path: '*'
          });
        }
      }
    }
  });
  
  console.log(`
🚀 Development server started!
📁 Serving files from: ${outputDir}
⚡ HMR enabled
${singleFileMode ? '📄 Single file mode: Only building ' + (options.page || 'index.md') : '📚 Building all markdown files'}
Press Ctrl+C to stop
  `);
}

// Start the development server
startDevServer().catch((err) => {
  // If the error is related to browser opening, we can safely ignore it
  if (err.message && err.message.includes('spawn') && 
     (err.message.includes('ENOENT') || err.message.includes('xdg-open'))) {
    console.warn('Warning: Could not open browser automatically. Please open http://localhost:3000 manually.');
    // Continue execution despite the browser error
  } else {
    // For other errors, log and exit
    console.error('Failed to start dev server:', err);
    process.exit(1);
  }
}); 