# Technology

Every living person in your city makes small discoveries as part of their
daily life. These discoveries accumulate as **research**, a resource that
builds over time and will eventually unlock new buildings, jobs, and
civilization upgrades.

## Per-person research generation

Each species produces a small, fixed amount of research per person per
tick, regardless of employment:

| Species | Research / tick |
|---------|----------------:|
| Human   | 0.020           |
| Elf     | 0.022           |

This means research grows proportionally with your population. At the
start, with 4 humans, you produce 0.080 research per tick (0.400 per
second).

## Research storage

Research is capped by the **City Library**, a facility that comes with the
City Center. The starting cap is 200 research. Future buildings will raise
this cap.

Research, like other capped resources, is clamped to its storage limit at
the end of every tick.
