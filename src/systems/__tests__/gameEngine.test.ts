import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

const TICKS_PER_SECOND = 5;

describe('GameEngine resource rates', () => {
  it('reports the net per-tick and per-second food rate for one farmer', () => {
    // 4 population: 3 unemployed, 1 farmer.
    // Each human eats 0.025/tick, so 4 humans = 0.1 consumption.
    // Farmer produces 0.08/tick at neutral stats.
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
    }));
    engine.assignWorkers('farmer', 1);

    expect(engine.getTickRates().food).toBeCloseTo(0.08 - 0.1, 10);
    expect(engine.getResourceRates().food).toBeCloseTo((0.08 - 0.1) * TICKS_PER_SECOND, 10);
  });

  it('nets unemployed workers to species consumption', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
    }));

    // 4 humans each eat 0.025/tick; no food production.
    expect(engine.getTickRates().food).toBeCloseTo(-0.1, 10);
    expect(engine.getResourceRates().food).toBeCloseTo(-0.5, 10);
  });

  it('multiplies the per-tick rate by the tick frequency to get the per-second rate', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
    }));
    engine.assignWorkers('farmer', 1);

    const tickRate = engine.getTickRates().food;
    const perSecond = engine.getResourceRates().food;

    expect(perSecond).toBeCloseTo(tickRate * TICKS_PER_SECOND, 10);
  });

  it('keeps the rate stable when a one-off cost is paid', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
    }));
    engine.assignWorkers('farmer', 1);

    const rateBefore = engine.getResourceRates().food;

    // Buying a building spends wood. That one-off spend must not show up
    // in the food rate, which is derived from the job table.
    engine.addBuilding('hut');

    expect(engine.getResourceRates().food).toBeCloseTo(rateBefore, 10);
  });

  it('reports species consumption and research when no job is staffed', () => {
    const engine = new GameEngine(createTestWorld({ population: 4 }));

    // 4 humans each eat 0.025/tick and produce 0.02 research/tick.
    expect(engine.getResourceRates().food).toBeCloseTo(-0.1 * TICKS_PER_SECOND, 10);
    expect(engine.getResourceRates().research).toBeCloseTo(0.08 * TICKS_PER_SECOND, 10);
  });
});

describe('GameEngine research accumulation', () => {
  it('accumulates research over a batch of ticks', () => {
    let seed = 46;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;

      return seed / 0xffffffff;
    };

    // 5 population, well-fed so nobody starves.
    const engine = new GameEngine(createTestWorld({
      population: 5,
      workers: { unemployed: 5 },
      buildings: ['farm'],
      resources: { food: 1000 },
    }), rng);

    expect(engine.getState().resources.research).toBe(0);
    expect(engine.getTickRates().research).toBeCloseTo(0.1, 10);

    engine.runTicks(50);

    // 5 humans * 0.02 research/tick * 50 ticks = 5.0
    expect(engine.getState().resources.research).toBeCloseTo(5.0, 6);
  });
});

describe('GameEngine batch ticking', () => {
  it('applies the same food growth over a batch of ticks as over a single tick loop', () => {
    let seed = 46;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;

      return seed / 0xffffffff;
    };

    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
      resources: { food: 3 },
    }), rng);
    engine.assignWorkers('farmer', 1);

    const foodBefore = engine.getState().resources.food;
    const tickRate = engine.getTickRates().food;

    engine.runTicks(100);

    const foodAfter = engine.getState().resources.food;

    // 100 ticks at the same net rate.
    expect(foodAfter - foodBefore).toBeCloseTo(tickRate * 100, 6);
    expect(engine.getState().tick).toBe(100);
  });

  it('matches the single-tick path tick for tick', () => {
    // Both engines get independent RNGs seeded identically so they see the
    // same birth rolls.
    const makeRng = () => {
      let seed = 46;

      return () => {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;

        return seed / 0xffffffff;
      };
    };
    const build = () => {
      const engine = new GameEngine(createTestWorld({
        population: 4,
        workers: { unemployed: 3 },
        buildings: ['farm'],
      }), makeRng());
      engine.assignWorkers('farmer', 1);

      return engine;
    };

    const batched = build();
    const stepped = build();

    batched.runTicks(100);
    const batchedFood = batched.getState().resources.food;

    for (let i = 0; i < 100; i++) {
      stepped.update(200);
    }
    const steppedFood = stepped.getState().resources.food;

    expect(batchedFood).toBeCloseTo(steppedFood, 10);
    expect(batched.getState().gameTime).toBeCloseTo(stepped.getState().gameTime, 10);
  });

  it('advances game time by the number of ticks processed', () => {
    const engine = new GameEngine(createTestWorld({ population: 4, workers: { unemployed: 4 } }));

    engine.runTicks(100);

    // 100 ticks at 200ms each = 20 seconds of game time.
    expect(engine.getState().gameTime).toBeCloseTo(20, 6);
  });

  it('notifies subscribers once for a batch, not once per tick', () => {
    const engine = new GameEngine(createTestWorld({ population: 4, workers: { unemployed: 4 } }));

    let notifications = 0;
    const unsubscribe = engine.subscribe(() => {
      notifications++;
    });

    engine.runTicks(100);
    expect(notifications).toBe(1);

    engine.update(200);
    expect(notifications).toBe(2);

    unsubscribe();
    engine.runTicks(100);
    expect(notifications).toBe(2);
  });

  it('ignores a non-positive or non-finite tick count', () => {
    const engine = new GameEngine(createTestWorld({ population: 4, workers: { unemployed: 4 } }));

    engine.runTicks(0);
    engine.runTicks(-5);
    engine.runTicks(Number.NaN);
    engine.runTicks(Number.POSITIVE_INFINITY);

    expect(engine.getState().tick).toBe(0);
    expect(engine.getState().gameTime).toBe(0);
  });

  it('builds a building the moment it is paid for', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');

    expect(engine.getState().buildings['hut-0']).toBeDefined();
    expect(engine.getState().buildingCounts['hut']).toBe(1);
  });

  it('applies a building effect straight away', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100, stone: 100 },
    }));

    expect(engine.getState().jobs['lumberjack']?.capacity).toBe(0);

    engine.addBuilding('lumberjack');

    expect(engine.getState().jobs['lumberjack']?.capacity).toBe(1);
  });
});
