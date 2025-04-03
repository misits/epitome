/**
 * Main export file for the library
 * All components are exported from a single entry point for easier imports
 */

// Core exports
export { Logger } from '@lib/core/Logger';

// Template engine exports
export { HandlebarsLikeEngine } from '@lib/engine/HandlebarsLikeEngine';
export { 
  ConditionalProcessor,
  EachProcessor,
  VariableProcessor,
  YieldProcessor,
  PartialProcessor
} from '@lib/engine/index';

// Markdown processor exports
export { MarkdownProcessor } from '@lib/markdown/MarkdownProcessor';

// Asset processor exports
export { AssetProcessor } from '@lib/assets/AssetProcessor';

// Generator exports
export { Generator } from '@lib/generator/Generator'; 