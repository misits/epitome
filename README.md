# epitome

A lightweight static site generator for creating beautiful single-page websites and landing pages from markdown files.

## Overview

Epitome is a simple yet powerful tool designed to create beautiful, responsive websites from markdown content. It's especially well-suited for landing pages and single-page websites where you want to go from content to published site with minimal effort. While it works perfectly for CVs/resumes, it can be used for product pages, documentation sites, portfolios, and more - all generated from simple markdown files.

## Features

- **Markdown-based**: Write your content in easy-to-maintain markdown files
- **Frontmatter support**: Define structured data using YAML frontmatter
- **Templates**: Customize the look and feel with HTML templates
- **SCSS styling**: Style your website with Sass/SCSS
- **CSS minification**: Automatically minify CSS for optimized performance
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
  --page, -p <file>          Page markdown file (default: index.md)
  --output, -o <dir>        Output directory (default: ./public)
  --md-dir <dir>            Markdown files directory (default: ./src/content/md)
  --templates-dir <dir>     Templates directory (default: ./src/content/templates)
  --scss-dir <dir>          SCSS directory (default: ./src/content/scss)
  --debug, -d               Enable debug output
  --debug-level <level>     Enable specific debug level(s), comma separated
  --dev                     Start development server with live reload
  --single-file, -s         In dev mode, only build a single file (not all files)
  --no-minify               Disable CSS minification (CSS is minified by default)
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
├── core/               # Core functionality
│   ├── bin/            # CLI scripts and dev server
│   │   ├── cli.ts      # CLI implementation
│   │   └── dev.ts      # Development server
│   ├── lib/            # Core library code
│   │   ├── core/       # Core modules (Logger, etc.)
│   │   ├── engine/     # Template engine
│   │   ├── generator/  # Site generator
│   │   ├── markdown/   # Markdown processing
│   │   └── assets/     # Asset processing
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── src/                # Content files
│   ├── md/             # Markdown content
│   ├── scss/           # SCSS styling
│   └── templates/      # HTML templates
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

The development mode provides a live preview of your website with automatic reloading when you make changes to:

- **Markdown content**: Edit your content and see changes instantly
- **Templates**: Modify the HTML structure and layout
- **SCSS**: Adjust styling and see changes in real time

To start the development server:

```bash
npm run dev
```

