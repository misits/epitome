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
  - `debug` (boolean, optional): Enable debug mode (default: false)

**Example:**

```typescript
import { Generator } from 'epitome';

const generator = new Generator({
  outputDir: './dist',
  mdDir: './content',
  templatesDir: './templates',
  scssDir: './styles',
  debug: true
});
```

#### Methods

##### build

```typescript
build(mdFilename: string = 'page.md', outputHtmlFilename: string = 'index.html'): void
```

Builds the CV site from markdown to HTML with styling.

**Parameters:**

- `mdFilename` (string, optional): The markdown file to process (default: 'page.md')
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

The `AssetProcessor` class handles asset processing, particularly SCSS compilation.

#### Constructor

```typescript
constructor(logger: Logger)
```

**Parameters:**

- `logger` (Logger): Logger instance for debugging

#### Methods

##### compileSass

```typescript
compileSass(sassFilePath: string, outputCssPath: string): void
```

Compiles SCSS to CSS.

**Parameters:**

- `sassFilePath` (string): Path to the SCSS file
- `outputCssPath` (string): Path to output the compiled CSS

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
  debug?: boolean;
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
  debug: boolean;
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
  --debug, -d               Enable debug output
  --debug-level <level>     Enable specific debug level(s), comma separated
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
  
  build(mdFilename: string = 'page.md', outputHtmlFilename: string = 'index.html') {
    // Custom build logic
    // You can call super.build() or implement your own logic
  }
  
  // Add custom methods
  customBuildStep() {
    // Implementation
  }
}
``` 