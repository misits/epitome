/**
 * Logger - Simple logging utility with debug level support
 */
export class Logger {
  private enabled: boolean = false;
  private prefix: string = '';
  private enabledLevels: Set<string> = new Set();

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

  log(...args: any[]): void {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }

  logLevel(level: string, ...args: any[]): void {
    if (this.enabled && this.enabledLevels.has(level)) {
      console.log(`${this.prefix} [${level}]`, ...args);
    }
  }

  error(...args: any[]): void {
    if (this.enabled) {
      console.error(this.prefix, ...args);
    }
  }
} 