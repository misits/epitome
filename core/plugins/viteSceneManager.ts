/**
 * Vite Scene Manager Plugin
 * Provides a server middleware API for managing scene files
 */

import * as fs from 'fs';
import * as path from 'path';
import { Plugin } from 'vite';
import matter from 'gray-matter';

// Types
interface SceneData {
  id: string;
  [key: string]: any;
}

interface SceneSaveRequest {
  sceneId: string;
  scene: SceneData;
}

interface ScenePluginOptions {
  mdDir?: string;        // Directory for markdown files
  outputDir?: string;    // Output directory for compiled files
  jsonOutputPath?: string; // Path to scenes.json output
}

/**
 * Create a Vite plugin that adds API endpoints for scene management
 */
export function viteSceneManager(options: ScenePluginOptions = {}): Plugin {
  // Default directories
  const mdDir = options.mdDir || 'src/md';
  const outputDir = options.outputDir || 'public';
  const jsonOutputPath = options.jsonOutputPath || path.join(outputDir, 'assets/data/scenes.json');
  
  // Resolved paths
  let resolvedMdDir: string;
  let resolvedJsonOutput: string;
  
  return {
    name: 'vite-plugin-scene-manager',
    
    configureServer(server) {
      // Resolve paths using server.config.root
      resolvedMdDir = path.resolve(server.config.root, '..', mdDir);
      resolvedJsonOutput = path.resolve(server.config.root, '..', jsonOutputPath);
      
      // Ensure directories exist
      ensureDirectoryExists(resolvedMdDir);
      ensureDirectoryExists(path.dirname(resolvedJsonOutput));
      
      console.log('Scene Manager Plugin initialized with:');
      console.log('- Markdown Directory:', resolvedMdDir);
      console.log('- JSON Output:', resolvedJsonOutput);
      
      // Add middleware for API endpoints
      server.middlewares.use('/api/scenes', (req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost');
        const pathname = url.pathname;
        
        // Handle different endpoints
        try {
          if (req.method === 'GET' && pathname === '/') {
            // GET /api/scenes - list all scenes
            handleListScenes(req, res);
          } else if (req.method === 'GET' && pathname.startsWith('/')) {
            // GET /api/scenes/:id - get a specific scene
            const sceneId = pathname.slice(1);
            handleGetScene(req, res, sceneId);
          } else if (req.method === 'POST' && pathname === '/save') {
            // POST /api/scenes/save - save a scene
            handleSaveScene(req, res);
          } else if (req.method === 'POST' && pathname === '/save-frontmatter') {
            // POST /api/scenes/save-frontmatter - save only frontmatter without modifying content
            handleSaveFrontmatter(req, res);
          } else if (req.method === 'DELETE' && pathname.startsWith('/')) {
            // DELETE /api/scenes/:id - delete a scene
            const sceneId = pathname.slice(1);
            handleDeleteScene(req, res, sceneId);
          } else {
            next();
          }
        } catch (error: any) {
          console.error('Error handling scene API request:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
          }));
        }
      });
      
      // ----- Handler Functions -----
      
      // List all scenes
      function handleListScenes(req: any, res: any) {
        try {
          const sceneFiles = getSceneFiles(resolvedMdDir);
          sendJsonResponse(res, {
            success: true,
            scenes: sceneFiles
          });
        } catch (error: any) {
          sendErrorResponse(res, 500, error.message || 'Failed to list scenes');
        }
      }
      
      // Get a specific scene
      function handleGetScene(req: any, res: any, sceneId: string) {
        try {
          const scenePath = findSceneFile(resolvedMdDir, sceneId);
          
          if (!scenePath) {
            return sendErrorResponse(res, 404, `Scene with ID "${sceneId}" not found`);
          }
          
          const fileContent = fs.readFileSync(scenePath, 'utf8');
          const parsedFile = matter(fileContent);
          
          sendJsonResponse(res, {
            success: true,
            scene: {
              id: sceneId,
              ...parsedFile.data,
              content: parsedFile.content
            }
          });
        } catch (error: any) {
          sendErrorResponse(res, 500, error.message || 'Failed to get scene');
        }
      }
      
      // Save a scene
      function handleSaveScene(req: any, res: any) {
        // Need to manually parse the request body
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            // Parse the JSON body
            const { sceneId, scene } = JSON.parse(body) as SceneSaveRequest;
            
            if (!sceneId) {
              return sendErrorResponse(res, 400, 'Scene ID is required');
            }
            
            if (!scene) {
              return sendErrorResponse(res, 400, 'Scene data is required');
            }
            
            // Find the scene file or create a new one
            let scenePath = findSceneFile(resolvedMdDir, sceneId);
            let isNewFile = false;
            
            if (!scenePath) {
              // This is a new scene, create a new file
              scenePath = path.join(resolvedMdDir, `${sceneId}.md`);
              isNewFile = true;
            }
            
            // Convert scene object to frontmatter and content
            const content = scene.content || scene.html || '';
            
            // Remove content and html fields from frontmatter
            const frontmatter = { ...scene };
            delete frontmatter.content;
            delete frontmatter.html;
            
            // Create markdown with frontmatter
            const markdown = matter.stringify(content, frontmatter);
            
            // Write to file
            fs.writeFileSync(scenePath, markdown, 'utf8');
            
            // Always update scenes.json when saving a markdown file
            // This ensures scenes.json is always in sync with the markdown files
            updateScenesJson(resolvedJsonOutput, scene);
            
            // Return success response
            sendJsonResponse(res, {
              success: true,
              filename: path.basename(scenePath),
              path: scenePath
            });
          } catch (error: any) {
            sendErrorResponse(res, 500, error.message || 'Failed to save scene');
          }
        });
      }
      
      // Save only frontmatter (preserving existing content)
      function handleSaveFrontmatter(req: any, res: any) {
        // Need to manually parse the request body
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            // Parse the JSON body
            const { sceneId, frontmatter } = JSON.parse(body);
            
            if (!sceneId) {
              return sendErrorResponse(res, 400, 'Scene ID is required');
            }
            
            if (!frontmatter) {
              return sendErrorResponse(res, 400, 'Frontmatter data is required');
            }
            
            // Find the scene file
            const scenePath = findSceneFile(resolvedMdDir, sceneId);
            
            if (!scenePath) {
              return sendErrorResponse(res, 404, `Scene with ID "${sceneId}" not found`);
            }
            
            // Read the current file to preserve its content
            const fileContent = fs.readFileSync(scenePath, 'utf8');
            const parsedFile = matter(fileContent);
            const existingContent = parsedFile.content;
            
            // Create markdown with new frontmatter but existing content
            const markdown = matter.stringify(existingContent, frontmatter);
            
            // Write to file
            fs.writeFileSync(scenePath, markdown, 'utf8');
            
            // Create the scene object for scenes.json update
            const scene = {
              ...frontmatter,
              id: sceneId,
              content: existingContent,
              html: existingContent // For backward compatibility
            };
            
            // Always update scenes.json
            updateScenesJson(resolvedJsonOutput, scene);
            
            // Return success response
            sendJsonResponse(res, {
              success: true,
              filename: path.basename(scenePath),
              path: scenePath
            });
          } catch (error: any) {
            sendErrorResponse(res, 500, error.message || 'Failed to save frontmatter');
          }
        });
      }
      
      // Delete a scene
      function handleDeleteScene(req: any, res: any, sceneId: string) {
        try {
          const scenePath = findSceneFile(resolvedMdDir, sceneId);
          
          if (!scenePath) {
            return sendErrorResponse(res, 404, `Scene with ID "${sceneId}" not found`);
          }
          
          // Delete the file
          fs.unlinkSync(scenePath);
          
          // Update scenes.json
          removeFromScenesJson(resolvedJsonOutput, sceneId);
          
          sendJsonResponse(res, {
            success: true,
            message: `Scene "${sceneId}" deleted successfully`
          });
        } catch (error: any) {
          sendErrorResponse(res, 500, error.message || 'Failed to delete scene');
        }
      }
      
      // ----- Helper Functions -----
      
      // Send JSON response
      function sendJsonResponse(res: any, data: any) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      }
      
      // Send error response
      function sendErrorResponse(res: any, statusCode: number, message: string) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: message
        }));
      }
    }
  };
}

