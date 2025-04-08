# epitome API Reference

This document provides a detailed reference of the epitome API for developers who want to use epitome programmatically or extend its functionality.

## Core Classes

### Generator

The `Generator` class is the main entry point for the epitome API. It orchestrates the build process and coordinates all the components.

#### Constructor

```typescript
constructor(options: GeneratorOptions = {})
```

**Parameters:**

- `options` (optional): Configuration options for the generator
  - `outputDir` (string, optional): Directory for generated output (default: './public')
  - `mdDir` (string, optional): Directory for markdown files (default: './md')
  - `templatesDir` (string, optional): Directory for templates (default: './src/templates')
  - `scssDir` (string, optional): Directory for SCSS files (default: './src/scss')
  - `jsDir` (string, optional): Directory for JavaScript files (default: './src/js')
  - `debug` (boolean, optional): Enable debug mode (default: false)
  - `minifyCss` (boolean, optional): Enable CSS minification (default: true)
  - `minifyJs` (boolean, optional): Enable JavaScript minification (default: true)

**Example:**

```typescript
import { Generator } from 'epitome';

const generator = new Generator({
  outputDir: './dist',
  mdDir: './content',
  templatesDir: './templates',
  scssDir: './styles',
  jsDir: './scripts',
  debug: true,
  minifyCss: true,
  minifyJs: true
});
```

#### Methods

##### build

```typescript
build(mdFilename: string = 'index.md', outputHtmlFilename: string = 'index.html'): void
```

Builds the CV site from markdown to HTML with styling.

**Parameters:**

- `mdFilename` (string, optional): The markdown file to process (default: 'index.md')
- `outputHtmlFilename` (string, optional): The output HTML filename (default: 'index.html')

**Example:**

```typescript
// Build using default markdown file and output filename
generator.build();

// Build with custom filenames
generator.build('resume.md', 'resume.html');
```

##### enableDebugLevels

```typescript
enableDebugLevels(levels: string[]): this
```

Enables specific debug levels for more targeted debugging.

**Parameters:**

- `levels` (string[]): Array of level names to enable (e.g., ['template', 'data', 'parse'])

**Returns:**

- `this`: Returns the generator instance for method chaining

**Example:**

```typescript
generator.enableDebugLevels(['template', 'data', 'parse']);
```

### MarkdownProcessor

The `MarkdownProcessor` class handles parsing of markdown files with frontmatter and converting markdown to HTML.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Parameters:**

- `logger` (Logger): Logger instance for debugging

#### Methods

##### parse

```typescript
parse(filePath: string): { data: any, content: string }
```

Parses a markdown file and extracts frontmatter data and content.

**Parameters:**

- `filePath` (string): Path to the markdown file

**Returns:**

- Object with:
  - `data` (any): Normalized frontmatter data
  - `content` (string): Markdown content

##### convertToHtml

```typescript
convertToHtml(markdown: string): string
```

Converts markdown content to HTML.

**Parameters:**

- `markdown` (string): Markdown content

**Returns:**

- HTML string

### HandlebarsLikeEngine

The `HandlebarsLikeEngine` class provides template processing capabilities with a syntax similar to Handlebars.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Parameters:**

- `logger` (Logger): Logger instance for debugging

#### Methods

##### render

```typescript
render(template: string, context: any): string
```

Renders a template with the provided context.

**Parameters:**

- `template` (string): Template string with Handlebars-like syntax
- `context` (any): Data context for template variables

**Returns:**

- Processed HTML string

##### registerHelper

```typescript
registerHelper(name: string, callback: HelperFunction): void
```

Registers a custom helper function.

**Parameters:**

- `name` (string): Helper name
- `callback` (HelperFunction): Helper implementation function

**Example:**

```typescript
templateEngine.registerHelper('formatDate', (date, format) => {
  // Format date logic
  return formattedDate;
});
```

### AssetProcessor

The `AssetProcessor` class handles asset processing, particularly SCSS compilation and JavaScript bundling.

