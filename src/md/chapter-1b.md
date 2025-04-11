---
id: chapter-1b
title: The Mountain Trail
name: Epitome
summary: >-
  You :) climb the rocky mountain trail, enjoying breathtaking views of the
  valley below.
next:
  - id: index
    label: Return to the crossroads
sceneConfig:
  skyColor: "#87CEEB"
  fogColor: "#E6E6FA"
  groundColor: "#8B4513"
cameraConfig:
  position:
    x: 0
    y: 1.6
    z: 5
  lookAt:
    x: 0
    y: 0
    z: -10
lightConfig:
  ambient:
    color: "#FFFFFF"
    intensity: 0.4
  directional:
    color: "#FFFFEB"
    intensity: 0.8
    position:
      x: 1
      y: 1
      z: 0.5
variables: []
---

{{@canvas 100% 100vh #chapter-1b sceneConfig cameraConfig lightConfig}}
