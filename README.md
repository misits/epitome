# Epitome

A lightweight static site generator for creating storytelling web apps. Supports both traditional multi-page sites and single-page applications (SPA).

## Features

- Generate static sites from Markdown files
- Supports traditional multi-page site generation
- Single Page Application (SPA) mode for interactive storytelling experiences
- Automatic scenes compilation from Markdown to JSON
- Local state management for SPA mode
- Theme customization
- Responsive design

## Usage

### Installation

```bash
npm install
```

### Development

For traditional multi-page development:
```bash
npm run dev
```

For SPA mode development:
```bash
npm run dev:spa
```

Watch mode (auto-rebuilds on file changes):
```bash
npm run watch      # Traditional mode
npm run watch:spa  # SPA mode
```

### Building

Build the site in traditional mode:
```bash
npm run build
```

Build the site in SPA mode:
```bash
npm run build:spa
```

### Deployment

Deploy to GitHub Pages:
```bash
npm run deploy:gh-pages     # Deploy current build
npm run deploy:spa          # Build in SPA mode and then deploy
```

## SPA Mode

The SPA mode transforms markdown files into an interactive storytelling experience:

- All Markdown files are compiled into a single `scenes.json` file
- Only one `index.html` is generated
- Client-side navigation between scenes without page reloads
- State persistence using localStorage
- Conditional scene navigation based on user choices
- Animated transitions between scenes

### Markdown Structure for SPA Mode

Each Markdown file represents a scene with the following frontmatter:

```markdown
---
# Scene metadata
title: "Scene Title"
theme: "dark"

# Navigation
next: 
  - id: "another-scene"
    label: "Go to another scene"
    condition: "hasFlag('visited_intro')"
  - id: "alternative-scene"
    label: "Alternative path"

# Effects
set: ["visited_intro"]

# Conditions
condition: "!hasFlag('game_over')"
---

Your scene content in Markdown...
```

## License

MIT