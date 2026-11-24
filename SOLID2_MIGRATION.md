# Solid 2 Upgrade Plan

Target: `solid-js@2.0.3` (npm `latest`; `v1-latest` is `1.9.20`). Solid 2 is GA.

Status: **applied to the main working tree.** Typecheck clean, production build clean, and a
48-check browser suite passes on both the dev server and the production preview with zero
console errors and zero Solid warnings.

Two defects were found by that suite and fixed during the migration; see §8.

---

## 1. What actually changes

| Area | Solid 1.x | Solid 2.x | Impact here |
|---|---|---|---|
| Store import | `solid-js/store` | `solid-js` | `useGameState.ts` — one import line |
| Store setter | `setState('a', 'b', v)` | `setState((draft) => { draft.a.b = v })` | `useGameState.ts` — mirror function rewritten |
| Store setter type | `SetStoreFunction` | `StoreSetter<T>` (removed entirely) | type-only import; gone with the old API |
| JSX namespace | `solid-js` | `@solidjs/web` | `tsconfig.json` — `jsxImportSource` |
| DOM render | `solid-js/web` | `@solidjs/web` | `main.tsx` — one import line |
| `classList` attr | supported | **removed** → `class={{ key: bool }}` | `ResourcePanel.tsx` — 4 call sites |
| `<For>` keyed fn | child gets raw item | child gets an **Accessor** | `BuildingGrid.tsx`, `JobPanel.tsx` |
| List identity | silent | **dev diagnostic** `UNSTABLE_LIST_IDENTITY` | new — must fix, see §4 |

The `solid-js/store` export path no longer exists in Solid 2. Store internals moved to
`@solidjs/signals` (a transitive dep); `createStore` is re-exported from the `solid-js` root.

### The store setter change in detail

Solid 1: `setState('resources', 'wood', 12)`
Solid 2: `setState((state) => { state.resources.wood = 12 })`

The callback receives a writable **draft**. Mutate in place (canonical). Returning a
value is also supported for shapes where mutation is awkward — objects are shallow-diffed
at the top level (present keys written, missing keys deleted), arrays replaced by index.

---

## 2. Dependencies to drop

Every one of these declares a Solid **1.x** peer dependency and blocks `npm install` on
Solid 2 (`ERESOLVE`, confirmed in the spike). Per your instruction they are **dropped,
not preserved**.

| Package | Current peer | Decision |
|---|---|---|
| `vite-plugin-solid` | `solid-js ^1.7.2` | **Drop** → replace with `@solidjs/vite-plugin@^3.0.1` (Solid 2 plugin) |
| `solid-app-router` | `solid-js ^1.3.5` | **Drop.** If routing is ever needed, use `@solidjs/router@^2.0.1` (Solid 2 ready). The app has no routes today. |
| `lucide-solid` | `solid-js ^1.4.7` | **Drop.** No Solid 2 release exists. Icons are currently inline emoji/unicode, so nothing breaks. |
| `solid-refresh` | `solid-js ^1.3` | **Drop.** HMR is handled by `@solidjs/vite-plugin` now. |
| `@tsparticles/slim` | — | **Drop.** Framework-agnostic, but unused in `src/` and its install script is already blocked by npm policy. |
| `zod` | — | **Keep.** Framework-agnostic schema validation. |

**Feature-loss risk: none.** All five dropped packages were declared in `package.json` but
never imported anywhere in `src/`, `index.html`, or `vite.config.ts`. Verified by grep.

---

## 3. File-by-file changes

**`package.json`**
- `dependencies`: `solid-js` → `2.0.3`, add `@solidjs/web` → `2.0.3`
- `devDependencies`: remove `vite-plugin-solid`, add `@solidjs/vite-plugin` → `^3.0.1`
- remove `solid-app-router`, `lucide-solid`, `solid-refresh`, `@tsparticles/slim`

**`tsconfig.json`**
- `"jsxImportSource": "solid-js"` → `"@solidjs/web"`

**`vite.config.ts`**
- `import solidPlugin from 'vite-plugin-solid'` → `from '@solidjs/vite-plugin'`

**`src/main.tsx`**
- `import { render } from 'solid-js/web'` → `from '@solidjs/web'`

**`src/hooks/useGameState.ts`**
- `import { createStore } from 'solid-js/store'` → `from 'solid-js'`
- Rewrite `mirrorEngineState()` to the draft form (§1). The per-field mirror structure
  stays — it still avoids handing Solid the engine's own objects.

**`src/components/game/ResourcePanel.tsx`**
- 4× `classList={{...}}` → `class={{...}}`. The object form takes the same
  `{ 'class-name': boolean }` shape, so the bodies are unchanged.

**`src/components/game/BuildingGrid.tsx`** and **`src/components/game/JobPanel.tsx`**
- See §4.

---

## 4. The one non-mechanical change: stable list identity

Solid 2's dev build raises `UNSTABLE_LIST_IDENTITY` when a `<For>` recreates rows that
are equivalent to the ones they replace. Our mirror does exactly that: it rebuilds the
building/job objects every tick, so every row's DOM was thrown away and rebuilt.

This was invisible in Solid 1. It is a real performance problem, not just noise.

**Fix — iterate stable ids, read live records inside the row:**

```tsx
// before — fresh objects each tick
const buildings = createMemo(() =>
  gameState.getBuildingCatalog().map((type) => ({
    type,
    construction: gameState.getBuildings()[type.id]
  }))
)
<For each={buildings()}>...</For>

// after — stable catalog, reactive reads in the row
const buildings = createMemo(() => gameState.getBuildingCatalog())
<For each={buildings()} keyed={(type) => type.id}>
  {(type) => {
    const construction = () => gameState.getBuildings()[type().id]
    ...
  }}
</For>
```