By default, development mode will now:
1. Build ALL markdown files in your directory
2. Start a local development server (usually at http://localhost:3000)
3. Open your browser automatically
4. Watch for file changes and rebuild ALL pages when changes are detected

If you prefer to work with just a single page during development (for faster rebuilds):

```bash
npm run dev -- --single-file
# Or specify a particular page
npm run dev -- --single-file --page about.md
```

Development mode is perfect for:
- Designing a new theme
- Fine-tuning your content and layout
- Making rapid iterations to your design
- Testing the entire site as you work

## Deployment with Clean URLs

Epitome now supports clean URLs (without .html extensions) by creating a folder structure with index.html files. For example, `about.md` becomes `/about/index.html` instead of `/about.html`.

This means that in your markdown files, you can link to other pages using:

```markdown
[About Page](about/) instead of [About Page](about.html)
```

### Server Configuration for Production

When deploying to production, you'll need to configure your web server to handle clean URLs properly:

#### Apache Server

Create a `.htaccess` file in your output directory:

```apache
RewriteEngine On
RewriteBase /

# If the request is not for a file or directory that exists
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Redirect clean URLs to the corresponding index.html file
RewriteRule ^([^/]+)/?$ $1/index.html [L]
```

#### Nginx Server

Add this configuration to your server block:

```nginx
location / {
    try_files $uri $uri/ $uri/index.html =404;
}
```

#### Static Hosting Services

For services like Netlify, Vercel, or GitHub Pages, refer to their documentation on configuring clean URLs/rewrites.

#### GitHub Pages

GitHub Pages has built-in support for clean URLs. To deploy your Epitome site to GitHub Pages:

1. Create a `.nojekyll` file in your output directory (public) to disable Jekyll processing:
   ```bash
   touch public/.nojekyll
   ```

2. Configure your repository settings:
   - Go to your repository on GitHub
   - Navigate to Settings > Pages
   - Under "Source", select "GitHub Actions"
   - Create a simple GitHub Actions workflow file in your project:

Create a file named `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build site
        run: npm run build
        
      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: public
          clean: true
```

This workflow will automatically build and deploy your site to GitHub Pages whenever you push changes to the main branch.

### Asset Path Handling with Clean URLs

When using clean URLs (folder-based structure), you need to ensure that asset paths are correctly resolved. Epitome now provides helper functions to make this easy:

#### In Templates

Use the `assetPath` helper to reference assets and the `urlPath` helper for internal links:

```html
<!-- CSS and other assets -->
<link rel="stylesheet" href="{{assetPath 'style.css'}}">
<img src="{{assetPath 'images/photo.jpg'}}" alt="Photo">

<!-- Internal links -->
<a href="{{urlPath 'about'}}">About</a>
<a href="{{urlPath '/'}}">Home</a>
```

These helpers automatically adjust paths based on the current page's depth in the folder structure, ensuring assets are properly loaded from any page.

#### In Markdown Content

For links in your markdown content, use relative paths:

- Link to the home page with `[Home](/)`
- Link to other pages with `[About](about/)`

## Template Partials

Epitome now supports template partials to make your templates more modular and maintainable. 

### Basic Usage

Create partial templates in the `src/templates/partials` directory:

```html
<!-- src/templates/partials/head.html -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{title}} - {{name}}</title>
<!-- ... more head content ... -->
```

Then use them in your main templates:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    {{@partial 'head'}}
</head>
<body>
    <!-- ... body content ... -->
</body>
</html>
```

### Dynamic Partials

You can also use variables to determine which partial to include:

```html
{{@partial partialVariable}}
```

This allows you to dynamically select different partials based on your content's needs.

### Nested Partials

Partials can also include other partials, enabling you to build a modular template system.

### Context

Partials inherit the context of the template that includes them, so they have access to all the same variables.

## Layout Composition with Yield

Epitome supports template inheritance through yield blocks, allowing you to create reusable layouts with customizable sections.

### Creating a Layout Template

Create a layout template in the `src/templates/partials` directory:

```html
<!-- src/templates/partials/app.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{title}}</title>
    {{@yield "head"}}{{/yield}}
</head>
<body>
    <header>
        {{@yield "header"}}
            <h1>{{title}}</h1>
        {{/yield}}
    </header>
    
    <main>
        {{@yield "content"}}
            {{{content}}}
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

### Using a Layout with Custom Sections

Then create templates that use this layout, overriding specific sections:

```html
<!-- src/templates/custom.html -->
{{@partial 'app'}}

{{@yield "header"}}
    <h1 class="custom-header">{{title}}</h1>
    <div class="subtitle">{{subtitle}}</div>
{{/yield}}

{{@yield "content"}}
    <div class="custom-content">
        {{{content}}}
        {{@if features}}
        <div class="features">
            <h2>Features</h2>
            <ul>
                {{@each features}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </div>
        {{/if}}
    </div>
{{/yield}}

{{/partial}}
```

### Nesting Layouts

You can nest layouts and partials for complex page structures:

```html
{{@partial 'app'}}

{{@yield "content"}}
    {{@partial 'two-column'}}
    
    {{@yield "sidebar"}}
        <!-- Custom sidebar content -->
    {{/yield}}
    
    {{@yield "main"}}
        <!-- Custom main content -->
    {{/yield}}
    
    {{/partial}}
{{/yield}}

{{/partial}}
```

This creates highly reusable templates while minimizing code duplication.

## License

MIT

## Author

[@misits](https://github.com/misits) 