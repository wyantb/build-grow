# Resources

Resources are produced and consumed every tick by the jobs you staff. Most
resources are **capped** — your city cannot hold more than the storage
capacity allows.

Most storage comes from buildings' storageBonus.

Many resources (e.g. clay, copper, tin, bronze, etc) are not revealed, in storage
breakdowns, the resources leftnav, or otherwise prior to first production.

## Job-based production

Most jobs in the catalog declares a **production** rate per tick for one or
more resources and an optional **consumption** rate for resources it spends.

The per-tick rate for a resource is:

```
rate = Σ(staffed_jobs) production[resource] × stat_multiplier - consumption[resource]
```

`stat_multiplier` comes from the species stats of the worker assigned to
the job. The production is scaled by the relevant stats (e.g. strength for
woodcutters, constitution for farmers). Consumption is **not scaled** — it
is a flat cost the job pays each tick, regardless of who works it.

## Processed resources

Some resources represent raw materials - wood, stone, copper, tin, iron, etc.

Many more resources represent manufactured products - clay (fired stone "earth"),
bronze (allowed of copper and tin), cement, etc.

INVARIANT: generally speaking, every manufactured resource should have a higher
resource "base factor" (influences market value) and "rarity" (influences amount
traded per tick; units traded per tick = the universal base 0.5 / rarity).

## Species consumption and research

Each species has a base **food consumption** per person per tick and a base
**research production** per person per tick. These apply to every person
of that species, employed or not:

| Species | Food / tick | Research / tick |
|---------|------------:|----------------:|
| Human   | 0.025       | 0.020           |
| Elf     | 0.020       | 0.022           |

Food consumption reduces the food pool every tick. Research accumulates
into the research cap from the City Library.

## Resource rates are derived, never measured

A resource's rate is the net per-tick change summed over staffed jobs,
multiplied by the tick frequency (5). The engine is the single source of
truth for rates; the UI mirrors them.
