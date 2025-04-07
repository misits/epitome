import { Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

/**
 * Plugin to handle directory URLs with and without trailing slashes
 * Makes both /demo and /demo/ work by rewriting requests to serve the appropriate index.html
 */
export function handleDirectoryUrls(): Plugin {
  return {
    name: 'handle-directory-urls',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Get the URL path
        const url = req.url || '/';
        
        // Check if it's a direct request for a directory without trailing slash (like /demo)
        if (!url.endsWith('/') && !url.includes('.')) {
          // Check if there's an index.html in this path
          const fsPath = resolve(process.cwd(), 'public', url.slice(1));
          try {
            // If it's a directory, serve the index.html from it
            if (fs.statSync(fsPath).isDirectory()) {
              req.url = `${url}/index.html`;
            }
          } catch (e) {
            // If path doesn't exist, continue with normal processing
          }
        }
        
        next();
      });
    }
  };
} 