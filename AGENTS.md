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
├── data/                # Static game content (building catalog, etc.)
├── systems/             # Core game logic
├── hooks/               # SolidJS hooks bridging engine and store
└── components/game/     # SolidJS components
```

### Component Architecture
- GameEngine: Core game state and logic. Owns the authoritative state and is the **single writer**.
- Solid store (`useGameState`): a reactive **mirror** of the engine, not a second writer.
- Components should be modular and reusable
- State management through GameEngine events

### Known gap: styles were not carried over from the vanilla-UI era
The Solid refactor rewrote every component, but `src/styles/main.css` was never
updated to match. The stylesheet still targets the old markup:
- Components render `.building-card`, `.job-card`, `.market-panel`,
  `.construction-progress`, `.worker-button`, ... but **none of those selectors
  exist in the CSS**, so cards render as unstyled text.
- Conversely the CSS still defines the old `.building-item`, `.job-row`,
  `.resource-item`, `.rate-item` ... which no component emits.
- `AGENTS.md` requires a mobile layout where Resources also becomes a tab, but
  the `.mobile-tabs` CSS exists with **no matching markup** in `App.tsx`.

Restoring the visual design is a separate, dedicated project. `SOLID2_MIGRATION.md`
covers the framework upgrade; neither replaces the other.

### SolidJS / TypeScript Conventions
- `verbatimModuleSyntax` is on: type-only imports must use `import type`, otherwise they
  survive into the bundle and break at runtime (e.g. `SetStoreFunction`, `Component`).
- `moduleResolution: node16` requires relative imports to carry a `.js` extension.
- The game engine must not be mutated through a Solid store proxy: the dev build of
  Solid's store blocks direct proxy writes ("Cannot mutate a Store directly").
- When mirroring engine state into a Solid store, write nested fields one by one.
  Passing the engine's own nested object hits Solid's identity check
  (`setProperty` returns early when `state[property] === value`) and silently skips
  the reactivity update, which freezes the UI counters.
- Verify Solid reactivity **in the browser**. Node resolves `solid-js` to its *server*
  build, where `createEffect` never runs and reactivity tests give false negatives.

### Solid 2 (`solid-js@2.0.3`)
Solid 2 is GA and the current `latest` tag. The upgrade is applied; see
`SOLID2_MIGRATION.md` for the plan, the measurements, and the defects found during
verification. Key differences from Solid 1 that affect this codebase:
- `solid-js/store` no longer exists as an export path: `createStore` comes from `solid-js`.
- The store setter takes a single draft callback instead of a path:
  `setState((state) => { state.resources.wood = 12 })` replaces
  `setState('resources', 'wood', 12)`. The `SetStoreFunction` type was removed outright.
- JSX types and `render` come from `@solidjs/web`, so `tsconfig.json` sets
  `"jsxImportSource": "@solidjs/web"`. The Vite plugin is `@solidjs/vite-plugin`.
- `classList` is gone; use `class={{ 'name': boolean }}` instead.
- `<For>` with `keyed={(item) => key}` passes the child an **Accessor**: read `item().id`.
  Only `keyed={true}` passes the raw item. Mixing the two forms type-checks but
  renders `undefined` at runtime, so read every occurrence through the accessor.
- Solid 2's dev build reports `UNSTABLE_LIST_IDENTITY` when a `<For>` rebuilds rows that
  are equivalent to the ones they replace. Keep list inputs stable (iterate ids or
  catalog entries) and read live records inside the row, instead of copying them into
  the list on every tick.
- Solid 2's dev build reports `STRICT_READ_UNTRACKED` when a reactive value is read
  directly in a component body. Move the read into JSX (a tracking scope), or wrap a
  deliberate one-time snapshot in `untrack()`.
- Packages pinned to Solid 1 peers (`vite-plugin-solid`, `solid-app-router`,
  `lucide-solid`, `solid-refresh`) must be dropped. `solid-app-router`'s Solid 2
  successor is `@solidjs/router`.
- The Solid 2 bundle is larger than Solid 1's: 36.63 kB → 53.31 kB gzip for this app.
  That is the framework, not the app — Solid 2's `createStore` is built on the
  `@solidjs/signals` core. See `SOLID2_MIGRATION.md` §7 for the measurements.


## Development Workflow

### Typical UI Development Cycle
1. **Start development server**: Run `npm run dev` to start the development server with hot reloading
2. **Make UI changes**: Edit HTML/templates, CSS, or TypeScript files as needed
3. **Test iteratively**: Check changes in the browser (http://localhost:3000) as you work
4. **Verify build**: Run `npm run build` to ensure production build works correctly
5. **Commit changes**: Add and commit source files only (not generated files)

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
