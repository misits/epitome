import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../core/Logger';
import { MarkdownProcessor } from '../markdown/MarkdownProcessor';
import { EpitomeEngine } from '../engine/EpitomeEngine';

/**
 * SceneCompiler - Compiles markdown files into a scenes.json file for SPA mode
 */
export class SceneCompiler {
  private logger: Logger;
  private markdownProcessor: MarkdownProcessor;
  private templateEngine: EpitomeEngine;
  
  constructor(logger: Logger) {
    this.logger = logger;
    this.markdownProcessor = new MarkdownProcessor(logger);
    this.templateEngine = new EpitomeEngine(logger);
    
    // Add specific logger for scene compilation
    this.logger.enableLevel('scene');
  }
  
  /**
   * Compile all markdown files in a directory into a scenes.json file
   * @param mdDir Directory containing markdown files
   * @param outputPath Path to output the scenes.json file
   */
  public compileScenes(mdDir: string, outputPath: string): void {
    try {
      this.logger.info('Starting scene compilation...');
      
      // Ensure the output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Get all markdown files in the directory
      const mdFiles = fs.readdirSync(mdDir)
        .filter(file => file.endsWith('.md'));
        
      if (mdFiles.length === 0) {
        this.logger.error('No markdown files found in directory:', mdDir);
        return;
      }
      
      // Process each file into a scene object
      const scenes: Record<string, any> = {};
      
      mdFiles.forEach(mdFile => {
        const sceneId = mdFile.replace('.md', '');
        const mdFilePath = path.join(mdDir, mdFile);
        
        this.logger.log('scene', `Processing scene: ${sceneId}`);
        
        try {
          // Parse the markdown file
          const { data, content } = this.markdownProcessor.parse(mdFilePath);
          
          // Protect template expressions before markdown conversion
          const protectedContent = this.protectTemplateExpressions(content);
          
          // Convert protected markdown content to HTML
          const htmlContent = this.markdownProcessor.convertToHtml(protectedContent);
          
          // Restore and process template expressions in the HTML
          const processedHtml = this.processAndRestoreTemplates(htmlContent, data);
          
          // Create the scene object
          scenes[sceneId] = {
            id: sceneId,
            title: data.title || sceneId,
            html: processedHtml,
            next: data.next || [],
            set: data.set || [],
            condition: data.condition || null,
            theme: data.theme || 'global'
          };
          
          this.logger.log('scene', `Scene "${sceneId}" compiled successfully`);
        } catch (error) {
          this.logger.error(`Error processing scene "${sceneId}":`, error);
        }
      });
      
      // Validate scenes before output
      const validationResult = this.validateScenes(scenes);
      
      // Show warnings
      if (validationResult.warnings.length > 0) {
        this.logger.warn(`Scene validation warnings (${validationResult.warnings.length}):`);
        validationResult.warnings.forEach(warning => {
          this.logger.warn(`- ${warning}`);
        });
      }
      
      // Show errors
      if (validationResult.errors.length > 0) {
        this.logger.error(`Scene validation errors (${validationResult.errors.length}):`);
        validationResult.errors.forEach(error => {
          this.logger.error(`- ${error}`);
        });
        
        this.logger.warn('Scenes will be written with errors. Some scenes may not work correctly.');
      }
      
      // Write the scenes.json file
      fs.writeFileSync(
        outputPath, 
        JSON.stringify(scenes, null, 2)
      );
      
      // Log the available scene IDs for debugging
      const sceneIds = Object.keys(scenes);
      this.logger.success(`Scenes compilation completed. ${sceneIds.length} scenes compiled to: ${outputPath}`);
      this.logger.info(`Available scene IDs: ${sceneIds.join(', ')}`);
      
      // Remind about the initial scene
      const initialScene = 'index';
      if (sceneIds.includes(initialScene)) {
        this.logger.info(`Initial scene "${initialScene}" is available.`);
      } else if (sceneIds.length > 0) {
        this.logger.warn(`Initial scene "${initialScene}" is not available. The engine will use "${sceneIds[0]}" as fallback.`);
      }
      
    } catch (error) {
      this.logger.error('Scene compilation failed:', error);
      throw error;
    }
  }
  
  /**
   * Protect template expressions from markdown processing
   * @param content The markdown content with template expressions
   * @returns Content with protected template expressions
   */
  private protectTemplateExpressions(content: string): string {
    this.logger.logLevel('scene', 'Protecting template expressions from markdown processing');
    
    // Replace all template expressions with placeholders using a unique ID
    let protectedContent = content;
    const templates: Record<string, string> = {};
    
    // Generate a unique ID for each template expression
    let templateId = 0;
    
    // Regex to match all Epitome template expressions
    const templateRegex = /{{[^}]+}}/g;
    
    // Store all templates and replace with placeholders
    protectedContent = protectedContent.replace(templateRegex, (match) => {
      const id = `EPITOME_TEMPLATE_${templateId++}`;
      templates[id] = match;
      return id;
    });
    
