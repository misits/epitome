---
theme: "default"
title: "Home Page"
name: "Epitome Generator"
job: "Static Site Generator"
email: "info@epitome.dev"
github: "misits"
website: "https://github.com/misits/epitome"
summary: "A lightweight static site generator for creating beautiful single-page websites and landing pages from markdown files."
experience:
  - company: "Landing Pages"
    title: "Quick and Beautiful"
    tasks: ["Perfect for personal websites", "Ideal for product landing pages", "Great for portfolio sites", "Excellent for CVs and resumes"]
  - company: "Documentation Sites"
    title: "Simple but Powerful"
    tasks: ["Easy-to-maintain content with markdown", "Structured data with frontmatter", "Customizable templates", "Responsive design out of the box"]
education:
  - school: "Markdown-based"
    faculty: "Content Creation"
    degree: "Write your content in easy-to-maintain markdown files with YAML frontmatter"
  - school: "Flexible Templates"
    faculty: "Design"
    degree: "Customize the look and feel with HTML templates and SCSS styling"
  - school: "Fast & Optimized"
    faculty: "Performance"
    degree: "CSS minification for optimized performance with single-command generation"
work:
  - project: "Default Theme"
    summary: "The standard theme with a clean, professional design suitable for most websites"
    date: "2023"
    technologies: ["Responsive layout", "Mobile-friendly", "Clean typography", "Customizable sections"]
  - project: "Basic Theme"
    summary: "A minimal theme focused purely on content, perfect for documentation or simple pages"
    date: "2023"
    technologies: ["Content-focused", "Minimal styling", "Fast loading", "Distraction-free"]
  - project: "Custom Themes"
    summary: "Create your own themes by adding HTML templates and SCSS files to the project"
    date: "2023"
    technologies: ["Full customization", "Template variables", "Conditional rendering", "Custom styling"]
---

# Welcome to Epitome

Epitome is a simple yet powerful static site generator designed to create beautiful, responsive websites from markdown content. It's especially well-suited for landing pages and single-page websites where you want to go from content to published site with minimal effort.

## Quick Start

Getting started with Epitome is straightforward:

```bash
# Clone the repository
git clone https://github.com/misits/epitome.git
cd epitome

# Install dependencies
npm install

# Start development server
npm run dev
```

## How It Works

1. **Create markdown files** with YAML frontmatter for structured data
2. **Choose or create a theme** by defining HTML templates
3. **Style your site** with SCSS files
4. **Generate your site** with a single command
5. **Deploy anywhere** - it's just static HTML and CSS!

## Command Line Options

Epitome offers various command line options for customization:

```bash
epitome [options]

Options:
  --page, -p <file>         Page markdown file (default: index.md)
  --output, -o <dir>        Output directory (default: ./public)
  --md-dir <dir>            Markdown files directory (default: ./md)
  --templates-dir <dir>     Templates directory (default: ./src/templates)
  --scss-dir <dir>          SCSS directory (default: ./src/scss)
  --dev                     Start development server with live reload
  --no-minify               Disable CSS minification
```

[Check out the About page](about/) to see another example page or visit the [GitHub repository](https://github.com/misits/epitome) for more information.