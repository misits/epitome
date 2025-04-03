declare module 'csso' {
  interface MinifyResult {
    css: string;
    map?: any;
  }

  interface MinifyOptions {
    filename?: string;
    sourceMap?: boolean;
    debug?: boolean;
    usage?: any;
    comments?: string | false;
    restructure?: boolean;
  }

  export function minify(css: string, options?: MinifyOptions): MinifyResult;
} 