/**
 * Get all scene files in the directory
 */
function getSceneFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = fs.readdirSync(dir);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace('.md', ''));
}

/**
 * Find a scene file by ID
 */
function findSceneFile(dir: string, sceneId: string): string | null {
  const potentialFiles = [
    path.join(dir, `${sceneId}.md`),
    path.join(dir, `${sceneId}/index.md`)
  ];
  
  for (const file of potentialFiles) {
    if (fs.existsSync(file)) {
      return file;
    }
  }
  
  return null;
}

/**
 * Ensure a directory exists
 */
function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Update the scenes.json file with a new scene
 */
function updateScenesJson(jsonPath: string, scene: SceneData): void {
  let scenes: Record<string, any> = {};
  
  // Load existing scenes.json if it exists
  if (fs.existsSync(jsonPath)) {
    const fileContent = fs.readFileSync(jsonPath, 'utf8');
    try {
      scenes = JSON.parse(fileContent);
    } catch (e) {
      // If file is corrupted, start with empty object
      scenes = {};
    }
  }
  
  // Add or update the scene
  scenes[scene.id] = scene;
  
  // Write back to file
  fs.writeFileSync(jsonPath, JSON.stringify(scenes, null, 2), 'utf8');
}

/**
 * Remove a scene from scenes.json
 */
function removeFromScenesJson(jsonPath: string, sceneId: string): void {
  if (!fs.existsSync(jsonPath)) return;
  
  const fileContent = fs.readFileSync(jsonPath, 'utf8');
  let scenes: Record<string, any> = {};
  
  try {
    scenes = JSON.parse(fileContent);
    if (scenes[sceneId]) {
      delete scenes[sceneId];
      fs.writeFileSync(jsonPath, JSON.stringify(scenes, null, 2), 'utf8');
    }
  } catch (e) {
    // If file is corrupted, log error but don't crash
    console.error('Error parsing scenes.json:', e);
  }
} 