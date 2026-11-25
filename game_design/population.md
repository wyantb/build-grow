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

The chance of a birth rises with the size of the population, in steps:

```
p(n) = MIN_BIRTH_CHANCE + BIRTH_CHANCE_BONUS × floor(n / POPULATION_PER_BONUS)
```

with these values:

| Constant | Value | Meaning |
| --- | --- | --- |
| `MIN_BIRTH_CHANCE` | 0.25 | The lowest chance of a birth per roll. |
| `POPULATION_PER_BONUS` | 40 | How many people share one step of the rate. |
| `BIRTH_CHANCE_BONUS` | 0.01 | What one step of the rate adds. |
| `MAX_BIRTH_CHANCE` | 1 | The highest chance of a birth per roll. |
| `GROWTH_INTERVAL_SECONDS` | 5 | How long one roll interval lasts. |

The rate is flat at the minimum until the population reaches 40, then it
steps up by 1% for every 40 people.

### Why stepped

The curve has three properties that matter for the game:

1. **It starts where the design wants it.** At `n = 5` the chance is 25%,
   which over 5 second rolls gives a mean wait of 20 seconds.
2. **It rewards a bigger civilization.** A larger population grows faster,
   so the player is rewarded for building housing early.
3. **It flattens out.** Every step adds the same 1%, so doubling the
   population never doubles the birth rate. The growth is proportional, not
   exponential, so the player cannot ride a runaway curve, and the capacity
   of the huts stays the thing that limits the world.

The rate does not move at all inside a step, which keeps the early game
readable: the first 40 people all grow at the same 25% rate, so the player
gets a steady, predictable pace before the bonuses start arriving.

### When the rate caps at 100%

The minimum is 25% and every step adds 1%, so the rate needs 75 steps to
reach 100%. With 40 people to a step, that is:

```
75 steps × 40 people = 3000 people
```

So the birth rate caps at 100% at a population of **3000**. From that point
on the population grows by exactly one person per 5 second interval, which
is the fastest the world can go. A population of 2999 is still at 99%.

### The mean time to the next birth

The wait between births follows a geometric distribution, so the mean wait
is one over the chance:

```
T(n) = GROWTH_INTERVAL_SECONDS / p(n)
```

Worked examples:

| Population | Birth chance per 5 s | Mean time to the next birth |
| ---: | ---: | ---: |
| 5 | 25% | 20.0 s |
| 20 | 25% | 20.0 s |
| 40 | 26% | 19.2 s |
| 80 | 27% | 18.5 s |
| 100 | 27% | 18.5 s |
| 200 | 30% | 16.7 s |
| 400 | 35% | 14.3 s |
| 800 | 45% | 11.1 s |
| 1000 | 50% | 10.0 s |
| 1600 | 65% | 7.7 s |
| 2000 | 75% | 6.7 s |
| 2400 | 85% | 5.9 s |
| 2800 | 95% | 5.3 s |
| 2999 | 99% | 5.1 s |
| 3000 | 100% | 5.0 s |

The mean wait is a little pessimistic, because each new person can push the
population over a step boundary and raise the chance for the next one.
Filling the first hut from 5 to 10 takes about 100 seconds of expected time,
and going from 10 to 20 takes about 200.

### Worked example

A world with 20 people and two huts has a capacity of 10, so it is already
over capacity and no births happen. The player builds a third hut, which
finishes 30 ticks later. The capacity becomes 15, and the population is
still 20, so there is still no room.

A world with 12 people and three huts has a capacity of 15. The next roll
happens at the next multiple of 25 ticks. The population is inside the
first step, so the chance is 25%, and the mean wait for the next child is
`5 / 0.25 = 20` seconds. The population climbs to 15 and stops, because the
huts are full.

A world with 38 people and eight huts has a capacity of 40. The chance is
still 25%, because 38 is inside the first step. The world rolls every 5
seconds and produces a child about one time in four, so the population
creeps to 39 and then to 40. At 40 the rate steps up to 26%, and the mean
wait drops to 19.2 seconds.

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