#### Constructor

```typescript
constructor(logger: Logger, cssOutputDir?: string, jsOutputDir?: string)
```

**Parameters:**

- `logger` (Logger): Logger instance for debugging
- `cssOutputDir` (string, optional): Custom output directory for CSS assets (default: 'public/assets/css')
- `jsOutputDir` (string, optional): Custom output directory for JavaScript assets (default: 'public/assets/js')

#### Methods

##### compileSass

```typescript
compileSass(options: SassCompileOptions): void;
compileSass(sassFilePath: string, outputName: string, minify?: boolean): void;
```

Compiles SCSS to CSS and places the output in the configured assets directory.

**Parameters (object form):**

- `options`: A configuration object with the following properties:
  - `sassFilePath` (string): Path to the SCSS file
  - `outputName` (string): Name for the output CSS file (with or without .css extension)
  - `minify` (boolean, optional): Whether to minify the CSS output (default: true)
  - `extractComponents` (boolean, optional): Whether to extract component styles to separate files (default: false)

**Parameters (direct form):**

- `sassFilePath` (string): Path to the SCSS file
- `outputName` (string): Name for the output CSS file (with or without .css extension)
- `minify` (boolean, optional): Whether to minify the CSS output (default: true)

**Component Extraction:**

When `extractComponents` is enabled, the processor will look for SCSS files in a 'components' subdirectory and compile them to separate CSS files. This helps reduce the main CSS file size and allows for more efficient loading.

##### extractComponentStyles

```typescript
extractComponentStyles(mainSassPath: string, minify?: boolean): void
```

Extracts component styles from a components directory into separate CSS files.

**Parameters:**

- `mainSassPath` (string): The path to the main SCSS file, used to locate the components directory
- `minify` (boolean, optional): Whether to minify the output CSS (default: true)

##### bundleJs

```typescript
bundleJs(options: JsBundleOptions): void;
bundleJs(entryPoint: string, outputName?: string, minify?: boolean): void;
```

Bundles JavaScript files starting from an entry point. Only files that are imported in the entry point will be included in the bundle.

**Parameters (object form):**

- `options`: A configuration object with the following properties:
  - `entryPoint` (string): Path to the main JavaScript entry point file
  - `outputName` (string, optional): Name for the output bundle (default: 'main')
  - `minify` (boolean, optional): Whether to minify the JavaScript output (default: true)
  - `splitting` (boolean, optional): Whether to enable code splitting (default: false)
  - `formats` (string[], optional): Output formats to generate (['esm'], 'cjs', or 'iife')

**Parameters (direct form):**

- `entryPoint` (string): Path to the main JavaScript entry point file
- `outputName` (string, optional): Name for the output bundle (default: 'main')
- `minify` (boolean, optional): Whether to minify the JavaScript output (default: true)

**Code Splitting:**

When `splitting` is enabled, the bundler will automatically split the output into multiple chunks based on dynamic imports. This results in smaller initial loads and better performance for larger applications.

##### compileJs

```typescript
compileJs(jsFilePath: string, outputName: string, minify: boolean = true): void
```

Compiles a single JavaScript file without bundling dependencies.

**Parameters:**

- `jsFilePath` (string): Path to the JavaScript file
- `outputName` (string): Name for the output JavaScript file
- `minify` (boolean, optional): Whether to minify the JavaScript output (default: true)

##### resolveCssOutputPath

```typescript
resolveCssOutputPath(outputName: string): string
```

Resolves the output path for a CSS file.

**Parameters:**

- `outputName` (string): The name of the output file (with or without .css extension)

**Returns:**

- Full path to the output CSS file

##### resolveJsOutputPath

```typescript
resolveJsOutputPath(outputName: string): string
```

Resolves the output path for a JavaScript file.

**Parameters:**

- `outputName` (string): The name of the output file (with or without .js extension)

**Returns:**

- Full path to the output JS file

### SassCompileOptions

