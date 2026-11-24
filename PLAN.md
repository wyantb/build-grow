# Plan for Refactoring to React with Modern UI Components

## Overview

This document outlines a plan to refactor the current TypeScript game implementation to use React with modern UI components. This will improve maintainability, developer experience, and enable more sophisticated UI features.

Note: React dependencies have already been added to the project but implementation hasn't started yet.

## Why Refactor?

### Current Challenges
1. Manual DOM manipulation with `button.addEventListener` and HTML strings in TypeScript
2. Difficult to manage complex UI state and interactions
3. Limited reusability of UI components
4. No built-in accessibility features
5. Hard to implement advanced UI patterns (tooltips, modals, etc.)

### Benefits of React Approach
1. Declarative UI that automatically updates with state changes
2. Component-based architecture for better code organization
3. Access to mature UI libraries (Radix UI, shadcn/ui)
4. Better developer tooling and debugging
5. Improved accessibility and keyboard navigation
6. Easier testing of UI components

## Architecture Considerations

### Tick-Based Game Loop Compatibility

One concern with React is how it integrates with a continuous tick-based game loop. Here's how we can make it work:

#### Option 1: State Batching (Previously Recommended)
- Use React's `useState` for game state
- Batch updates from the game engine and trigger React renders at intervals (e.g., 30fps)
- Use `useEffect` to subscribe to game engine events
- This maintains the benefits of React while keeping performance reasonable

#### Option 2: Hybrid Approach
- Keep the game engine separate from React
- Use React only for UI overlays, menus, and non-critical interfaces
- Direct DOM manipulation for core gameplay elements that update frequently

#### Option 3: React with requestAnimationFrame and useRef (Current Recommendation)
- Use `useRef` for game state instead of `useState` to avoid unnecessary re-renders
- Implement `useAnimationFrameLoop` from `react-timing-hooks` for efficient rendering
- Decouple game engine ticks from UI updates for better performance
- Use selective rendering strategies to only update components when relevant data changes
- Leverage React's component model with memoization for optimal performance

This approach provides the best balance of React's benefits with game-specific performance requirements.
## Implementation Strategy

### Phase 1: Foundation Setup
1. Install React, React DOM, Vite React plugin, and react-timing-hooks
2. Set up Tailwind CSS for styling
3. Configure build process to support both existing code and new React components
4. Create a simple React wrapper component for the existing game
5. Implement useGameLoop hook with requestAnimationFrame for efficient rendering

### Phase 2: Core UI Migration
1. Migrate resource display to React component
2. Convert building grid to React components with proper state management
3. Implement job assignment UI with React state
4. Replace manual event listeners with React event handlers

### Phase 3: Advanced UI Components
1. Integrate Radix UI for accessible primitives
2. Create custom component library inspired by shadcn/ui
3. Implement sophisticated tooltip system
4. Add modal dialogs for game actions
5. Create responsive layout components

### Phase 4: Game Engine Integration
1. Wrap game engine in React context/provider pattern
2. Create hooks for accessing game state and actions
3. Implement proper state synchronization between engine and UI using useRef
4. Optimize rendering performance using requestAnimationFrame and selective updates
5. Implement delta tracking to only re-render components when relevant data changes

## Technical Details

### Dependencies to Install
```json
{
  "dependencies": {
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "zod": "^4.6.7",
    "react-timing-hooks": "^5.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.3.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "@radix-ui/react-tooltip": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0"
  }
}
```

Note: React and related dependencies have already been added to the project. TailwindCSS, Radix UI, and react-timing-hooks dependencies still need to be installed.

### File Structure Changes
```
src/
├── components/              # React components
│   ├── ui/                  # Generic UI components (buttons, cards, etc.)
│   ├── game/                # Game-specific components (resources, buildings, etc.)
│   │   ├── ResourcePanel.tsx # Resource display component
│   │   ├── BuildingGrid.tsx # Building grid component
│   │   └── JobPanel.tsx     # Job assignment component
│   └── layout/              # Layout components
├── hooks/                   # Custom React hooks
│   ├── useGameState.ts      # Hook for game state integration
│   └── useGameLoop.ts       # Hook for game loop with requestAnimationFrame
├── lib/                     # Utility functions
│   └── gameEngine.ts        # Game engine wrapper
├── styles/                  # CSS/Tailwind configuration
└── App.tsx                  # Main React application component
```

