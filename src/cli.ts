#!/usr/bin/env node
/// <reference types="node" />

import { Generator } from './lib/Generator';
import * as path from 'path';
import { parseArgs } from './utils/parseArgs';
import { spawn } from 'child_process';

/**
 * CLI for Epito.me static CV generator
 * Usage: epitome [options]
 * 
 * Options:
 *  --page, -p <file>     Profile markdown file (default: profile.md)
 *  --output, -o <dir>       Output directory (default: ./public)
 *  --md-dir <dir>           Markdown files directory (default: ./md)
 *  --templates-dir <dir>    Templates directory (default: ./src/templates)
 *  --scss-dir <dir>         SCSS directory (default: ./src/scss)
 *  --debug, -d              Enable debug output
 *  --debug-level <level>    Enable specific debug level(s), comma separated
 *  --dev                    Start development server with live reload
 *  --help, -h               Show this help
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = parseArgs(args);

// Show help
if (options.help) {
  console.log(`
Epito.me - Static CV Generator

Usage: epitome [options]

Options:
  --page, -p <file>         Page markdown file (default: index.md)
  --output, -o <dir>       Output directory (default: ./public)
  --md-dir <dir>           Markdown files directory (default: ./md)
  --templates-dir <dir>    Templates directory (default: ./src/templates)
  --scss-dir <dir>         SCSS directory (default: ./src/scss)
  --debug, -d              Enable debug output
  --debug-level <level>    Enable specific debug level(s), comma separated (e.g. template,data,parse)
  --dev                    Start development server with live reload
  --help, -h               Show this help
  `);
  process.exit(0);
}

// Check if dev mode is requested
if (args.includes('--dev')) {
  // Launch dev server
  console.log('Starting development server...');
  
  // Create arguments array for dev process
  const devArgs = ['src/dev.ts'];
  
  // Pass through all other arguments except --dev
  args.forEach(arg => {
    if (arg !== '--dev') {
      devArgs.push(arg);
    }
  });
  
  // Spawn the dev process
  const devProcess = spawn('ts-node', devArgs, {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process exit
  devProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Development server exited with code ${code}`);
      process.exit(code || 1);
    }
  });
  
  // Forward signals to child process
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      if (!devProcess.killed) {
        devProcess.kill(signal as NodeJS.Signals);
      }
    });
  });
} else {
  // Run the build
  try {
    // Create generator with options
    const generator = new Generator({
      outputDir: options.outputDir,
      mdDir: options.mdDir,
      templatesDir: options.templatesDir,
      scssDir: options.scssDir,
      debug: options.debug
    });
    
    // Enable specific debug levels if provided - BUT only if Generator has this method
    if (options.debug && options.debugLevels && options.debugLevels.length > 0) {
      if (typeof generator.enableDebugLevels === 'function') {
        generator.enableDebugLevels(options.debugLevels);
      } else {
        // Fallback for older Generator versions
        console.log(`Debug levels enabled: ${options.debugLevels.join(', ')}`);
      }
    }
    
    // Build with specified profile file or default
    generator.build(options.page || 'index.md');
    
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}