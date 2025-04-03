---
theme: "index"
title: "Home Page"
name: "Epitome"
summary: "A lightweight static site generator for creating beautiful single-page websites and landing pages from markdown files."

# Repo informations
repo: "https://github.com/misits/epitome"
author: "@misits"
author_website: "https://misits.ch"
version: 1.0.0

# Table of content
table_of_content:
  - title: "Installation"
    anchor: "#installation"
  - title: "Quick Start"
    anchor: "#quick-start"
  - title: "Create Your Content"
    anchor: "#create-your-content"
  - title: "Customizing Your Site"
    anchor: "#customizing-your-site"
  - title: "Advanced Usage"
    anchor: "#advanced-usage"
  - title: "Troubleshooting"
    anchor: "#troubleshooting"
---

## Installation

Clone the repository directly from GitHub:

```bash
git clone https://github.com/misits/epitome.git
cd epitome
npm install
```

This will install all the necessary dependencies for epitome.

## Quick Start

1. Create a markdown file for your content (default location is `md/page.md`)
2. Add your content to the markdown file (see [Create Your Content](#create-your-content))
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

5. Your generated website will be in the `public` directory. Open `public/index.html` in your browser to view it.

## Create Your Content

Your content is written in markdown with YAML frontmatter. The frontmatter (between the `---` markers) contains structured data about your page, while the markdown content below provides the main body.

## Customizing Your Site

The frontmatter uses YAML syntax and can contain any properties you want to use in your templates. The only required property is `theme`, which specifies which template to use.

```yaml
---
theme: "default"
title: "My Page Title"
subtitle: "A subtitle for my page"
author: "Your Name"
date: "2023-04-15"
tags: ["example", "markdown", "static site"]
---

Here goes you markdown content

<p>This syntax also work</p>
```

### Creating Custom Themes

1. Create a new HTML template in `src/templates/` (e.g., `custom-theme.html`)
2. Create a matching SCSS file in `src/scss/` (e.g., `custom-theme.scss`)
3. Specify your theme in the markdown frontmatter: `theme: "custom-theme"`
4. Create a .md file in `src/md/` (e.g., `custom-theme.md`)

#### SCSS Styling

Create a matching SCSS file for your template:

```scss
@use 'global';

.theme-custom-theme {
  // Your styles here
}
```

## Advanced Usage

### CLI Options

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

## Troubleshooting

### Common Issues

1. **Missing Templates**: If you get an error about missing templates, make sure you have created the template file in the correct location (`src/templates/[theme].html`).
2. **SCSS Compilation Issues**: Check that you have all necessary SCSS files in the correct location (`src/scss/[theme].scss` and `src/scss/global.scss`).
3. **Data Not Showing**: Make sure your frontmatter is correctly formatted with proper indentation and YAML syntax.

### Debugging

To enable debugging output, use the `--debug` flag:

```bash
epitome --debug
```

For more specific debugging, you can specify debug levels:

```bash
epitome --debug --debug-level template,data,parse
```

### Getting Help

If you encounter issues not covered in this guide, please:

1. Check the [GitHub repository](https://github.com/misits/epitome/issues) for existing issues
2. Open a new issue with detailed information about your problem 