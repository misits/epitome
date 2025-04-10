/**
 * Scene utilities for Epitome SPA
 * Re-exports scene utilities from core/helpers for backward compatibility
 */

import {
  validateScene,
  extractSummary,
  createSceneId,
  findOrphanedScenes,
  hasConditionalAccess,
  createScene,
  mergeSceneData,
  hasReachableChoices,
  findSceneReferences
} from '@/helpers';

export {
  validateScene,
  extractSummary,
  createSceneId,
  findOrphanedScenes,
  hasConditionalAccess,
  createScene,
  mergeSceneData,
  hasReachableChoices,
  findSceneReferences
}; 