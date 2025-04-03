# epitome Usage Guide

This guide explains how to use epitome to create beautiful CV/resume websites from markdown content.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Create Your CV Content](#create-your-cv-content)
4. [Customizing Your CV](#customizing-your-cv)
5. [Advanced Usage](#advanced-usage)
6. [Troubleshooting](#troubleshooting)

## Installation

### Global Installation

If you want to use epitome from anywhere on your system, install it globally:

```bash
npm install -g epitome
```

### Local Project Installation

If you prefer to use epitome within a specific project:

```bash
# Create a new directory for your CV
mkdir my-cv
cd my-cv

# Initialize a new npm project
npm init -y

# Install epitome locally
npm install epitome --save-dev
```

## Quick Start

1. Create the basic directory structure:

```bash
mkdir -p md src/templates src/scss public
```

2. Create a markdown file for your CV:

```bash
touch md/page.md
```

3. Add your content to the markdown file (see [Create Your CV Content](#create-your-cv-content))

4. Run the generator:

```bash
# If installed globally
epitome

# If installed locally
npx epitome
```

5. Your generated CV will be in the `public` directory. Open `public/index.html` in your browser to view it.

## Create Your CV Content

Your CV content is written in markdown with YAML frontmatter. Here's an example structure for your `md/page.md` file:

```markdown
---
theme: "default"
name: "Jane Smith"
title: "Frontend Developer"
summary: "Passionate frontend developer with 5 years of experience creating beautiful and performant web applications."
phone: "+1 (123) 456-7890"
email: "jane@example.com"
location: "Portland, OR"
website: "https://example.com"

# Education section
education:
  - school: "University of Technology"
    faculty: "Computer Science"
    degree: "Bachelor's degree"
    from: "2013"
    to: "2017"
  - school: "Online Academy"
    faculty: "Web Development"
    degree: "Certificate"
    from: "2018"
    to: "2018"

# Experience section
experience:
  - company: "Web Solutions Inc."
    title: "Senior Frontend Developer"
    from: "2020"
    to: "present"
    tasks: 
      - "Led development of the company's flagship product"
      - "Implemented responsive design principles across all projects"
      - "Mentored junior developers"
  
  - company: "Digital Agency"
    title: "Frontend Developer"
    from: "2017"
    to: "2020"
    tasks:
      - "Built responsive websites for clients across various industries"
      - "Collaborated with design team to implement UI/UX improvements"
      - "Improved website performance by 40%"

# Projects section
work:
  - project: "E-commerce Platform"
    summary: "A complete e-commerce solution with shopping cart, user accounts, and payment processing."
    date: "2022"
    preview: "ecommerce-preview.jpg"
    url: "https://example.com/ecommerce"
    technologies: ["React", "Node.js", "MongoDB", "Stripe"]
  
  - project: "Task Management App"
    summary: "A collaborative task management application with real-time updates."
    date: "2021"
    preview: "taskapp-preview.jpg"
    url: "https://example.com/taskapp"
    technologies: ["Vue.js", "Firebase", "Tailwind CSS"]
---

## About Me

I am a frontend developer with a passion for creating beautiful, responsive, and user-friendly web applications. With 5 years of experience in the industry, I have worked on a variety of projects from small business websites to large-scale web applications.

## Skills

- **Languages**: HTML, CSS, JavaScript, TypeScript
- **Frameworks**: React, Vue.js, Angular
- **Tools**: Git, Webpack, Jest, Docker
- **Design**: Figma, Adobe XD, responsive design principles

## Interests

When I'm not coding, I enjoy hiking, photography, and exploring new coffee shops around the city.
```

### Frontmatter Structure

The frontmatter (between the `---` markers) contains structured data about your CV:

- **Basic Information**:
  - `theme`: The theme to use for styling (e.g., "default")
  - `name`: Your full name
  - `title`: Your professional title
  - `summary`: A brief summary of your qualifications
  - `phone`: Your phone number
  - `email`: Your email address
  - `location`: Your location
  - `website`: Your website or online portfolio

- **Education**: An array of education entries, each with:
  - `school`: Institution name
  - `faculty`: Department or faculty
  - `degree`: Degree earned
  - `from`: Start date
  - `to`: End date (or "present"/"now" for ongoing)

- **Experience**: An array of work experiences, each with:
  - `company`: Company name
  - `title`: Your job title
  - `from`: Start date
  - `to`: End date (or "present"/"now" for ongoing)
  - `tasks`: Array of your responsibilities and achievements

- **Projects**: An array of projects, each with:
  - `project`: Project name
  - `summary`: Brief description
  - `date`: Completion date
  - `preview`: Image filename (place in public/assets/img/) or URL
  - `url`: Project URL
  - `technologies`: Array of technologies used

### Markdown Content

After the frontmatter, you can add additional content in markdown format. This is where you can add more detailed information about yourself, your skills, interests, or any other sections you'd like to include.

## Customizing Your CV

### Using Different Themes

To use a different theme, change the `theme` property in your markdown frontmatter:

```yaml
---
theme: "custom-theme"
# other properties...
---
```

### Creating Custom Themes

1. Create a new HTML template in `src/templates/` (e.g., `custom-theme.html`)
2. Create a matching SCSS file in `src/scss/` (e.g., `custom-theme.scss`)
3. Specify your theme in the markdown frontmatter: `theme: "custom-theme"`

#### Template Structure

Templates use a Handlebars-like syntax:

- **Variables**: `{{variable}}`
- **Conditionals**: `{{@if condition}}...{{/if}}`
- **Loops**: `{{@each items}}...{{/each}}`
- **Unescaped HTML**: `{{{content}}}`

Example custom template:

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{name}} | {{title}}</title>
  <link rel="stylesheet" href="style.css">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body class="theme-custom-theme">
  <header class="hero">
    <div class="container">
      <h1>{{name}}</h1>
      <p class="title">{{title}}</p>
      <p class="summary">{{summary}}</p>
    </div>
  </header>
  
  <main class="container">
    {{@if experience}}
    <section class="section">
      <h2>Experience</h2>
      <div class="timeline">
        {{@each experience}}
        <div class="timeline-item">
          <div class="timeline-left">
            <span class="time">{{from}}-{{to}}</span>
          </div>
          <div class="timeline-right">
            <h3>{{title}}</h3>
            <h4>{{company}}</h4>
            {{@if tasks}}
            <ul class="tasks">
              {{@each tasks}}
              <li>{{this}}</li>
              {{/each}}
            </ul>
            {{/if}}
          </div>
        </div>
        {{/each}}
      </div>
    </section>
    {{/if}}
    
    <!-- More sections for education, projects, etc. -->
    
    <section class="content">
      {{{content}}}
    </section>
  </main>
  
  <footer class="footer">
    <div class="container">
      <p>&copy; {{name}} - Created with epitome</p>
    </div>
  </footer>
</body>
</html>
```

#### SCSS Styling

Create a matching SCSS file for your template:

```scss
@use 'global';

.theme-custom-theme {
  // Your styles here
  font-family: 'Roboto', sans-serif;
  color: #333;
  
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 20px;
  }
  
  .hero {
    background-color: #0066cc;
    color: white;
    padding: 60px 0;
    text-align: center;
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    
    .title {
      font-size: 1.5rem;
      margin-bottom: 20px;
    }
    
    .summary {
      font-size: 1.1rem;
      max-width: 600px;
      margin: 0 auto;
    }
  }
  
  // More styles for other components
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

Example with options:

```bash
epitome --page resume.md --output ./dist --debug
```

### Programmatic Usage

You can use epitome programmatically in your Node.js applications:

```javascript
const { Generator } = require('epitome');

// Create a generator instance
const generator = new Generator({
  outputDir: './dist',
  mdDir: './content',
  debug: true
});

// Build with a specific markdown file
generator.build('resume.md', 'index.html');
```

### Multi-page Generation

To generate multiple pages:

```javascript
const { Generator } = require('epitome');
const generator = new Generator();

// Generate main CV
generator.build('cv.md', 'index.html');

// Generate a portfolio page
generator.build('portfolio.md', 'portfolio.html');
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