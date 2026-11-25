# Buildings

Buildings are the physical infrastructure of your civilization. Each building
provides job capacity, production bonuses, and unlocks new capabilities.

## Core Rules

- **Buildings provide job slots.** Each building of a given type adds one
  capacity slot for its associated job. E.g., one Lumberjack Camp → one
  Lumberjack job slot.
- **Some buildings grant no job slot.** A building that improves something
  else — the Caravanserai boosts trade capacity rather than adding a worker
  — has no entry in the building → job mapping. See `game_design/jobs.md`.
- **Buildings have escalating costs.** Each additional building of the same
  type costs 1.35× more and takes 1.25× longer to build.
- **Buildings are permanent** once completed.
- **A new game starts with one finished hut.** It is part of the starting
  world, not something the player builds. See `game_design/population.md`.

## Building Catalog

See src/data/buildings.ts

| Building | Cost | Build time | Grants | Notes |
|----------|------|-----------|--------|-------|
| Hut | 20 wood, 10 stone | 30s | Housing for 5 | |
| Market | 30 wood, 30 stone, 15 food | 60s | 1 Merchant slot | Enables the market tab |
| Caravanserai | 500 wood, 500 stone | 300s | +1 trade per merchant | No job slot of its own |
| Lumberjack Post | 25 wood, 15 stone | 45s | 1 Lumberjack slot | |
| Quarry | 20 wood, 25 stone | 45s | 1 Quarrier slot | |
| Farm | 35 wood | 30s | 1 Farmer slot | |
| Builder Workshop | 50 wood, 30 stone, 20 food | 120s | — | Unlocks advanced buildings |

### Caravanserai

- **Cost:** 500 wood and 500 stone. It will cost bronze as well once mining
  and basic smelting exist.
- **It grants no job slot.** It is staffed by the merchants it serves, so it
  adds nothing to the worker counts.
- **Each one gives every merchant one more trade position.** The total
  capacity is `merchants × (1 + caravanserai)`, so three merchants and three
  caravanserai carry twelve trade positions. See `game_design/market.md`.
