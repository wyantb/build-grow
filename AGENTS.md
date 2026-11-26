# Project Conventions

## Game Design Docs

Core game rules live in `game_design/`. Always consult the relevant document
before modifying the systems it describes:

| Area | Doc | What it covers |
|------|-----|----------------|
| Buildings | `game_design/buildings.md` | Building catalog, costs, job slots, scaling |
| Jobs | `game_design/jobs.md` | Job types, production rates, capacity, defaults |
| Market | `game_design/market.md` | Tick-based orders, merchant trade capacity, prices, rates |
| Population | `game_design/population.md` | Housing capacity, the birth roll, the growth curve |
| Rebirth | `game_design/rebirth.md` | The gold cost, the rebirth view, the gene roll |

When implementing or refactoring features that touch buildings, jobs, markets etc read
the matching doc first and keep the implementation consistent with it. If the
doc and code drift, fix the doc or the code — but do not change both in
uncoordinated commits.

## UI Design Principles

- Keep UI compact with a minimal header (max 24px height).
- The header holds three columns: game name and theme toggle | season, day and
  the play/pause button | the game version.
- Resources always listed on the left column.
- Main section body uses tabbed navigation (Buildings, Jobs, Market, Settings).
- Mobile responsive design:
  - Wide screens: Left resources + tabbed main content
  - Narrow screens: Resources also becomes a tab
