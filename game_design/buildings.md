# Buildings

Buildings are the physical infrastructure of your civilization. Each building
provides job capacity, production bonuses, adds storage, and/or unlocks
new capabilities.

## Core Rules

- **Buildings provide job slots.** Each building of a given type adds one
  capacity slot for its associated job. E.g., one Lumberjack Camp → one
  Lumberjack job slot.
- **Some buildings grant no job slot.** A building that improves something
  else — the Caravanserai boosts trade capacity rather than adding a worker
  — has no entry in the building → job mapping. See `game_design/jobs.md`.
- **Buildings have escalating costs.** Each additional building of the same
  type costs 1.35× more.
- **Buildings are built instantly.** If the player can pay the cost, the
  building exists the moment they click it. There is no construction time and
  no construction state.
- **Buildings are permanent** once built.
- **A new game starts with one finished hut.** It is part of the starting
  world, not something the player builds. See `game_design/population.md`.

## Building Catalog

See src/data/buildings.ts

### Categories

| Category | Buildings |
|----------|----------|
| Residential Block | Hut |
| Commercial District | Market, Caravanserai |
| Rural District | Lumberjack Post, Quarry, Farm |
