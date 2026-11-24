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
- **Rates are derived, not measured.** The rate shown for a resource is the
  net per-tick rate summed over staffed jobs, multiplied by the tick
  frequency (5). The engine must not derive rates from a before/after
  snapshot of the resource amounts: that lags a tick behind and folds
  one-off events such as building costs into the rate. Market flows are
  included in these rates; see `game_design/market.md`.

## Merchants

- **A merchant only trades once a market is built.** The Merchant job
  exists as a job, but the merchant count is zero and the Market tab is
  hidden until at least one Market building is completed.
- **Each merchant carries one buy order and one sell order.** A merchant
  buys and sells resources every tick, in the same way production happens
  every tick. There are no bulk trades.
- **The number of buy and sell orders in use is capped at the merchant
  count.** Opening an order needs a free slot; raising the quantity of an
  existing order does not. Removing a merchant removes its orders: the sale
  order of the bottom-most resource that holds one, or, when there are no
  sales left, the buy order of the bottom-most resource that holds one.
- **The merchant produces and consumes nothing.** A merchant eats like any
  other worker (0.01 food per tick) but has no production of its own.
- Full market rules live in `game_design/market.md`.

## Job Catalog

See src/data/jobs.ts

### Building → Job Mapping

| Building | Job Provided |
|----------|-------------|
| Lumberjack Camp | Lumberjack (+1 capacity) |
| Quarry | Quarrier (+1 capacity) |
| Market | Merchant (+1 capacity) |
| Builder's Lodge | TBA |
