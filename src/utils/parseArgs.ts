/**
 * Utility function to parse command line arguments
 */
export interface ParsedArgs {
  page?: string;
  outputDir?: string;
  mdDir?: string;
  templatesDir?: string;
  scssDir?: string;
  debug?: boolean;
  debugLevels?: string[];
  help?: boolean;
  dev?: boolean;
}

/**
 * Parse command line arguments
 * @param args Array of command line arguments
 * @returns Parsed arguments object
 */
export function parseArgs(args: string[]): ParsedArgs {
  const options: ParsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--page' || arg === '-p') {
      options.page = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.outputDir = args[++i];
    } else if (arg === '--md-dir') {
      options.mdDir = args[++i];
    } else if (arg === '--templates-dir') {
      options.templatesDir = args[++i];
    } else if (arg === '--scss-dir') {
      options.scssDir = args[++i];
    } else if (arg === '--debug' || arg === '-d') {
      options.debug = true;
    } else if (arg === '--debug-level') {
      options.debugLevels = args[++i].split(',').map(level => level.trim());
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dev') {
      options.dev = true;
    }
  }
  
  return options;
} 