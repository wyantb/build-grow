# Project Conventions

## UI Design Principles

### Layout Structure
- Keep UI compact with minimal header (max 24px height)
- Resources always listed on the left column
- Main section body uses tabbed navigation (Buildings, Jobs as primary tabs)
- Mobile responsive design:
  - Wide screens: Left resources + tabbed main content
  - Narrow screens: Resources also becomes a tab

### Visual Design
- No gradients - use flat colors without opacity
- Minimalist approach with clear hierarchy
- Consistent spacing and alignment

### Color Palette
- Primary: Dark backgrounds (#1a1a1a)
- Secondary: Medium grays (#333333)
- Accent: Blue for interactive elements (#4d9de0)
- Status colors: Green (positive), Red (negative), Yellow (warning)

### UI Component Structure
- Header: Max 24px height
- Left Panel: Resources display
- Main Content: Tabbed interface (Buildings, Jobs, Actions)
- Responsive design that adapts to screen width

## Code Organization

### File Structure
```
src/
├── main.ts              # Entry point
├── styles/              # CSS files
├── types/               # Zod schemas and TypeScript types
├── systems/             # Core game logic
└── ui/                  # UI components
```

### Component Architecture
- GameEngine: Core game state and logic
- GameUI: Presentation layer
- Components should be modular and reusable
- State management through GameEngine events

## Development Workflow

### Build Process
- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm run clean`: Remove build artifacts
- `npm run clean-all`: Full clean including node_modules

### Debugging Build Issues
When encountering build errors like "[UNRESOLVED_ENTRY] Cannot resolve entry module public/index.html":
1. Run `npm run clean` to remove build artifacts
2. Delete generated files: `find src -name "*.js" -delete && find src -name "*.d.ts" -delete && find src -name "*.map" -delete`
3. Rebuild with `npm run build`
4. If issues persist, check import paths and ensure they match the module resolution requirements (.js extensions)

For TypeScript compilation errors:
1. Run `npx tsc --noEmit` to check for type errors
2. Fix import paths (ensure .js extensions for ESM)
3. Clean and rebuild

### Testing
- Manual testing during development
- Visual verification of UI changes
- Performance considerations for mobile