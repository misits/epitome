declare module 'browser-sync' {
  interface Options {
    server?: string | { baseDir: string };
    proxy?: string;
    port?: number;
    open?: boolean;
    ui?: boolean | { port: number };
    files?: string | string[];
    watch?: boolean;
    ignore?: string[];
    notify?: boolean;
    [key: string]: any;
  }

  interface BrowserSyncInstance {
    init(options: Options, callback?: (err: Error | null, bs: object) => void): void;
    reload(files?: string | string[]): void;
    stream(options?: object): NodeJS.ReadWriteStream;
    exit(): void;
    pause(): void;
    resume(): void;
    notify(message: string, timeout?: number): void;
  }

  function create(name?: string): BrowserSyncInstance;

  export = {
    create
  };
} 