```typescript
interface SassCompileOptions {
  sassFilePath: string;
  outputName: string;
  minify?: boolean;
  extractComponents?: boolean;
}
```

Configuration options for SCSS compilation.

### JsBundleOptions

```typescript
interface JsBundleOptions {
  entryPoint: string;
  outputName?: string;
  minify?: boolean;
  splitting?: boolean;
  formats?: ('esm' | 'cjs' | 'iife')[];
}
```

Configuration options for JavaScript bundling.

### Logger

The `Logger` class provides debugging and logging capabilities.

#### Constructor

```typescript
constructor()
```

#### Methods

##### enable

```typescript
enable(): this
```

Enables logging.

**Returns:**

- `this`: Returns the logger instance for method chaining

##### disable

```typescript
disable(): this
```

Disables logging.

**Returns:**

- `this`: Returns the logger instance for method chaining

##### setPrefix

```typescript
setPrefix(prefix: string): this
```

Sets a prefix for log messages.

**Parameters:**

- `prefix` (string): Prefix string

**Returns:**

- `this`: Returns the logger instance for method chaining

##### enableLevel

```typescript
enableLevel(level: string): this
```

Enables a specific debug level.

**Parameters:**

- `level` (string): Level name

**Returns:**

- `this`: Returns the logger instance for method chaining

##### log

```typescript
log(...args: any[]): void
```

Logs a message if logging is enabled.

**Parameters:**

- `...args` (any[]): Arguments to log

##### logLevel

```typescript
logLevel(level: string, ...args: any[]): void
```

Logs a message for a specific level if that level is enabled.

**Parameters:**

- `level` (string): Level name
- `...args` (any[]): Arguments to log

##### error

```typescript
error(...args: any[]): void
```

Logs an error message (always shown).

**Parameters:**

- `...args` (any[]): Arguments to log

## Types and Interfaces

### GeneratorOptions

```typescript
interface GeneratorOptions {
  outputDir?: string;
  mdDir?: string;
  templatesDir?: string;
  scssDir?: string;
  jsDir?: string;
  debug?: boolean;
  minifyCss?: boolean;
  minifyJs?: boolean;
}
```

Configuration options for the Generator class.

### ResolvedGeneratorOptions

```typescript
interface ResolvedGeneratorOptions {
  outputDir: string;
  mdDir: string;
  templatesDir: string;
  scssDir: string;
  jsDir: string;
  debug: boolean;
  minifyCss: boolean;
  minifyJs: boolean;
}
```

Resolved configuration options with defaults applied.

### TemplateEngine

```typescript
interface TemplateEngine {
  render(template: string, context: any): string;
}
```

Interface for template engines that can be used with the Generator.

### HelperFunction

```typescript
type HelperFunction = (context: any, options?: any) => string;
```

Type definition for template helper functions.

## CLI Options

The epitome CLI tool accepts the following options:

```
epitome [options]

Options:
  --page, -p <file>         Page markdown file (default: page.md)
  --output, -o <dir>        Output directory (default: ./public)
  --md-dir <dir>            Markdown files directory (default: ./md)
  --templates-dir <dir>     Templates directory (default: ./src/templates)
  --scss-dir <dir>          SCSS directory (default: ./src/scss)
  --js-dir <dir>            JavaScript directory (default: ./src/js)
  --debug, -d               Enable debug output
  --debug-level <level>     Enable specific debug level(s), comma separated
  --no-minify               Disable CSS minification
  --no-js-minify            Disable JavaScript minification
  --help, -h                Show this help
```

## Template Syntax

epitome uses a custom template system with a syntax similar to Handlebars.

### Variables

```
{{variable}}
```

Outputs the value of a variable (HTML escaped).

### Unescaped Variables

```
{{{variable}}}
```

Outputs the value without HTML escaping.

### Conditionals

```
{{@if condition}}
  Content to show if condition is true
{{/if}}
```

Conditionally renders content.

### Loops

