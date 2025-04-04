import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base public path - can be changed for deployment to subdirectories
  base: './',
  
  // Configure build options
  build: {
    outDir: 'public',
    emptyOutDir: false, // Don't empty outDir since we have our own generator
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html')
      }
    }
  },
  
  // Specify the public directory as both the root and publicDir
  // This will ensure Vite serves files directly from this directory
  root: './public',
  
  // Public directory that contains the static assets
  publicDir: 'public',
  
  // Resolve aliases for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'core'),
      '@lib': resolve(__dirname, 'core/lib'),
      '@types': resolve(__dirname, 'core/types'),
      '@utils': resolve(__dirname, 'core/utils')
    },
  },
  
  // Server options
  server: {
    port: 3000,
    host: "0.0.0.0",
    open: false, // Disable automatic browser opening
    watch: {
      usePolling: false,
    },
  },
});
