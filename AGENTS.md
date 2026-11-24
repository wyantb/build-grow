# Project Conventions

## UI Design Principles

### Layout Structure
- Keep UI compact with minimal header (max 24px height)
- Resources always listed on the left column
- Main section body uses tabbed navigation (Buildings, Jobs, Market, Settings)
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
├── components/game/     # Game-screen components
└── components/ui/       # Reusable presentation components (Tooltip)
```

### Component Architecture
- GameEngine: Core game state and logic. Owns the authoritative state and is the **single writer**.
- Solid store (`useGameState`): a reactive **mirror** of the engine, not a second writer.
- Components should be modular and reusable
- State management through GameEngine events

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
The app runs Solid 2, the current `latest` tag. These are the Solid 1 → 2
differences that affect this codebase:
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
  `@solidjs/signals` core.

### Tooltips and Settings
- `src/components/ui/Tooltip.tsx` is the only tooltip implementation. Wrap the
  trigger in `<Tooltip content="..." placement="top|right|bottom|left">`.
- The trigger wrapper is `display: contents`, so it does not change the layout of
  its parent. Because the wrapper then has no box of its own, the tooltip measures
  its anchor with a `Range` over the wrapper's contents. Do not swap the wrapper
  back to a plain `inline-flex`: it re-breaks the flex layout of every row it
  is put in.
- The bubble is rendered through `Portal` into `document.body` and is positioned
  with `position: fixed`. It flips to the opposite side when the preferred side
  would overflow the viewport, and is clamped to stay on screen.
- The delay is app-wide and user-configurable. `useSettings` persists it to
  `localStorage` under `build-grow:settings`; the default is 250 ms and 0 ms means
  "show immediately".
- `useSettings` keeps its signal at module scope so every caller shares one
  source of truth. Its persistence effect therefore needs `createRoot`, otherwise
  Solid reports `NO_OWNER_EFFECT`.
- Tooltips open on hover and on keyboard focus, and close on blur, pointer down,
  and mouse leave. Keep new triggers keyboard reachable.
- The Settings tab (`src/components/game/SettingsPanel.tsx`) exposes the delay.
  Read the stored setting inside JSX, not in the component body, to avoid
  `STRICT_READ_UNTRACKED`.

## Linting

ESLint 10 with a flat config in `eslint.config.js`. Run it with `npm run lint`;
`npm run lint:fix` applies every autofixable fix.

### Commands
| Command | Purpose |
| --- | --- |
| `npm run lint` | Report problems. This is the pre-push gate. |
| `npm run lint:fix` | Apply autofixable fixes (semicolons, whitespace, braces, quotes). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run check` | `lint` + `typecheck` + `build`. The full local gate. |

### Rule Severity Policy
Every rule is either **off** or **error**. Warnings are not used in this
project, so `npm run lint` reports a non-zero exit code for anything that
needs attention and the output has no severity to interpret.

This means the warn-level rules inherited from `solid.configs.recommended`
(`solid/components-return-once`, `solid/event-handlers`, `solid/imports`,
`solid/no-react-deps`, `solid/no-react-specific-props`, `solid/self-closing-comp`,
`solid/style-prop`) are explicitly promoted to `error` in `eslint.config.js`.
If you add a plugin or extend a shared config, promote or disable its
warnings rather than letting them through.

`scripts/check-rule-severity.mjs` enforces this. It walks the effective
config of every linted file and fails if any rule resolves to `warn`. It runs
as part of `npm run lint` and `npm run lint:fix`, so a plugin upgrade cannot
silently reintroduce a warning-level rule.

### Style Rules (all autofixable)
- Semicolons are required. The codebase is 100% semicolon-terminated.
- No trailing whitespace; files end with a newline; at most one consecutive blank line.
- Control statements: a single-line body is allowed (`if (x) return;`); a multi-line
  body must use explicit braces.
- Two-space indentation, single quotes, no trailing commas, `===` over `==`.
- `const` over `let`; `let` over `var`. `prefer-const` is on.
- `no-console` allows `console.info`, `console.warn`, and `console.error`. Use
  `console.info` for intentional game-event logging; `console.log` is rejected.