```
{{@each items}}
  {{this}} or {{property}}
{{/each}}
```

Iterates over an array or object.

### Lists

```
{{@ul #id .class-name itemsArray}}
```

Generates an unordered list from an array.

### Partials

```
{{@partial 'partialName'}}
```

Includes a partial template from the templates/partials directory. The partial inherits the current template's context.

You can also use a variable for the partial name:

```
{{@partial partialVariable}}
```

### Yield Blocks

Yield blocks allow defining content sections that can be overridden by child templates. This enables powerful layout composition and template inheritance.

In a layout template (for example `partials/app.html`), define yield blocks:

```
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
</head>
<body>
  <header>
    {{@yield "header"}}
      <h1>Default Header</h1>
    {{/yield}}
  </header>
  
  <main>
    {{@yield "content"}}
      <p>Default content</p>
    {{/yield}}
  </main>
  
  <footer>
    {{@yield "footer"}}
      <p>Default footer</p>
    {{/yield}}
  </footer>
</body>
</html>
```

Then in a child template that uses this layout, you can override any or all of the yield blocks:

```
{{@partial 'app'}}

{{@yield "header"}}
  <h1>Custom Header</h1>
  <p>This overrides the default header</p>
{{/yield}}

{{@yield "content"}}
  <div class="custom-content">
    {{{content}}}
  </div>
{{/yield}}

{{/partial}}
```

Yield blocks that aren't explicitly overridden will use their default content. This allows for flexible templates with sensible defaults.

## Extension Points

### Creating Custom Template Engines

You can create custom template engines by implementing the `TemplateEngine` interface:

```typescript
import { TemplateEngine } from 'epitome';

class CustomTemplateEngine implements TemplateEngine {
  render(template: string, context: any): string {
    // Custom rendering logic
    return processedTemplate;
  }
}
```

### Extending the MarkdownProcessor

To customize markdown processing, extend the `MarkdownProcessor` class:

```typescript
import { MarkdownProcessor, Logger } from 'epitome';

class CustomMarkdownProcessor extends MarkdownProcessor {
  constructor(logger: Logger) {
    super(logger);
  }
  
  parse(filePath: string) {
    const result = super.parse(filePath);
    // Add custom processing
    return result;
  }
  
  convertToHtml(markdown: string) {
    // Custom HTML conversion
    return customHtmlConverter(markdown);
  }
}
```

### Extending the Generator

To customize the build process, extend the `Generator` class:

```typescript
import { Generator, GeneratorOptions } from 'epitome';

class CustomGenerator extends Generator {
  constructor(options: GeneratorOptions = {}) {
    super(options);
    // Additional initialization
  }
  
  build(mdFilename: string = 'index.md', outputHtmlFilename: string = 'index.html') {
    // Custom build logic
    // You can call super.build() or implement your own logic
  }
  
  // Add custom methods
  customBuildStep() {
    // Implementation
  }
}
```

### Nested Data Access

Epitome supports dot notation for accessing nested properties in your frontmatter data:

```
{{object.property}}
```

For example, if your frontmatter contains:

```yaml
hero:
  title: "Welcome to my site"
  subtitle: "Learn more about what I do"
```

You can access these properties in your template with:

```html
<h1>{{hero.title}}</h1>
<p>{{hero.subtitle}}</p>
```

##### Nested Arrays

You can also access array items using dot notation with the index:

```yaml
links:
  - text: "Home"
    url: "/"
  - text: "About"
    url: "/about"
```

Access them in your template:

```html
<a href="{{links.0.url}}">{{links.0.text}}</a>
<a href="{{links.1.url}}">{{links.1.text}}</a>
```

##### Deep Nesting

There's no limit to how deep you can nest properties:

```yaml
site:
  meta:
    social:
      twitter: "@username"
      linkedin: "linkedin.com/in/username"
```

Access in templates:

```html
<meta name="twitter:site" content="{{site.meta.social.twitter}}">
``` 