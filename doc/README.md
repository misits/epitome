# epitome Documentation

Welcome to the epitome documentation. This comprehensive guide will help you understand how to use epitome to create beautiful basic websites from markdown content.

## Getting Started

If you're new to epitome, we recommend starting with the [Usage Guide](usage-guide.md), which provides a step-by-step introduction to using epitome.

## Documentation Contents

1. [Usage Guide](usage-guide.md) - Learn how to use epitome to create your CV website
2. [Architecture](architecture.md) - Understand the internal architecture and design of epitome
3. [API Reference](api-reference.md) - Technical reference for developers using or extending epitome

## What is epitome?

Epitome is a lightweight static site generator specifically designed for creating websites from markdown files. It allows you to:

- Write your content in easy-to-maintain markdown files
- Define structured data about your experience, education, and projects
- Generate a beautiful, responsive website with minimal effort
- Customize the look and feel with different themes and styles

## Key Features

- **Markdown-based**: Write your content in easy-to-maintain markdown files
- **Frontmatter support**: Define structured data about your experience, education, and projects
- **Templates**: Customize the look and feel with HTML templates
- **SCSS styling**: Style with Sass/SCSS
- **Simple CLI**: Generate website with a single command
- **Multiple themes**: Choose or create different themes

## Installation

### Global Installation

```bash
npm install -g epitome
```

### Local Project Installation

```bash
npm install epitome --save-dev
```

## Quick Examples

### Basic Usage

```bash
# Create a markdown file with your CV content
# Run the generator
epitome
```

### Custom Options

```bash
# Specify a different markdown file
epitome --page resume.md

# Specify a different output directory
epitome --output ./dist

# Enable debugging
epitome --debug
```

### Programmatic Usage

```javascript
const { Generator } = require('epitome');

// Create a generator instance
const generator = new Generator({
  outputDir: './dist',
  debug: true
});

// Build the CV site
generator.build('resume.md');
```

## Contributing

Contributions are welcome! If you'd like to contribute to epitome, please check out the project on GitHub: [https://github.com/misits/epitome](https://github.com/misits/epitome)

## License

MIT 