---
# Theme

# Head
title: "The Forest Path"
name: "Epitome"
summary: "You venture into the mysterious forest, surrounded by towering trees and the sounds of wildlife."

# Navigation
next: 
  - id: "chapter-2a"
    label: "Take the path to the left"
    condition: "choice.path === 'forest'"
  - id: "chapter-2b"
    label: "Take the path to the right"
    condition: "choice.path === 'mountain'"
  - id: "index"
    label: "Return to the crossroads"

# Variables
variables: []
---

You decide to take the forest path. The trees tower above you, their leaves rustling in the gentle breeze. The air is cool and filled with the scent of pine and earth.

As you venture deeper into the woods, you come across a fork in the path. Sunlight filters through the canopy, creating dappled patterns on the forest floor.

To the left, the path seems to lead deeper into the forest, where the trees grow closer together and the light dims.

To the right, the path appears to wind around the base of the mountain.

There's also the option to return to the crossroads if you've changed your mind.
