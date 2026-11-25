# Population

Population is the number of people in the world. Huts house them, and they
grow when there is room for another one.

## Core Rules

- **A new game starts with one hut.** The hut is finished from the start, so
  the starting population of 5 fills it exactly. The resources panel shows
  `5 / 5`, and no birth is possible until the player builds more housing.
- **One hut houses five people.** The capacity of the world is
  `finished huts × 5`.
- **Only finished huts count.** A hut under construction houses nobody, so it
  adds no capacity until it is done.
- **The population never exceeds the capacity.** A birth needs somewhere to
  live. When the huts are full, the world stops rolling for births entirely.
- **The world rolls for a birth every 25 ticks**, which is every 5 seconds.
  Each roll either produces one person or produces nothing.
- **A new person joins the default job**, which is where the unassigned
  people live.

## The Growth Rate

The chance of a birth rises with the size of the population, on a
logarithmic curve:

```
p(n) = BASE_GROWTH_CHANCE × (1 + GROWTH_SCALE × ln(n / BASE_POPULATION))
```

with these values:

| Constant | Value | Meaning |
| --- | --- | --- |
| `BASE_GROWTH_CHANCE` | 0.25 | The chance of a birth per roll at the starting population. |
| `BASE_POPULATION` | 5 | The population the base chance applies to. |
| `GROWTH_SCALE` | 0.5 | How fast the chance climbs with the population. |
| `GROWTH_INTERVAL_SECONDS` | 5 | How long one roll interval lasts. |

The curve is measured from `BASE_POPULATION`, so `p(5)` is exactly the base
chance and the starting population grows at the intended rate.

### Why logarithmic

The curve has three properties that matter for the game:

1. **It starts where the design wants it.** At `n = 5` the chance is 25%,
   which over 5 second rolls gives a mean wait of 20 seconds.
2. **It rewards a bigger civilization.** A larger population grows faster,
   so the player is rewarded for building housing early.
3. **It flattens out.** Doubling the population does not double the birth
   rate. The growth is proportional, not exponential, so the player cannot
   ride a runaway curve, and the capacity of the huts stays the thing that
   limits the world.

The chance is capped at 1, so the population never grows faster than one
person per interval. The cap is reached at a population of about 2017.

### The mean time to the next birth

The wait between births follows a geometric distribution, so the mean wait
is one over the chance:

```
T(n) = GROWTH_INTERVAL_SECONDS / p(n)
```

Worked examples:

| Population | Birth chance per 5 s | Mean time to the next birth |
| ---: | ---: | ---: |
| 5 | 25.0% | 20.0 s |
| 10 | 33.7% | 14.9 s |
| 20 | 42.3% | 11.8 s |
| 50 | 53.8% | 9.3 s |
| 100 | 62.4% | 8.0 s |
| 200 | 71.1% | 7.0 s |
| 500 | 82.6% | 6.1 s |
| 1000 | 91.2% | 5.5 s |
| 2000 | 99.9% | 5.0 s |

The mean wait is a little pessimistic, because each new person raises the
chance for the next one. Filling the first hut from 5 to 10 takes about
87 seconds of expected time, and going from 10 to 20 takes about 132.

### Worked example

A world with 20 people and two huts has a capacity of 10, so it is already
over capacity and no births happen. The player builds a third hut, which
finishes 30 ticks later. The capacity becomes 15, and the population is
still 20, so there is still no room.

A world with 12 people and three huts has a capacity of 15. The next roll
happens at the next multiple of 25 ticks. The chance is
`0.25 × (1 + 0.5 × ln(12 / 5)) = 43.0%`, so roughly 43% of rolls produce a
child, and the mean wait for that child is `5 / 0.43 = 11.6` seconds. The
population climbs to 15 and stops, because the huts are full.

## Implementation

- `src/systems/population.ts` holds the constants and the math. The engine
  calls `getBirthChance()` and `getPopulationCapacity()`; nothing else
  computes them.
- `GameEngine.processPopulationGrowth()` runs the roll. It checks the tick
  is a multiple of `GROWTH_INTERVAL_TICKS`, checks the population is below
  the capacity, and then rolls.
- The engine takes its random source as a constructor argument, so a test
  can make every roll succeed or fail.
- The capacity is derived from the building counts, so it is not saved. A
  save holds the population and the huts, and the capacity follows from
  them.
