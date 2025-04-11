---
id: index
title: The Journey Begins
name: Epitome
summary: 'You stand at a crossroads, with two paths stretching before you.'
next:
  - id: chapter-1a
    label: Take the forest path
  - id: chapter-1b
    label: Take the mountain trail
previous:
  - id: index
    label: Start
variables: []
introduction: >
  Welcome to your adventure! You stand at a crossroads, with two paths
  stretching before you.


  To the left, a path winds its way into a dense, mysterious forest. To the
  right, a trail climbs up the side of a majestic mountain.


  Which path will you choose?
---

<div class="container h-screen flex flex-col item-center justify-center">
  <h1>{{title}}</h1>

  {{introduction}}

  <div class="right-choices">
    {{@each next}}
      <button data-scene-id="{{id}}">{{label}}</button>
    {{/each}}
  </div>
</div>
