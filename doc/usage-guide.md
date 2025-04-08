# epitome Usage Guide

This guide explains how to use epitome to create beautiful landing pages and single-page websites from markdown content.

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Create Your Content](#create-your-content)
4. [Customizing Your Site](#customizing-your-site)
5. [Advanced Usage](#advanced-usage)
6. [Troubleshooting](#troubleshooting)

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

### Frontmatter Structure

The frontmatter uses YAML syntax and can contain any properties you want to use in your templates. The only required property is `theme`, which specifies which template to use.

#### Basic Frontmatter

```yaml
---
theme: "default"
title: "My Page Title"
subtitle: "A subtitle for my page"
author: "Your Name"
date: "2023-04-15"
tags: ["example", "markdown", "static site"]
---
```

#### Nested Data Structures

Epitome fully supports nested data structures in your frontmatter, which is useful for organizing related information:

```yaml
---
theme: "portfolio"
title: "Portfolio"
name: "John Smith"

# Hero section data
hero:
  title: "Creative Designer & Developer"
  text: "I create beautiful digital experiences that drive results."
  cta:
    - label: "View Work"
      url: "#projects"
    - label: "Contact Me"
      url: "#contact"

# Projects section
projects:
  title: "My Recent Work"
  description: "Here are some projects I've worked on recently."
  featured:
    - name: "E-commerce Website"
      description: "A full-featured online store built with React."
      image: "project1.jpg"
      url: "https://example.com/project1"
    - name: "Mobile App"
      description: "An iOS/Android application for fitness tracking."
      image: "project2.jpg"
      url: "https://example.com/project2"
---
```

#### Accessing Nested Data in Templates

You can access any level of nested data in your templates using dot notation:

```html
<!-- Basic properties -->
<title>{{title}} - {{name}}</title>

<!-- Nested properties -->
<div class="hero">
  <h1>{{hero.title}}</h1>
  <p>{{hero.text}}</p>
  
  <!-- First CTA button -->
  <a href="{{hero.cta.0.url}}" class="button primary">{{hero.cta.0.label}}</a>
  
  <!-- Second CTA button, if it exists -->
  {{@if hero.cta.1}}
    <a href="{{hero.cta.1.url}}" class="button secondary">{{hero.cta.1.label}}</a>
  {{/if}}
</div>

<!-- Accessing nested arrays with @each -->
<div class="projects">
  <h2>{{projects.title}}</h2>
  <p>{{projects.description}}</p>
  
  <div class="project-grid">
    {{@each projects.featured}}
      <div class="project-card">
        <img src="{{image}}" alt="{{name}}">
        <h3>{{name}}</h3>
        <p>{{description}}</p>
        <a href="{{url}}">View Project</a>
      </div>
    {{/each}}
  </div>
</div>
```

#### Best Practices for Structured Data

1. **Organize Related Data**: Group related properties under meaningful parent keys
   ```yaml
   contact:
     email: "john@example.com"
     phone: "+1 (123) 456-7890"
     address: "123 Main St, City, Country"
   ```

2. **Use Arrays for Collections**: Consistent arrays work best for iterable content
   ```yaml
   skills:
     - name: "Web Development"
       level: "Expert"
     - name: "UI/UX Design"
       level: "Advanced"
   ```

3. **Consistent Properties**: Ensure each item in an array has the same properties
   ```yaml
   services:
     - title: "Web Design"
       icon: "palette.svg"
       description: "Beautiful, responsive websites"
     - title: "Development"
       icon: "code.svg"
       description: "Clean, efficient code"
   ```

4. **Use Nested Objects Sparingly**: While you can nest objects deeply, keeping your data structure simple will make your templates easier to maintain.

### Example: Product Landing Page

A perfect use case for epitome is to create a product landing page. Here's an example structure for a landing page in `md/page.md`:

```markdown
---
theme: "landing"
title: "SuperApp"
tagline: "The all-in-one solution for your productivity needs"
description: "SuperApp helps you manage tasks, track time, and collaborate with your team in one beautiful interface."
cta_primary: "Get Started for Free"
cta_primary_url: "https://example.com/signup"
cta_secondary: "View Demo"
cta_secondary_url: "https://example.com/demo"
featured_image: "hero-image.png"

# Features section
features:
  - title: "Task Management"
    description: "Organize tasks with priorities, deadlines, and custom labels."
    icon: "tasks.svg"
  - title: "Time Tracking"
    description: "Track time spent on projects with detailed reports and analytics."
    icon: "time.svg"
  - title: "Team Collaboration"
    description: "Work together with real-time updates and communication tools."
    icon: "team.svg"

# Testimonials section
testimonials:
  - quote: "SuperApp has transformed how our team works together. We've improved productivity by 40%."
    author: "Jane Smith"
    position: "CEO, Tech Innovations"
    image: "jane.jpg"
  - quote: "I can't imagine working without SuperApp now. It's intuitive and powerful."
    author: "Mark Johnson"
    position: "Product Manager, StartupXYZ"
    image: "mark.jpg"

# Pricing section
plans:
  - name: "Basic"
    price: "$9"
    period: "monthly"
    features: ["5 Projects", "2 Team Members", "Basic Reports", "Email Support"]
    url: "https://example.com/signup/basic"
  - name: "Pro"
    price: "$29"
    period: "monthly"
    popular: true
    features: ["Unlimited Projects", "10 Team Members", "Advanced Reports", "Priority Support", "API Access"]
    url: "https://example.com/signup/pro"
  - name: "Enterprise"
    price: "$99"
    period: "monthly"
    features: ["Unlimited Everything", "Dedicated Account Manager", "Custom Features", "24/7 Support"]
    url: "https://example.com/signup/enterprise"
---

## Why SuperApp?

SuperApp was designed with one goal in mind: to make your work life simpler and more productive. We believe that great tools should get out of your way and let you focus on what matters most.

## How It Works

1. **Sign up for an account** - Get started with a free trial, no credit card required
2. **Import your existing data** - Easily migrate from other tools
3. **Invite your team** - Collaborate with colleagues for maximum productivity
4. **Customize your workflow** - Adapt SuperApp to fit your unique needs

## Security & Privacy

Your data is always secure with SuperApp. We use industry-standard encryption and never share your information with third parties.

## Get Started Today

Join thousands of teams who have already transformed their workflow with SuperApp.
```

### Example: CV/Resume

Another common use case for epitome is to create a CV or resume website. Here's an example:

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

### Example: Blog Post

You can also create a blog post:

```markdown
---
theme: "blog"
title: "Getting Started with JavaScript"
author: "Jane Smith"
date: "2023-04-15"
tags: ["javascript", "web development", "programming"]
featured_image: "js-header.jpg"
summary: "A beginner's guide to JavaScript programming language"
---

# Getting Started with JavaScript

JavaScript is one of the most popular programming languages in the world. It's essential for web development and can be used for both front-end and back-end applications.

## Why Learn JavaScript?

1. **Ubiquity**: It runs in browsers, servers, mobile devices, and more
2. **Versatility**: Can be used for web, mobile, desktop, and even IoT applications
3. **Community**: Large community with countless resources and libraries

## Basic Syntax

Here's a simple example of JavaScript code:

```javascript
// Variables
const name = "John";
let age = 30;

// Functions
function greet(person) {
  return `Hello, ${person}!`;
}

// Output
console.log(greet(name));
```

Stay tuned for more JavaScript tutorials!
```

### Markdown Content

After the frontmatter, you can add any content in markdown format. This is the main body of your page and can include:

- Headers (# H1, ## H2, etc.)
- Paragraphs
- Lists (ordered and unordered)
- Links and images
- Code blocks
- Blockquotes
- Tables
- And any other markdown features

## Customizing Your Site

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