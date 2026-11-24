# Plan for Refactoring to React with Modern UI Components

## Overview

This document outlines a plan to refactor the current TypeScript game implementation to use React with modern UI components (Radix UI, Tailwind CSS, and shadcn-inspired components). This will improve maintainability, developer experience, and enable more sophisticated UI features.

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

#### Option 1: State Batching (Recommended)
- Use React's `useState` for game state
- Batch updates from the game engine and trigger React renders at intervals (e.g., 30fps)
- Use `useEffect` to subscribe to game engine events
- This maintains the benefits of React while keeping performance reasonable

#### Option 2: Hybrid Approach
- Keep the game engine separate from React
- Use React only for UI overlays, menus, and non-critical interfaces
- Direct DOM manipulation for core gameplay elements that update frequently

#### Option 3: React with requestAnimationFrame
- Use React's concurrent mode features
- Sync game engine ticks with React's rendering cycle
- More complex but provides the smoothest integration

## Implementation Strategy

### Phase 1: Foundation Setup
1. Install React, React DOM, and Vite React plugin
2. Set up Tailwind CSS for styling
3. Configure build process to support both existing code and new React components
4. Create a simple React wrapper component for the existing game

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
3. Implement proper state synchronization between engine and UI
4. Optimize rendering performance for frequent updates

## Technical Details

### Dependencies to Install
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.21.4"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "@radix-ui/react-tooltip": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0"
  }
}
```

### File Structure Changes
```
src/
├── components/           # React components
│   ├── ui/             # Generic UI components (buttons, cards, etc.)
│   ├── game/           # Game-specific components (resources, buildings, etc.)
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
│   └── useGameState.ts # Hook for game state integration
├── lib/                # Utility functions
│   └── gameEngine.ts   # Game engine wrapper
├── styles/             # CSS/Tailwind configuration
└── App.tsx             # Main React application component
```

### Performance Optimization Strategies

1. **Memoization**: Use `React.memo` for components that render frequently
2. **Selective Rendering**: Only render UI elements that are visible/active
3. **Virtualization**: For large lists of buildings/jobs
4. **State Batching**: Group multiple state updates to reduce render frequency
5. **Context Selectors**: Use libraries like `use-context-selector` to prevent unnecessary re-renders

## Migration Path

### Approach 1: Gradual Migration (Recommended)
1. Keep existing implementation running alongside new React version
2. Migrate one component at a time
3. Use feature flags to switch between implementations
4. Test thoroughly at each step

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
- **Mitigation**: Implement state batching and selective rendering strategies

### Learning Curve
- **Risk**: Team unfamiliarity with React patterns
- **Mitigation**: Provide training materials and pair programming sessions

### Compatibility Issues
- **Risk**: Existing game logic doesn't integrate smoothly with React
- **Mitigation**: Maintain hybrid approach initially, refactor incrementally

## Success Metrics

1. Improved developer productivity (measured by time to implement new features)
2. Better UI performance and responsiveness
3. Increased code maintainability (measured by code review feedback)
4. Enhanced accessibility compliance
5. Reduced bug count in UI-related issues

## Next Steps

1. Review this plan with stakeholders
2. Decide on migration approach (gradual vs. big bang)
3. Set up development environment for React
4. Begin Phase 1 implementation
5. Create prototype demonstrating React integration with game engine