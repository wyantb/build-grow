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

### Typical UI Development Cycle
1. **Start development server**: Run `npm run dev` to start the development server with hot reloading
2. **Make UI changes**: Edit HTML/templates, CSS, or TypeScript files as needed
3. **Test iteratively**: Check changes in the browser (http://localhost:3000) as you work
4. **Verify build**: Run `npm run build` to ensure production build works correctly
5. **Commit changes**: Add and commit source files only (not generated files)

### Adding New Features
1. **Plan the feature**: Determine what components/UI elements are needed
2. **Create branch**: Work on a feature branch for larger changes
3. **Implement incrementally**: 
   - Add new UI elements to templates/HTML
   - Style with CSS following design principles
   - Add interactivity with TypeScript
4. **Test functionality**: Use `npm run dev` to test as you go
5. **Validate build**: Run `npm run build` to ensure production build works
6. **Update documentation**: Add notes to AGENTS.md if introducing new patterns

### Troubleshooting Process
When encountering unexpected issues:
1. **Check console/network tabs** in browser dev tools for errors
2. **Verify TypeScript compilation**: Run `npx tsc --noEmit` to check for type errors
3. **Clean and restart**: 
   - Stop dev server
   - Run `npm run clean`
   - Restart with `npm run dev`
4. **Full refresh**: If issues persist:
   - Stop dev server
   - Run `npm run clean-all`
   - Run `npm install`
   - Restart with `npm run dev`
