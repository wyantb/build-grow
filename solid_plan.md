# Plan for Refactoring to SolidJS

## Overview

This document outlines a plan to refactor the current TypeScript game implementation to use SolidJS. This will improve performance, developer experience, and enable more sophisticated UI features while leveraging Solid's fine-grained reactivity system.

## Why Refactor to SolidJS?

### Current Challenges with Vanilla JS Approach
1. Manual DOM manipulation with `button.addEventListener` and HTML strings in TypeScript
2. Difficult to manage complex UI state and interactions
3. No built-in reactivity system
4. Hard to implement advanced UI patterns (tooltips, modals, etc.)

### Benefits of SolidJS Approach
1. Fine-grained reactivity that automatically updates with state changes
2. Component-based architecture for better code organization
3. No virtual DOM - direct DOM updates for better performance
4. Built-in accessibility features
5. Better developer tooling and debugging
6. Easier testing of UI components

## Architecture Considerations

### Tick-Based Game Loop Compatibility

SolidJS's fine-grained reactivity system works well with tick-based game loops:

1. **Signal-Based State Management**: Use Solid's signals for game state instead of manual DOM updates
2. **Selective Updates**: Only components that depend on changed signals will re-run
3. **Efficient Rendering**: No virtual DOM diffing overhead
4. **Reactive Context**: Game state changes automatically propagate to dependent UI elements

### Performance Optimization Strategies

1. **Fine-Grained Reactivity**: Use signals and memos for efficient state management
2. **Selective Rendering**: Only render UI elements that are visible/active
3. **Resource-Specific Signals**: Each resource type has its own signal for independent updates
4. **Batch Updates**: Group multiple state changes to reduce re-render frequency
5. **Lazy Components**: Use Suspense and lazy loading for complex UI sections

## Implementation Strategy

### Phase 1: Foundation Setup
1. Install SolidJS, vite-plugin-solid, and related dependencies
2. Set up Vite configuration for SolidJS
3. Create basic component structure
4. Migrate main game entry point to SolidJS

### Phase 2: Core UI Migration
1. Migrate resource display to SolidJS component with signals
2. Convert building grid to SolidJS components with proper state management
3. Implement job assignment UI with SolidJS reactivity
4. Replace manual event listeners with SolidJS event handlers

### Phase 3: Advanced UI Components
1. Implement sophisticated tooltip system using SolidJS primitives
2. Add modal dialogs for game actions
3. Create responsive layout components
4. Integrate Lucide icons for better visual design

### Phase 4: Game Engine Integration
1. Wrap game engine in SolidJS reactive context
2. Create signals for accessing game state and actions
3. Implement proper state synchronization between engine and UI
4. Optimize rendering performance using SolidJS fine-grained reactivity

## Technical Details

### Dependencies to Install
```json
{
  "dependencies": {
    "solid-js": "^1.8.0",
    "solid-app-router": "^0.4.2",
    "lucide-solid": "^0.292.0",
    "@tsparticles/slim": "^2.12.0"
  },
  "devDependencies": {
    "vite-plugin-solid": "^2.7.0"
  }
}
```

### File Structure Changes
```
src/
├── components/              # SolidJS components
│   ├── ui/                 # Generic UI components (buttons, cards, etc.)
│   ├── game/               # Game-specific components (resources, buildings, etc.)
│   │   ├── ResourcePanel.tsx # Resource display component
│   │   ├── BuildingGrid.tsx # Building grid component
│   │   └── JobPanel.tsx     # Job assignment component
│   └── layout/             # Layout components
├── hooks/                  # Custom SolidJS hooks
│   └── useGameState.ts     # Hook for game state integration
├── lib/                    # Utility functions
│   └── gameEngine.ts       # Game engine wrapper
├── styles/                 # CSS/Styling configuration
└── App.tsx                 # Main SolidJS application component
```

## Migration Path

### Big Bang Migration
1. Complete rewrite in SolidJS
2. Thorough testing before deployment
3. Faster overall but higher risk