Same shape for `JobPanel`: `Object.values(state.jobs)` → `Object.keys(state.jobs)`, with a
`job(id)` helper for the live record.

**Solid 2 gotcha:** with `keyed={(item) => key}`, the child receives an **Accessor**, so
you call `type().id`, not `type.id`. Without `keyed`, you get the raw value.

Also note `noUncheckedIndexedAccess` is on, so `getJobs()[id]` is `Job | undefined`. The
spike uses a typed `EMPTY_JOB` fallback to keep the check satisfied.

---

## 5. Verification plan

Each gate must pass before the next phase.

1. **Install** — `npm install` resolves with no `ERESOLVE`.
2. **Typecheck** — `npx tsc --noEmit` exits 0.
3. **Build** — `npm run build` succeeds.
4. **Browser, dev server** — app renders (title, 6 resource rows, 3 tabs, 5 building
   cards); resources and game time advance; build → cost deducted → progress % shown →
   completes → button reads "Built"; job +/- changes worker counts; **zero console
   errors and zero Solid warnings**.
5. **Browser, production preview** — same checks against `vite preview`.
6. **Clean checkout** — fresh clone → `npm ci` → typecheck → build → preview → HTTP 200
   → browser checks.

The spike already passes all six.

---

## 6. Suggested order of work

1. Update `package.json` (drop the 5 packages, add `@solidjs/web` + `@solidjs/vite-plugin`).
2. `npm install` to regenerate the lockfile.
3. `tsconfig.json` `jsxImportSource` + `vite.config.ts` plugin import.
4. `main.tsx` render import.
5. `useGameState.ts` — store import + draft-form mirror.
6. `ResourcePanel.tsx` — `classList` → `class`.
7. `BuildingGrid.tsx` / `JobPanel.tsx` — stable ids + `keyed` + accessor reads.
8. Typecheck → build → browser verification (dev, then prod).
9. Update `AGENTS.md` with the Solid 2 specifics.
10. Commit and push to `main`.

---

## 7. Notes and risks

- **Bundle size grew by ~45% gzip: 36.63 kB → 53.31 kB.** An earlier note in this
  document claimed the bundle was "effectively unchanged"; that was a mis-measurement,
  taken against a baseline that was not the pre-migration app. Measured properly against
  the pre-migration commit (`a391ca7`) with identical source, Solid 1 produces 122.88 kB
  / 36.63 kB gzip and Solid 2 produces 166.72 kB / 53.31 kB gzip.

  The growth is inherent to Solid 2, not to this migration. Isolating it with a
  minimal hello-world (one signal, one button):

  | | Solid 1 | Solid 2 |
  |---|---|---|
  | hello-world | 11.36 kB / 4.50 kB gzip | 28.98 kB / 11.96 kB gzip |
  | hello-world + `createStore` | 15.17 kB / 5.85 kB gzip | 54.30 kB / 20.87 kB gzip |
  | `createStore` cost | +1.35 kB gzip | +8.91 kB gzip |

  Solid 2's runtime is larger, and its `createStore` is built on the new signals core
  (`@solidjs/signals`) rather than Solid 1's lightweight store, which accounts for most
  of the difference. Nothing in this repo's code adds extra weight beyond that
  framework baseline.
- **Solid 2's dev diagnostics are a feature, not a nuisance.** They caught a
  row-rebuild problem that Solid 1 hid. Worth keeping the dev server in the loop during
  the migration rather than only checking the production build.
- **`@solidjs/router` is the only drop with a future cost.** If the game later needs
  routes, it must be `@solidjs/router@^2`, not `solid-app-router`.
- **Node resolves Solid's server build**, where `createEffect` never runs. Reactivity
  must be verified in a browser, not Node. (This already bit us once on the Solid 1 work.)
- The spike lives at `/tmp/s2spike` and can be replayed or promoted directly.

---

## 8. Defects found by browser verification, and their fixes

The verification suite is what caught these. Typecheck and build were both clean while
they were present.

### 8.1 `keyed` children receive an Accessor, not the raw item

`BuildingGrid.tsx` and `JobPanel.tsx` mixed `type()` and bare `type` inside the
`<For>` body, so building names and job records rendered as `undefined` while the types
still checked out — the two forms are structurally similar enough that TypeScript
accepted the mixture.

Solid 2's rule, from `node_modules/solid-js/types/client/flow.d.ts`:

| `keyed` | child receives |
|---|---|
| `keyed={true}` | the raw item |
| `keyed={false}` | an `Accessor` |
| `keyed={(item) => key}` | an `Accessor` |

**Fix:** read every occurrence through the accessor — `type().id`, `job(id()).workers`.

### 8.2 `STRICT_READ_UNTRACKED` diagnostics on the theme signal

Solid 2's dev build warned:

```
[STRICT_READ_UNTRACKED] Reactive value "theme" read directly in <ThemeToggle> will not update.
```

Two distinct causes:

1. `useTheme()` read `theme()` directly in the hook body to apply the theme before first
   paint. **Fix:** wrap that one-time read in `untrack()`, which is the documented way to
   mark a deliberate snapshot. The `createEffect` keeps the class in sync afterwards.
2. `App.tsx` read `theme()` in a component body for the toggle's icon and ARIA label.
   **Fix:** extract a `ThemeToggle` component so the read happens inside JSX, which is a
   tracking scope.

The theme signal also moved to module scope so every caller shares one source of truth
instead of each `useTheme()` call creating its own.
