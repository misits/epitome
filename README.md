# epitome

A lightweight static site generator for creating beautiful single-page websites and landing pages from markdown files.

## Overview

Epitome is a simple yet powerful tool designed to create beautiful, responsive websites from markdown content. It's especially well-suited for landing pages and single-page websites where you want to go from content to published site with minimal effort. While it works perfectly for CVs/resumes, it can be used for product pages, documentation sites, portfolios, and more - all generated from simple markdown files.

## Features

- **Markdown-based**: Write your content in easy-to-maintain markdown files
- **Frontmatter support**: Define structured data using YAML frontmatter
- **Templates**: Customize the look and feel with HTML templates
- **SCSS styling**: Style your website with Sass/SCSS
- **Single-command generation**: Create beautiful landing pages with a single command
- **Multiple themes**: Choose or create different themes for your site
- **Development mode**: Live preview with auto-reload as you edit templates, markdown, and SCSS files

## Installation

Clone the repository directly from GitHub:

```bash
git clone https://github.com/misits/epitome.git
cd epitome
npm install
```

## Quick Start

1. Create a markdown file for your landing page (default: `md/page.md`)
2. Add your content using the frontmatter format for structured data
3. Run the generator:

```bash
# Run the build
npm run build

# Or use the CLI directly
npx ts-node src/cli.ts
```

4. Or start the development server with live reload:

```bash
# Start development server
npm run dev

# Or use the CLI directly with dev flag
npx ts-node src/cli.ts --dev
```

## Documentation

For detailed documentation on how to use epitome, please check the [documentation folder](doc/):

- [Usage Guide](doc/usage-guide.md) - Learn how to use epitome to create landing pages and websites
- [Architecture](doc/architecture.md) - Understand the internal architecture and design
- [API Reference](doc/api-reference.md) - Technical reference for developers

## CLI Options

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
  --dev                     Start development server with live reload
  --help, -h                Show this help
```

## Markdown Format

Your markdown file should include frontmatter (YAML data at the top between `---` markers) and content:

```markdown
---
theme: "default"
name: "John Doe"
title: "Software Engineer"
summary: "Experienced software engineer with a passion for building scalable web applications."
phone: "+1 (123) 456-7890"
email: "john@example.com"
location: "San Francisco, CA"
website: "https://example.com"
education:
  - school: "University of Technology"
    faculty: "Computer Science"
    degree: "Master's degree"
    from: "2015"
    to: "2017"
experience:
  - company: "Tech Corp"
    title: "Senior Developer"
    from: "2018"
    to: "present"
    tasks: ["Developed web applications", "Led team of 5 developers"]
work:
  - project: "Portfolio Website"
    summary: "A personal portfolio website showcasing my projects"
    date: "2022"
    preview: "portfolio.jpg"
    url: "https://portfolio.example.com"
    technologies: ["HTML", "CSS", "JavaScript"]
---

## About Me

I am a passionate software engineer with expertise in building web applications...
```

## Customization

### Templates

Create or modify templates in the `src/templates` directory. Templates use a Handlebars-like syntax for rendering content.

### Styling

Customize styling by editing SCSS files in the `src/scss` directory. Each theme has its own SCSS file.

### Creating a New Theme

1. Create a new HTML template in `src/templates/` (e.g., `mytheme.html`)
2. Create a matching SCSS file in `src/scss/` (e.g., `mytheme.scss`)
3. Specify your theme in the markdown frontmatter: `theme: "mytheme"`

## Project Structure

```
epitome/
├── doc/                # Documentation
├── src/
│   ├── index.ts        # Main export point
│   ├── cli.ts          # CLI implementation
│   ├── lib/            # Core functionality
│   ├── scss/           # SCSS styling
│   └── templates/      # HTML templates
├── md/                 # Markdown content
├── public/             # Generated output
└── package.json
```

## Development

### Building from Source

```bash
git clone https://github.com/misits/epitome.git
cd epitome
npm install
npm run build
```

### Development Mode

The development mode provides a live preview of your CV website with automatic reloading when you make changes to:

- **Markdown content**: Edit your CV content and see changes instantly
- **Templates**: Modify the HTML structure and layout
- **SCSS**: Adjust styling and see changes in real time

To start the development server:

```bash
npm run dev
```

This will:
1. Build your CV website
2. Start a local development server (usually at http://localhost:3000)
3. Open your browser automatically
4. Watch for file changes and reload the browser when changes are detected

Development mode is perfect for:
- Designing a new theme
- Fine-tuning your CV content and layout
- Making rapid iterations to your design

## License

MIT

## Author

[@misits](https://github.com/misits) 