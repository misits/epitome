# epitome Documentation

Welcome to the epitome documentation. This comprehensive guide will help you understand how to use epitome to create beautiful single-page websites and landing pages from markdown content.

## Getting Started

If you're new to epitome, we recommend starting with the [Usage Guide](usage-guide.md), which provides a step-by-step introduction to using epitome.

## Documentation Contents

1. [Usage Guide](usage-guide.md) - Learn how to use epitome to create websites from markdown
2. [Architecture](architecture.md) - Understand the internal architecture and design of epitome
3. [API Reference](api-reference.md) - Technical reference for developers using or extending epitome

## What is epitome?

Epitome is a lightweight static site generator optimized for creating landing pages and single-page websites from markdown files. It's designed to simplify the process of going from content to a beautiful published site with minimal effort. It can be used for:

- Landing pages for products or services
- Personal or professional portfolios
- CVs and resumes
- Project documentation
- Event pages
- Simple business websites

Epitome allows you to:

- Write your content in easy-to-maintain markdown files
- Define structured data with YAML frontmatter
- Generate a beautiful, responsive website with minimal effort
- Customize the look and feel with different themes and styles

## Key Features

- **Markdown-based**: Write your content in easy-to-maintain markdown files
- **Frontmatter support**: Define structured data using YAML frontmatter
- **Templates**: Customize the look and feel with HTML templates
- **SCSS styling**: Style with Sass/SCSS
- **Single-command generation**: Create beautiful landing pages with a single command
- **Multiple themes**: Choose or create different themes
- **Development mode**: Live preview with auto-reload as you edit templates, markdown, and SCSS files

## Installation

Clone the repository directly from GitHub:

```bash
git clone https://github.com/misits/epitome.git
cd epitome
npm install
```

## Quick Examples

### Basic Usage

```bash
# Create a markdown file with your CV content
# Run the generator
npm run build
```

### Custom Options

```bash
# Specify a different markdown file
npx ts-node src/cli.ts --page resume.md

# Specify a different output directory
npx ts-node src/cli.ts --output ./dist

# Enable debugging
npx ts-node src/cli.ts --debug

# Start development server with live reload
npm run dev
```

### Programmatic Usage

```typescript
import { Generator } from './src/lib/Generator';

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