    // Store templates for later restoration
    this._templatePlaceholders = templates;
    
    return protectedContent;
  }
  
  /**
   * Restore and process template expressions in HTML content
   * @param content HTML content with template placeholders
   * @param context The context data
   * @returns Processed HTML with resolved template expressions
   */
  private processAndRestoreTemplates(content: string, context: any): string {
    this.logger.logLevel('scene', 'Restoring and processing template expressions');
    
    // Restore template expressions from placeholders
    let restoredContent = content;
    
    for (const [id, template] of Object.entries(this._templatePlaceholders || {})) {
      restoredContent = restoredContent.replace(id, template);
    }
    
    // Process the restored content with the template engine
    return this.processEpitomeTemplates(restoredContent, context);
  }
  
  /**
   * Process Epitome template syntax in the content
   * @param content The HTML content with template tags
   * @param context The context data from frontmatter
   * @returns Processed content with resolved template tags
   */
  private processEpitomeTemplates(content: string, context: any): string {
    this.logger.logLevel('scene', 'Processing Epitome template syntax in content');
    
    try {
      // Create a context object for the template engine
      const templateContext = {
        ...context,
        // Additional context data can be added here if needed
      };
      
      // Process the content through the template engine
      const processedContent = this.templateEngine.render(content, templateContext);
      return processedContent;
    } catch (error) {
      this.logger.error('Error processing Epitome templates in content:', error);
      // Return original content if processing fails
      return content;
    }
  }
  
  // Add a property to store template placeholders
  private _templatePlaceholders: Record<string, string> | null = null;
  
  /**
   * Extract the list of all scene IDs
   * @param scenes The compiled scenes object
   * @returns Array of scene IDs
   */
  public extractSceneIds(scenes: Record<string, any>): string[] {
    return Object.keys(scenes);
  }
  
  /**
   * Validate scenes to check for missing references and other issues
   * @param scenes The compiled scenes object
   * @returns Object containing validation results
   */
  public validateScenes(scenes: Record<string, any>): { valid: boolean, errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sceneIds = new Set(Object.keys(scenes));
    
    // Check for empty scenes collection
    if (sceneIds.size === 0) {
      errors.push('No scenes found in the collection');
      return { valid: false, errors, warnings };
    }
    
    // Check for missing required initial scene
    if (!sceneIds.has('index')) {
      warnings.push('No "index" scene found. Another scene will be used as the initial scene.');
    }
    
    // Track referenced scenes to find orphans
    const referencedScenes = new Set<string>();
    
    // Validate each scene
    Object.entries(scenes).forEach(([sceneId, scene]) => {
      // Check for required fields
      if (!scene.id) {
        errors.push(`Scene "${sceneId}" is missing required "id" field`);
      }
      
      if (!scene.html && !scene.content) {
        errors.push(`Scene "${sceneId}" is missing required content (no html or content field)`);
      }
      
      // Check next choices
      if (scene.next) {
        if (!Array.isArray(scene.next)) {
          errors.push(`Scene "${sceneId}" has invalid "next" field (not an array)`);
        } else {
          scene.next.forEach((choice: any, index: number) => {
            // Check if choice has required id and label
            if (!choice.id) {
              errors.push(`Scene "${sceneId}" has a choice at index ${index} without an "id" field`);
            } else {
              // Track referenced scene
              referencedScenes.add(choice.id);
              
              // Check if the referenced scene exists
              if (!sceneIds.has(choice.id)) {
                errors.push(`Scene "${sceneId}" references non-existent scene "${choice.id}" in next[${index}]`);
              }
            }
            
            if (!choice.label) {
              warnings.push(`Scene "${sceneId}" has a choice at index ${index} without a "label" field`);
            }
            
            // Check condition syntax if present
            if (choice.condition && typeof choice.condition === 'string') {
              try {
                // Simple validation by creating a function
                new Function(`return ${choice.condition};`);
              } catch (error: any) {
                errors.push(`Scene "${sceneId}" has an invalid condition in choice [${index}]: ${error.message}`);
              }
            }
          });
        }
      }
      
      // Check condition syntax if present
      if (scene.condition && typeof scene.condition === 'string') {
        try {
          new Function(`return ${scene.condition};`);
        } catch (error: any) {
          errors.push(`Scene "${sceneId}" has an invalid condition: ${error.message}`);
        }
      }
      
      // Check theme is valid
      if (scene.theme && typeof scene.theme !== 'string') {
        warnings.push(`Scene "${sceneId}" has an invalid theme (not a string)`);
      }
    });
    
    // Find orphaned scenes (not referenced by any other scene, except index)
    sceneIds.forEach(sceneId => {
      if (sceneId !== 'index' && !referencedScenes.has(sceneId)) {
        warnings.push(`Scene "${sceneId}" is orphaned (not referenced by any other scene)`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
} 