---
# Theme
theme: "index"

# Head
title: "Chapter 1"
name: "Epitome"
summary: "Chapter 1a"

# Navigation
next: 
  - id: "chapter-2a"
    condition: "choice.path === 'forest'"
  - id: "chapter-2b"
    condition: "choice.path === 'mountain'"

# Variables
variables: []
---
