/**
 * Logger - Enhanced logging utility with color-coded output and debug level support
 */
export class Logger {
  private enabled: boolean = false;
  private prefix: string = '';
  private enabledLevels: Set<string> = new Set();
  private indentationLevel: number = 0;
  
  // ANSI color codes for terminal colors
  private colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    
    fg: {
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",
    },
    
    bg: {
      black: "\x1b[40m",
      red: "\x1b[41m",
      green: "\x1b[42m",
      yellow: "\x1b[43m",
      blue: "\x1b[44m",
      magenta: "\x1b[45m",
      cyan: "\x1b[46m",
      white: "\x1b[47m",
    }
  };

  enable(): Logger {
    this.enabled = true;
    return this;
  }

  disable(): Logger {
    this.enabled = false;
    return this;
  }

  setPrefix(prefix: string): Logger {
    this.prefix = prefix;
    return this;
  }

  enableLevel(level: string): Logger {
    this.enabledLevels.add(level);
    return this;
  }

  disableLevel(level: string): Logger {
    this.enabledLevels.delete(level);
    return this;
  }

  setIndentation(level: number): Logger {
    this.indentationLevel = Math.max(0, level);
    return this;
  }

  increaseIndentation(): Logger {
    this.indentationLevel++;
    return this;
  }

  decreaseIndentation(): Logger {
    if (this.indentationLevel > 0) {
      this.indentationLevel--;
    }
    return this;
  }

  private getTimestamp(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  }

  private getIndentation(): string {
    return '  '.repeat(this.indentationLevel);
  }

  private formatObjects(...args: any[]): any[] {
    return args.map(arg => {
      // Handle undefined and null
      if (arg === undefined) return 'undefined';
      if (arg === null) return 'null';
      
      // Handle strings - truncate long strings (especially HTML content)
      if (typeof arg === 'string') {
        // If the string looks like HTML content (contains tags)
        if (arg.includes('<') && arg.includes('>')) {
          const firstTagMatch = arg.match(/<([a-zA-Z0-9]+)/);
          if (firstTagMatch) {
            const firstTag = firstTagMatch[1];
            return arg.length > 100 
              ? `[HTML <${firstTag}...> ${arg.length} chars]` 
              : arg;
          }
        }
        
        // Truncate long strings that aren't HTML
        return arg.length > 300 
          ? `${arg.substring(0, 300)}... [${arg.length} chars total]` 
          : arg;
      }
      
      // For objects and arrays
      if (typeof arg === 'object' && arg !== null) {
        try {
          // For arrays, show length and first few items
          if (Array.isArray(arg)) {
            const arrayLength = arg.length;
            if (arrayLength === 0) return '[]';
            
            if (arrayLength <= 3) {
              return JSON.stringify(arg, null, 2);
            } else {
              // Just show first 3 items and length
              const sample = arg.slice(0, 3);
              return `Array(${arrayLength}) ${JSON.stringify(sample, null, 2)}...`;
            }
          }
          
          // For regular objects
          const keys = Object.keys(arg);
          
          // If it's a large object, just show a summary
          if (keys.length > 5) {
            const previewObj: Record<string, any> = {};
            keys.slice(0, 5).forEach(key => {
              previewObj[key] = arg[key];
            });
            return `Object {${keys.length} keys} ${JSON.stringify(previewObj, null, 2)}...`;
          }
          
          // Otherwise show the full object
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return `[Object: ${typeof arg}]`;
        }
      }
      
      // For other types, just return as is
      return arg;
    });
  }

  /**
   * Standard log
   */
  log(...args: any[]): void {
    if (this.enabled) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      console.log(`${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${indentation}`, ...formattedArgs);
    }
  }

  /**
   * Log with specific level
   */
  logLevel(level: string, ...args: any[]): void {
    if (this.enabled && this.enabledLevels.has(level)) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      const levelColor = this.getLevelColor(level);
      console.log(
        `${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${levelColor}[${level}]${this.colors.reset} ${indentation}`, 
        ...formattedArgs
      );
    }
  }

  /**
   * Success log (green color)
   */
  success(...args: any[]): void {
    if (this.enabled) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      console.log(
        `${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${this.colors.fg.green}✓${this.colors.reset} ${indentation}`, 
        ...formattedArgs
      );
    }
  }

  /**
   * Info log (cyan color)
   */
  info(...args: any[]): void {
    if (this.enabled) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      console.log(
        `${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${this.colors.fg.cyan}ℹ${this.colors.reset} ${indentation}`, 
        ...formattedArgs
      );
    }
  }

  /**
   * Warning log (yellow color)
   */
  warn(...args: any[]): void {
    if (this.enabled) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      console.warn(
        `${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${this.colors.fg.yellow}⚠${this.colors.reset} ${indentation}`, 
        ...formattedArgs
      );
    }
  }

  /**
   * Error log (red color)
   */
  error(...args: any[]): void {
    if (this.enabled) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      console.error(
        `${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${this.colors.fg.red}✗${this.colors.reset} ${indentation}`, 
        ...formattedArgs
      );
    }
  }

  /**
   * Debug log (magenta color)
   */
  debug(...args: any[]): void {
    if (this.enabled) {
      const formattedArgs = this.formatObjects(...args);
      const timestamp = this.getTimestamp();
      const indentation = this.getIndentation();
      console.log(
        `${this.colors.fg.gray}${timestamp}${this.colors.reset} ${this.colors.fg.blue}${this.prefix}${this.colors.reset} ${this.colors.fg.magenta}🔍${this.colors.reset} ${indentation}`, 
        ...formattedArgs
      );
    }
  }

  /**
   * Get a color for a specific log level
   */
  private getLevelColor(level: string): string {
    const levelColors: Record<string, string> = {
      'template': this.colors.fg.magenta,
      'data': this.colors.fg.cyan,
      'parse': this.colors.fg.yellow,
      'debug': this.colors.fg.magenta,
      'info': this.colors.fg.blue,
      'warn': this.colors.fg.yellow,
      'error': this.colors.fg.red
    };

    return levelColors[level] || this.colors.fg.white;
  }
} 