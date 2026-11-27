# Resources

Resources are produced and consumed every tick by the jobs you staff. Most
resources are **capped** — your city cannot hold more than the storage
capacity allows.

## Capped resources

| Resource | Storage cap | How the cap is raised |
|----------|------------:|-----------------------|
| Wood     | 100         | City Center (50) + storage buildings |
| Stone    | 100         | City Center (50) + storage buildings |
| Food     | 75          | City Center (25) + storage buildings |
| Research | 200         | City Library (200) |

The cap for wood and stone is shared; they use the same pool. Each building
that declares a `storageBonus` in the catalog adds its per-copy amount to
the relevant cap when built. The engine derives the cap from the current
building counts; the UI reads the same values so tooltips stay in sync.

## Job-based production

Every job in the catalog declares a **production** rate per tick for one or
more resources and an optional **consumption** rate for resources it spends.

The per-tick rate for a resource is:

```
rate = Σ(staffed_jobs) production[resource] × stat_multiplier - consumption[resource]
```

`stat_multiplier` comes from the species stats of the worker assigned to
the job. The production is scaled by the relevant stats (e.g. strength for
woodcutters, constitution for farmers). Consumption is **not scaled** — it
is a flat cost the job pays each tick, regardless of who works it.

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
