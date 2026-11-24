# Jobs

Jobs define how your population is employed. Each job has a production rate
per worker, a capacity (often tied to buildings), and optional default status.

## Core Rules

- **Jobs produce resources per tick.** The engine runs at 5 ticks per second.
  Each worker in a job generates a fixed rate per tick.
- **Job capacity comes from buildings.** Each building of a given type adds
  one capacity slot for its associated job. E.g., 3 Lumberjack Camps →
  3 Lumberjack job slots.
- **Uncapped jobs** (Settler) have no capacity limit and can be set as the
  "default" job. When a population point becomes available (new life), it
  is assigned to the default job automatically.
- **Default job indicator.** Jobs that can be defaulted show a `(D)` button.
  Jobs that cannot be defaulted, or are currently the default, show a blank
  space for layout consistency.
- **Food consumption.** Each population point (life) consumes 0.05 food per
  second (0.01 per tick at 5 ticks/sec). This applies regardless of job.

## Job Catalog

| Job | Production per Worker (per tick) | Capacity | Defaultable |
|-----|----------------------------------|----------|-------------|
| Settler | 0.2 food/s (0.04/tick) | Uncapped | Yes |
| Lumberjack | 5 wood/s (1.0/tick) | 1 per Lumberjack Camp | No |
| Quarrier | 4 stone/s (0.8/tick) | 1 per Quarry | No |
| Merchant | 0 (trade placeholder) | 1 per Market | No |

### Building → Job Mapping

| Building | Job Provided |
|----------|-------------|
| Lumberjack Camp | Lumberjack (+1 capacity) |
| Quarry | Quarrier (+1 capacity) |
| Market | Merchant (+1 capacity) |
| Hut | None (unlocks Settler concept) |
| Builder's Lodge | TBA |

## Design Philosophy

- Early game: assign Settlers to resource-gathering jobs as buildings are built.
- Job capacity grows as you build more infrastructure.
- Balancing: produce enough food to sustain the population while expanding
  resource production.
- Future jobs: Farmer, Builder, Researcher, Soldier, etc.