### Solid Rules
`eslint-plugin-solid` is enabled with the reactivity-sensitive rules, so Solid 1
habits fail the lint instead of failing at runtime:
- `solid/removed-api` — flags Solid 1 APIs removed in Solid 2.
- `solid/no-single-arg-create-effect` — Solid 2 requires `createEffect(compute, effect)`.
- `solid/reactivity`, `solid/no-destructure` — props and signals must be read through
  accessors, never destructured.
- `solid/no-store-mutation-outside-setter`, `solid/no-write-in-pure-computation` —
  the engine owns the state; write through the setter, never inside `createMemo`.
- `solid/prefer-for`, `solid/validate-jsx-nesting`, `solid/no-unused-signal`.

### Vite Rules
`@typpi/eslint-plugin-vite` is enabled. It is the maintained successor to the
unpublished `eslint-plugin-vite` package.

### TypeScript Compiler Versions
`typescript` is aliased to `npm:@typescript/typescript6@^6.0.2` and
`@typescript/native` is aliased to `npm:typescript@^7.0.2`. This is deliberate:
- `npx tsc` runs **TypeScript 7** (the native compiler), which is what
  `npm run typecheck` and `npm run build` use.
- `require('typescript')` resolves to the **TypeScript 6** JavaScript API, which is
  what `typescript-eslint` needs to parse and analyze files.

TypeScript 7 ships no JavaScript API, and `typescript-eslint` refuses to run against
it (`typescript-eslint does not support TS 7.0`). Running both side by side is the
officially documented arrangement. Do not "fix" the peer-dependency conflict by
downgrading `typescript` to a single version.


## Development Workflow

### Typical UI Development Cycle
1. **Start development server**: Run `npm run dev` to start the development server with hot reloading
2. **Make UI changes**: Edit HTML/templates, CSS, or TypeScript files as needed
3. **Test iteratively**: Check changes in the browser (http://localhost:3000) as you work
4. **Lint the change**: Run `npm run lint` (or `npm run lint:fix` to apply autofixes).
   The lint must pass before the change is committed.
5. **Verify build**: Run `npm run build` to ensure production build works correctly
6. **Commit changes**: Add and commit source files only (not generated files)

### Pre-Push Check (required)
Before pushing to `main`, the working tree must pass the full gate. Do not push
with a failing check; fix the cause instead.

```bash
npm run lint        # ESLint: style + Solid reactivity rules
npm run typecheck   # tsc --noEmit: type errors
npm run build       # production bundle must succeed
```

`npm run check` runs all three in sequence and is the single command to use.
`npm run lint` is the required pre-push lint gate: **a push that skips it is a
defect**, because the rules it enforces (semicolons, explicit braces, no trailing
whitespace, Solid 2 API usage) are exactly the ones that drift silently in a
codebase without automation.

Rules of the gate:
- Lint failures are never silenced with inline disables unless the rule is
  genuinely wrong for the code, and then the disable carries a short reason.
- `npm run lint:fix` is the first response to a lint failure. Only hand-fix what
  the autofixer cannot.
- Solid reactivity rules (`solid/reactivity`, `solid/removed-api`) catch real
  Solid 2 defects. Fix the code; do not turn the rule off.
- Do not commit generated output (`dist/`, `node_modules/`).

### Troubleshooting Process
When encountering unexpected issues:
1. **Check console/network tabs** in browser dev tools for errors
2. **Verify lint**: Run `npm run lint` to catch style and Solid rule violations
3. **Verify TypeScript compilation**: Run `npm run typecheck` to check for type errors
4. **Clean and restart**: 
   - Stop dev server
   - Run `npm run clean`
   - Restart with `npm run dev`
5. **Full refresh**: If issues persist:
   - Stop dev server
   - Run `npm run clean-all`
   - Run `npm install`
   - Restart with `npm run dev`

### Stale Vite dependency cache
A browser error like `The requested module 'http://localhost:3000/node_modules/.vite/deps/<pkg>.js?v=<hash>'
doesn't provide an export named: '<name>'` means the browser is running a **stale
optimized dependency** from `node_modules/.vite`, not the current source. The hash
in the URL identifies the bundle the browser cached; it no longer matches anything
Vite has built. Clear it with `npm run clean` and restart the dev server. Check
`node_modules/.vite/deps/_metadata.json` to see which packages Vite actually
optimized — a package that appears there but is absent from `package.json` is the
stale one. This is what a removed Solid 1 package such as `solid-js-store` looks
like after the Solid 2 migration; the current `solid-js` does not export
`SetStoreFunction` and never did need to.
