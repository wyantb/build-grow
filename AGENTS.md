# Project Conventions

## Game Design Docs

Core game rules live in `game_design/`. Always consult the relevant document
before modifying the systems it describes:

| Area | Doc | What it covers |
|------|-----|----------------|
| Buildings | `game_design/buildings.md` | Building catalog, costs, job slots, scaling |
| Jobs | `game_design/jobs.md` | Job types, production rates, capacity, defaults |
| Market | `game_design/market.md` | Tick-based orders, merchant trade capacity, prices, rates |

When implementing or refactoring features that touch buildings or jobs, read
the matching doc first and keep the implementation consistent with it. If the
doc and code drift, fix the doc or the code — but do not change both in
uncoordinated commits.

## Resource Rates

- **Rates are derived, never measured.** A resource's rate is the net
  per-tick change summed over staffed jobs (and market orders), multiplied by
  the tick frequency (5). Never compute a rate from a before/after snapshot of
  the resource amounts: that lags a tick behind, folds one-off events such as
  building costs into the rate, and drifts in floating point.
- **Market rates show what actually settles.** The engine plans the tick's
  trades from the current state and applies that same plan, so a buy that
  cannot be paid for never appears as realized flow. The gold figure in the
  market panel and the gold rate in the resources panel must agree.
- **The engine is the single source for rates.** `GameEngine.getTickRates()`
  and `getResourceRates()` are authoritative. The store mirrors them; it never
  recomputes them from mirrored state.

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

## Development Workflow

### Working Style and Scope Discipline
- **Do only what was asked.** If the user requests a UI tweak, fix a bug, or add a
  specific feature, scope the change to exactly that. Do not add extra features,
  refactor unrelated code, or chase "nice to have" improvements in the same commit.
- **80/20 rule:** implement the obvious, direct solution to the stated problem.
  If you see an opportunity for a larger redesign, a speculative feature, or a
  refactoring that goes beyond the request, **mention it after pushing** as an
  optional next step — do not bake it into the PR.
- **Do not break existing working behavior to enable future plans.** If the current
  code handles a case correctly (even awkwardly), leave it alone unless the user's
  request directly touches that area.
- **State ownership:** the GameEngine is the single writer of game state. Never
  write state from a component, hook, or store. If a new piece of data is needed,
  add it to the engine and mirror it out.

### Commands
| Command | Purpose |
| --- | --- |
| `npm run lint` | Report problems. This is the pre-push gate. |
| `npm run lint:fix` | Apply autofixable fixes (semicolons, whitespace, braces, quotes). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | `vitest run`. The engine test suite. |
| `npm run test:watch` | `vitest` in watch mode. |
| `npm run check` | `lint` + `typecheck` + `test` + `build`. The full local gate. |

### Development Cycle
1. **Make the change**: Edit the source files the task touches, and add or
   update engine tests alongside the behavior you changed.
2. **Run the automated checks**: `npm run check` runs lint, typecheck, tests,
   and the build in one command. This is the fast feedback loop, and it
   catches nearly everything.
3. **Verify in the browser, once, and only if the change is visible or
   interactive**: run `npm run dev` and look at http://localhost:3000. Confirm
   the element appears, is reachable, and is laid out correctly. Do not verify
   arithmetic here; that belongs in Vitest.
4. **Commit**: source files only, not generated files.

The browser check is deliberately the **last** step. It is the most expensive
step per unit of information, so run it after the cheap automated checks have
narrowed the problem down to layout and wiring. A CSS tweak may need a look
while iterating; anything else should get one look at the end. See
`## Testing` for how far a browser check should go.

### Pre-Push Check (required)
Before pushing to `main`, the working tree must pass the full gate of `npm run check`. Do not push
with a failing check; fix the cause instead.

```bash
npm run lint        # ESLint: style + Solid reactivity rules
npm run typecheck   # tsc --noEmit: type errors
npm run test        # vitest: engine test suite
npm run build       # production bundle must succeed
```

Rules of the gate:
- Lint failures are never silenced with inline disables unless the rule is
  genuinely wrong for the code, and then the disable carries a short reason.
- `npm run lint:fix` is the first response to a lint failure. Only hand-fix what
  the autofixer cannot.
- Solid reactivity rules (`solid/reactivity`, `solid/removed-api`) catch real
  Solid 2 defects. Fix the code; do not turn the rule off.
- Do not commit generated output (`dist/`, `node_modules/`).

## Testing

### Strategy
**Engine behavior is covered by Vitest. That is the primary strategy.**
Anything with a rule, a rate, a capacity, or a settlement order belongs in
`src/systems/__tests__/`, asserted against the engine rather than the UI.

- **Do not test math by clicking.** Resource rates, market settlement, and
  capacity limits are engine rules; assert them in Vitest. Reading a
  computed number off the screen is not a test.
- **Reach a game state through the engine, not through clicks.** Build a
  market, assign merchants, or set up any other world through
  `createTestWorld` overrides rather than clicking through the tabs.
- **UI checks are optional and should be brief.** Check visibility at most:
  that a tab or pane appears when its condition is met, and that a control is
  present.
- **If a UI check takes more than about a minute, stop.** It usually means
  the state is hard to reach by hand, which is a signal to build in-repo
  tooling (a test world helper, a seed or debug hook) instead of clicking
  through the game.
- **One exception: Solid reactivity needs a browser.** Node resolves
  `solid-js` to its server build, where `createEffect` never runs, so
  reactivity bugs do not reproduce under Vitest. See
  `### SolidJS / TypeScript Conventions`.

### Writing Engine Tests
Vitest runs the engine tests. The suite lives next to the code it covers, in
`src/systems/__tests__/`.

- The engine takes an optional `WorldState` in its constructor, so a test
  can start from an exact world. `createTestWorld` in
  `src/systems/__tests__/testWorld.ts` builds one from a small set of
  overrides (population, resources, workers per job, completed buildings).
- Tests assert against the job table's numbers, not against values copied
  from the implementation. If a job's rates change, the test should fail.
- `engine.runTicks(n)` advances the world by `n` ticks and notifies
  subscribers once. Use it instead of a loop of `update()` calls: it is the
  same simulation and it is the path the game will use to catch up on a
  backlog of ticks.
- Use `toBeCloseTo` for resource amounts. Accumulating a per-tick delta
  over many ticks drifts in floating point (3.75 arrives as
  3.750000000000006).

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

## Coding Conventions

### Style Rules (all autofixable)
- Semicolons are required. The codebase is 100% semicolon-terminated.
- No trailing whitespace; files end with a newline; at most one consecutive blank line.
- Control statements: a single-line body is allowed (`if (x) return;`); a multi-line
  body must use explicit braces.
- Two-space indentation, single quotes, no trailing commas, `===` over `==`.
- `const` over `let`; `let` over `var`. `prefer-const` is on.
- `no-console` allows `console.info`, `console.warn`, and `console.error`. Use
  `console.info` for intentional game-event logging; `console.log` is rejected.

## Troubleshooting

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
