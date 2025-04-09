/**
 * Scene utilities for the Epitome SPA engine
 */

/**
 * Validates if a scene object has the expected properties
 * @param {Object} scene The scene object to validate
 * @returns {boolean} Whether the scene is valid
 */
export const validateScene = (scene) => {
  if (!scene || typeof scene !== 'object') return false;
  
  // Must have an ID property (html can be empty)
  if (!scene.id) return false;
  
  // HTML property must exist (even if empty)
  if (scene.html === undefined) return false;
  
  return true;
};

/**
 * Extracts a summary from HTML content by removing tags and limiting length
 * @param {string} html HTML content
 * @param {number} maxLength Maximum length of the summary
 * @returns {string} Plain text summary
 */
export const extractSummary = (html, maxLength = 100) => {
  if (!html || html === '') return '';
  
  try {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get text content
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Remove excess whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Limit length and add ellipsis if needed
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting summary:', error);
    return '';
  }
};

/**
 * Creates a unique ID from a title or text by converting to kebab-case
 * @param {string} text Text to convert
 * @returns {string} Kebab-case ID
 */
export const createSceneId = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .trim();
};

/**
 * Analyzes scenes to find orphaned scenes (not referenced by any other scene)
 * @param {Object} scenes The scenes collection
 * @returns {Array} Array of orphaned scene IDs
 */
export const findOrphanedScenes = (scenes) => {
  if (!scenes || typeof scenes !== 'object') return [];
  
  const allSceneIds = Object.keys(scenes);
  const referencedIds = new Set();
  
  // Collect all referenced scene IDs
  allSceneIds.forEach(sceneId => {
    const scene = scenes[sceneId];
    if (scene.next && Array.isArray(scene.next)) {
      scene.next.forEach(choice => {
        if (choice.id) {
          referencedIds.add(choice.id);
        }
      });
    }
  });
  
  // Find scenes that aren't referenced (except the initial scene)
  return allSceneIds.filter(id => 
    id !== 'index' && !referencedIds.has(id)
  );
};

/**
 * Check if a scene is conditional based on flags
 * @param {Object} scene The scene object
 * @param {Set} flags Set of active flags
 * @returns {boolean} Whether the scene has flag-based conditions
 */
export const hasConditionalAccess = (scene) => {
  if (!scene) return false;
  
  // Scene itself has a condition
  if (scene.condition) return true;
  
  // Check if any choices have conditions
  if (scene.next && Array.isArray(scene.next)) {
    return scene.next.some(choice => Boolean(choice.condition));
  }
  
  return false;
};

/**
 * Creates a new scene object with basic required properties
 * @param {string} id The scene ID
 * @param {string} title The scene title
 * @param {string} html The scene HTML content
 * @param {Array} choices Array of next choices
 * @returns {Object} A new scene object
 */
export const createScene = (id, title = '', html = '', choices = []) => {
  return {
    id: id || createSceneId(title),
    title,
    html,
    next: choices
  };
};

/**
 * Merges scene data, allowing for partial updates
 * @param {Object} original The original scene object
 * @param {Object} updates The updates to apply
 * @returns {Object} The merged scene object
 */
export const mergeSceneData = (original, updates) => {
  if (!original) return updates;
  if (!updates) return original;
  
  return {
    ...original,
    ...updates,
    // Handle special case for next/choices array
    next: updates.next || original.next
  };
};

/**
 * Check if a scene has reachable choices based on the current flags
 * @param {Object} scene The scene object
 * @param {Set} flags Set of active flags
 * @returns {boolean} Whether the scene has reachable choices
 */
export const hasReachableChoices = (scene, flags) => {
  if (!scene || !scene.next || !Array.isArray(scene.next)) return false;
  
  return scene.next.some(choice => {
    // No condition means always reachable
    if (!choice.condition) return true;
    
    // Evaluate condition
    try {
      // Create a safe evaluation context
      const hasFlag = (flag) => flags.has(flag);
      const context = { flags, hasFlag };
      
      // Create a function with the context variables in scope
      const conditionFn = new Function(
        ...Object.keys(context),
        `return ${choice.condition};`
      );
      
      // Call the function with the context values
      return conditionFn(...Object.values(context));
    } catch (error) {
      console.error(`Error evaluating condition "${choice.condition}":`, error);
      return false;
    }
  });
};

/**
 * Find all scenes that link to a specific scene ID
 * @param {Object} scenes The scenes collection
 * @param {string} targetId The scene ID to find references to
 * @returns {Array} Array of scene IDs that reference the target
 */
export const findSceneReferences = (scenes, targetId) => {
  if (!scenes || !targetId) return [];
  
  return Object.keys(scenes).filter(sceneId => {
    const scene = scenes[sceneId];
    if (!scene.next || !Array.isArray(scene.next)) return false;
    
    return scene.next.some(choice => choice.id === targetId);
  });
}; 