- No gradients — use flat colors without opacity.
- Minimalist approach with clear hierarchy; consistent spacing and alignment.
- Color palette:
  - Primary: Dark backgrounds (#1a1a1a)
  - Secondary: Medium grays (#333333)
  - Accent: Blue for interactive elements (#4d9de0)
  - Status colors: Green (positive), Red (negative), Yellow (warning)

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
- **A request that names a rule may already be met.** Read the code and the matching
  `game_design/` doc before changing that area. The population rules (one hut at the
  start, five people a hut, the capacity limit, a roll every 25 ticks) were already
  implemented and tested on `main`; only the *shape* of the growth curve was at
  issue, and changing it was not asked for. Rewriting a working, tested system on
  the strength of a re-read of the request is a scope violation. When a system
  already satisfies a stated rule, say so and leave it alone.
- **Check what the engine already guarantees before adding state.** The species work
  needed to know how many people of a species the world held, and the roster now
  says so. Two real bugs surfaced from that: the pool of free workers was blind to
  species, so assigning an elf invented one. Reach for the engine's own invariant
  (`getWorking()`) rather than letting the caller invent a number.
- **Do not debate yourself on core game logic interpretation.** If you notice an
  ambiguity in the given spec, stop and ask the prompter for more examples to resolve
  the ambiguity. If you've looped with yourself 5 or 6 times on how a topic works,
  that's an additional sign to stop and ask the prompter.

### Commands and Pre-Push Check (required)

| Command | Purpose |
| --- | --- |
| `npm run check` | `lint` + `typecheck` + `test` + `build`. **The full local gate — run this before pushing.** |
| `npm run lint` | ESLint: style + Solid reactivity rules. The required pre-push lint gate. |
| `npm run lint:fix` | Apply autofixable fixes (semicolons, whitespace, braces, quotes). |
| `npm run typecheck` | `tsc --noEmit`: type errors. |
| `npm run test` | `vitest run`: the engine test suite. |
| `npm run test:watch` | `vitest` in watch mode. |

Before pushing to `main`, the working tree must pass `npm run check`. Do not
push with a failing check; fix the cause instead.

Rules of the gate:
- Lint failures are never silenced with inline disables unless the rule is
  genuinely wrong for the code, and then the disable carries a short reason.
- `npm run lint:fix` is the first response to a lint failure. Only hand-fix what
  the autofixer cannot.
- Solid reactivity rules (`solid/reactivity`, `solid/removed-api`) catch real
  Solid 2 defects. Fix the code; do not turn the rule off.
- Do not commit generated output (`dist/`, `node_modules/`).

### Development Cycle
1. **Make the change**: Edit the source files the task touches, and add or
   update engine tests alongside the behavior you changed.
2. **Run the automated checks**: `npm run check` runs lint, typecheck, tests,
   and the build in one command. This is the fast feedback loop, and it
   catches nearly everything.
3. **Commit**: source files only, not generated files.
4. **Offer followup ideas**, after pushing, of ideas that violated 80/20 rules
   from earlier, only as final output/text offered to the human reviewer. Ask
   if manual testing of the UI should be performed at all.


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

## Persistence / Saves

The game autosaves to local storage every 60 seconds, and also when the tab is
hidden or closed. Settings → Data holds the manual controls.

- **The save holds gameplay state only.** Job rates, building costs and every
  other value that comes from `src/data/` are left out, so a balance change
  applies to an old save instead of being frozen inside it. The catalog is
  read back in on load; a job or building the catalog no longer knows about is
  skipped with a warning.
- **The encoding is gzip + base64.** `CompressionStream` and
  `DecompressionStream` do the work, so there is no compression dependency.
  The stored value carries a `BG1:` prefix that names the encoding.
- **Saves carry two versions.** `saveVersion` is the format of the save
  payload; `gameVersion` is the build of the game that wrote it. A different
  major game version is refused; a different minor version loads with a
  warning.
- **The engine is the single writer.** A load replaces the engine's world and
  then replaces the store's subtrees, so nothing from the old world survives.
  Use `replaceEngineState`, not `mirrorEngineState`, after a load: the mirror
  only adds and updates, and would leave stale building instances behind.
- **`useSaveSystem()` is called once**, from the component that owns the game
  loop. Components that only need the buttons use `useSaveActions()`, so the
  autosave timer is never started twice.
- **Migrations live in `saveSystem.ts`.** The chain is empty today because the
  format has only ever had one version. Add a step when the format changes.
- **Save operations are serialized.** `runExclusive` in `useSaveSystem.ts`
  puts every save, load, export and import on one queue, so two operations
  never overlap. The `busy` signal counts the operations that are queued or
  running, and the Settings controls stay disabled while it is on.
- **A hard reset empties the world, not the save.** It replaces the world with
  a fresh one and holds the autosave until the player saves or loads by hand,
  so an autosave cannot write the empty world over a game they might want
  back.
- **A save written before a building existed does not list it.** On load,
  `deserializePayload` merges the saved `unlockedBuildings` with the ones a
  new game starts with. A building that has to be unlocked during play is not
  in the starting set, so the merge never hands one out early.
- **`GAME_VERSION` gates compatibility.** Bump it in `src/systems/gameVersion.ts`
  when a change could affect a saved world, such as a balance change to a job
  or a building. A different major version refuses the save; a different minor
  version loads it with a warning.


See `tech_debt.md` for the known limits: compression needs a browser with the
Compression Streams API, and it falls back to the main thread when a worker
cannot be started.

## Testing

**Engine behavior is covered by Vitest. That is the primary strategy.**
Anything with a rule, a rate, a capacity, or a settlement order belongs in
`src/systems/__tests__/`, asserted against the engine rather than the UI.

- **Do not test math by UI clicking.** Resource rates, market settlement, and
  capacity limits are engine rules; assert them in Vitest. Reading a
  computed number off the screen is not a test.
- **Reach a game state through the engine, not through clicks.** Build a
  market, assign merchants, or set up any other world through
  `createTestWorld` overrides rather than clicking through the tabs.
- **UI checks are optional and must be brief.** Check visibility at most:
  that a tab or pane appears when its condition is met, and that a control
  is present.

Writing engine tests:
- The engine takes an optional `WorldState` in its constructor, so a test
  can start from an exact world. `createTestWorld` in
  `src/systems/__tests__/testWorld.ts` builds one from a small set of
  overrides (population, resources, workers per job, buildings).
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
├── main.tsx            # Entry point
├── styles/             # CSS files
├── types/              # Zod schemas and TypeScript types
├── data/               # Static game content (building catalog, etc.)
├── systems/            # Core game logic (gameEngine, marketSystem)
├── hooks/              # SolidJS hooks bridging engine and store
├── components/game/    # Game-screen components
├── components/ui/      # Reusable presentation components (Tooltip)
└── utils/              # Formatting helpers
```

### Component Architecture
- GameEngine: Core game state and logic. Owns the authoritative state and is the **single writer**.
- Solid store (`useGameState`): a reactive **mirror** of the engine, not a second writer.
- Never write state from a component, hook, or store. If a new piece of data is
  needed, add it to the engine and mirror it out.
- Components should be modular and reusable. State management through GameEngine events.

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
- When we have complex UI/state changes, ask if the Solid reactivity should be tested
  **in the browser** — see `## Testing`.

### Tooltips and Settings
- `src/components/ui/Tooltip.tsx` is the only tooltip implementation. Wrap the
  trigger in `<Tooltip content="..." placement="top|right|bottom|left">`.
- The trigger wrapper is `display: contents`, so it does not change the layout of
  its parent. Because the wrapper then has no box of its own, the tooltip measures
  its anchor with a `Range` over the wrapper's contents. Do not swap the wrapper
  back to a plain `inline-flex`: it re-breaks the flex layout of every row it is
  put in.
- The bubble renders through `Portal` into `document.body`, is positioned with
  `position: fixed`, flips to the opposite side when the preferred side would
  overflow the viewport, and is clamped to stay on screen.
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

## Job Order

- **The order holds every job, not just the visible ones.** `jobOrder` is a
  permutation of every job in the catalog. `getAvailableJobIds` filters it
  down to the jobs the player can see, so a job whose building is not up yet
  takes no place on screen but keeps its slot in the full order.
- **A place is counted among the visible jobs.** `reorderJob(jobId,
  targetIndex)` takes an index into the visible list, not into `jobOrder`.
  It moves the job in the visible list, then writes the visible jobs back
  into the slots they hold in the full order, so the off-screen jobs keep
  their slots and the order stays a permutation of every job.
- **Two ways to change the order, one state.** The arrows call `moveJob`,
  the drag handle calls `reorderJob`. Both write the same `jobOrder`, and
  the order is already saved with the world, so a drag survives a reload.
- **The handle is the draggable, the row is the droppable.** `createSortable`
  puts both on one element, which would make the whole row draggable and
  swallow the arrow clicks. The panel uses `createDraggable` on the handle
  and `createDroppable` on the row instead.
- **Rows are keyed, so a row keeps its identity.** The `For` is keyed by job
  id. After a reorder, each row's handle and arrows stay bound to the job
  that row shows.

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

1. **Check console/network tabs** in browser dev tools for errors.
2. **Verify lint**: Run `npm run lint` to catch style and Solid rule violations.
3. **Verify TypeScript compilation**: Run `npm run typecheck` to check for type errors.
4. **Clean and restart**: stop the dev server, run `npm run clean`, restart with `npm run dev`.
5. **Full refresh**: if issues persist, stop the dev server, run `npm run clean-all`,
   `npm install`, then `npm run dev`.

### Stale Vite dependency cache
A browser error like `The requested module 'http://localhost:3000/node_modules/.vite/deps/<pkg>.js?v=<hash>'
doesn't provide an export named: '<name>'` means the browser is running a **stale
optimized dependency** from `node_modules/.vite`, not the current source. The hash
in the URL identifies the bundle the browser cached; it no longer matches anything
Vite has built. Clear it with `npm run clean` and restart the dev server. Check
`node_modules/.vite/deps/_metadata.json` to see which packages Vite actually
optimized — a package that appears there but is absent from `package.json` is the
stale one, which is what a removed package such as `solid-js-store` looks like
after the Solid 2 migration.
