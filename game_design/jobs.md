# Jobs

Jobs define how your population is employed. Each job has a base production rate
per worker, a capacity (often tied to buildings), and optional default status.

## Core Rules

- **Jobs produce resources per tick.** The engine runs at 5 ticks per second.
  Each worker in a job generates a fixed rate per tick.
- **Job capacity comes from buildings.** Each building of a given type adds
  one capacity slot for its associated job. E.g., 3 Lumberjack Camps →
  3 Lumberjack job slots.
- **Uncapped jobs** (Settler, Unemployed) have no capacity limit and can be set as the
  "default" job. When a population point becomes available (new life), it
  is assigned to the default job automatically.
- **Default job indicator.** Jobs that can be defaulted show a `(D)` button.
  Jobs that cannot be defaulted, or are currently the default, show a blank
  space for layout consistency.
- **Food consumption.** Each population point (life) consumes 0.05 food per
  second (0.01 per tick at 5 ticks/sec). This applies regardless of job.
- **Jobs have a priority order.** The Jobs panel lists the jobs top to bottom,
  and the player can move a job up or down with the buttons next to its name,
  or drag it by the handle to any place in the list. The order is the player's
  own: it decides nothing yet, and it is saved with the world. The order holds
  every job, including the ones that are not on screen, so a job whose building
  is not up yet appears where the player left it once the building is. A job
  the game adds later starts at the end.
- **A drag places a job among the jobs on screen.** The place a job is dropped
  on is counted among the jobs the player can see, so a job that is not on
  screen does not take a spot. The visible jobs keep the places they hold in
  the full order, so a job that is not on screen stays where it was.
- **Rates are derived, not measured.** The rate shown for a resource is the
  net per-tick rate summed over staffed jobs, multiplied by the tick
  frequency (5). The engine must not derive rates from a before/after
  snapshot of the resource amounts: that lags a tick behind and folds
  one-off events such as building costs into the rate. Market flows are
  included in these rates; see `game_design/market.md`.

## Merchants

- **The Merchant job gives trade capacity.** A worker assigned to it becomes
  a merchant and can carry market orders. It produces and consumes nothing
  beyond the food every worker eats (0.01 food per tick).
- **Everything else about merchants lives in `game_design/market.md`.** How
  many trades a merchant carries, how those trades are allocated, how they
  settle, and what happens when a merchant is removed are all market rules.

## Job Catalog

See src/data/jobs.ts

### Building → Job Mapping

| Building | Job Provided |
|----------|-------------|
| Lumberjack Camp | Lumberjack (+1 capacity) |
| Quarry | Quarrier (+1 capacity) |
| Market | Merchant (+1 capacity) |
| Builder's Lodge | TBA |

Not every building appears in this table. A building that grants no job slot
is listed in `game_design/buildings.md` instead. The Caravanserai is one of
them: it adds no worker, but it gives every merchant an extra trade
position.
