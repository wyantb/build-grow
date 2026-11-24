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

## Job Catalog

See src/data/jobs.ts

### Building → Job Mapping

| Building | Job Provided |
|----------|-------------|
| Lumberjack Camp | Lumberjack (+1 capacity) |
| Quarry | Quarrier (+1 capacity) |
| Market | Merchant (+1 capacity) |
| Builder's Lodge | TBA |