Note: The current file structure doesn't include React components yet as the implementation hasn't started. The existing files (main.ts, systems/, types/, ui/) contain the original non-React implementation.

### Performance Optimization Strategies

1. **useRef for Game State**: Store game state in `useRef` instead of `useState` to prevent unnecessary re-renders
2. **Selective Rendering**: Only render UI elements that are visible/active or have changed data
3. **React.memo**: Use `React.memo` for components that render frequently but rarely change
4. **Virtualization**: For large lists of buildings/jobs
5. **Context Selectors**: Use libraries like `use-context-selector` to prevent unnecessary re-renders
6. **requestAnimationFrame**: Use `useAnimationFrameLoop` for smooth UI updates synchronized with browser refresh rate
7. **Delta Updates**: Only update UI components when relevant game state changes occur

## Migration Path

### Approach 1: Gradual Migration (Recommended)
1. Keep existing implementation running alongside new React version
2. Migrate one component at a time
3. Use feature flags to switch between implementations
4. Test thoroughly at each step

Note: The current implementation is still using the original non-React approach with manual DOM manipulation.

### Approach 2: Big Bang Migration
1. Complete rewrite in React
2. Thorough testing before deployment
3. Faster overall but higher risk

## Timeline Estimate

| Phase | Duration | Description |
|-------|----------|-------------|
| Setup | 2 days | Environment configuration, basic React setup |
| Core UI | 5 days | Migrate main game UI components |
| Advanced UI | 3 days | Implement sophisticated UI patterns |
| Integration | 4 days | Connect game engine with React state management |
| Testing | 2 days | Performance optimization and bug fixing |

## Risks and Mitigations

### Performance Concerns
- **Risk**: Frequent game ticks causing React rendering overhead
- **Mitigation**: Use useRef for game state and requestAnimationFrame for rendering to decouple game logic from UI updates

### Learning Curve
- **Risk**: Team unfamiliarity with React patterns
- **Mitigation**: Provide training materials and pair programming sessions

### Compatibility Issues
- **Risk**: Existing game logic doesn't integrate smoothly with React
- **Mitigation**: Maintain hybrid approach initially, refactor incrementally

## Working with React's Component Model

To effectively work with React's component model for this game:

1. **Component Structure**: Organize components hierarchically (ResourcePanel, BuildingGrid, JobPanel) to match game UI sections
2. **Props-Driven Updates**: Pass only necessary data as props to minimize re-render scope
3. **React.memo**: Apply to components that receive frequent updates but rarely change visibly
4. **Key-based Lists**: Use stable keys for building/job lists to optimize React's reconciliation
5. **Context Selectors**: Use `use-context-selector` to prevent unnecessary re-renders from context changes
6. **Delta Tracking**: Compare previous and current game states to determine which components need updates
7. **Conditional Rendering**: Only render components when relevant data exists or is visible

This approach ensures efficient rendering while maintaining React's declarative benefits without forcing constant re-renders.

## Success Metrics

1. Improved developer productivity (measured by time to implement new features)
2. Better UI performance and responsiveness
3. Increased code maintainability (measured by code review feedback)
4. Enhanced accessibility compliance
5. Reduced bug count in UI-related issues

## Next Steps

1. Review this plan with stakeholders
2. Decide on migration approach (gradual vs. big bang)
3. Install remaining dependencies (TailwindCSS, Radix UI, react-timing-hooks)
4. Set up development environment for React
5. Begin Phase 1 implementation
6. Create prototype demonstrating React integration with game engine using requestAnimationFrame

Note: React dependencies are already installed but implementation hasn't started yet.