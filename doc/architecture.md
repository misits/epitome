# epitome Architecture

This document explains the architecture and design principles of epitome, a static site generator for CV/resume creation.

## Overview

Epitome follows a modular architecture that separates concerns into different components. The system is designed to be extensible and maintainable, allowing for easy addition of new features and themes.

```
┌─────────────────────┐
│                     │
│      Generator      │
│                     │
└───────────┬─────────┘
            │
            │ coordinates
            ▼
┌───────────┴─────────┐
│                     │
│  Core Components    │
│                     │
└───────────┬─────────┘
            │
            │ processes
            ▼
┌───────────┴─────────┐
│                     │
│     Output Site     │
│                     │
└─────────────────────┘
```

## Component Structure

The system consists of the following main components:

1. **Generator**: The main orchestrator that coordinates the build process
2. **MarkdownProcessor**: Handles parsing markdown files and extracting frontmatter data
3. **HandlebarsLikeEngine**: Processes templates with a syntax similar to Handlebars
4. **AssetProcessor**: Handles SCSS compilation and other asset processing
5. **Logger**: Provides debugging and logging capabilities

## Component Relationships

```
┌───────────────┐      ┌────────────────────┐
│               │      │                    │
│   Generator   │─────▶│  MarkdownProcessor │
│               │      │                    │
└───────┬───────┘      └────────────────────┘
        │
        │              ┌────────────────────┐
        │              │                    │
        ├─────────────▶│ HandlebarsLikeEngine│
        │              │                    │
        │              └────────────────────┘
        │
        │              ┌────────────────────┐
        │              │                    │
        ├─────────────▶│   AssetProcessor   │
        │              │                    │
        │              └────────────────────┘
        │
        │              ┌────────────────────┐
        │              │                    │
        └─────────────▶│       Logger       │
                       │                    │
                       └────────────────────┘
```

## Data Flow

The data flow through the system follows these steps:

1. **Input**: Markdown files with frontmatter (YAML) containing structured data
2. **Processing**:
   - Parse markdown and extract frontmatter data
   - Convert markdown content to HTML
   - Process template with data and content
   - Compile SCSS to CSS
3. **Output**: Static HTML website with styling

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│             │     │              │     │            │
│  Markdown   │────▶│  Processor   │────▶│    HTML    │
│             │     │              │     │            │
└─────────────┘     └──────────────┘     └────────────┘
                          │
                          ▼
                    ┌──────────────┐     ┌────────────┐
                    │              │     │            │
                    │     SCSS     │────▶│     CSS    │
                    │              │     │            │
                    └──────────────┘     └────────────┘
```

## Project Structure

The project is structured as follows:

```
epitome/
├── doc/                # Documentation
├── src/
│   ├── index.ts        # Main export point
│   ├── cli.ts          # CLI implementation
│   ├── lib/            # Core functionality
│   │   ├── Generator.ts
│   │   ├── MarkdownProcessor.ts
│   │   ├── HandlebarsLikeEngine.ts
│   │   ├── AssetProcessor.ts
│   │   └── Logger.ts
│   ├── scss/           # SCSS styling
│   │   ├── global.scss
│   │   └── default.scss
│   ├── templates/      # HTML templates
│   │   └── default.html
│   └── types/          # TypeScript type definitions
├── md/                 # Markdown content
├── public/             # Generated output
└── package.json
```

## Design Principles

Epitome follows these key design principles:

1. **Separation of Concerns**: Each component has a specific responsibility
2. **Extensibility**: The system is designed to be easily extended with new themes and features
3. **Simplicity**: The API and user interface are kept simple and intuitive
4. **Modularity**: Components are modular and can be replaced or extended independently

## Build Process

The build process is orchestrated by the Generator class and follows these steps:

1. **Read and Parse Markdown**: The markdown file is read and parsed to extract frontmatter data and content
2. **Convert Markdown to HTML**: The markdown content is converted to HTML
3. **Load Template**: The specified theme template is loaded from the templates directory
4. **Create Context**: A context object is created combining the frontmatter data and HTML content
5. **Process Template**: The template is processed with the context to generate HTML
6. **Write HTML Output**: The processed HTML is written to the output directory
7. **Compile SCSS**: The SCSS file for the theme is compiled to CSS and written to the output directory

## Extension Points

The main extension points in the architecture are:

1. **Templates**: Create new HTML templates with the Handlebars-like syntax
2. **Styles**: Create new SCSS files for custom themes
3. **Template Engine**: Extend the HandlebarsLikeEngine to add custom helpers
4. **Markdown Processor**: Extend the MarkdownProcessor to customize data normalization 