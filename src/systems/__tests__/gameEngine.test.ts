import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

const TICKS_PER_SECOND = 5;

describe('GameEngine resource rates', () => {
  it('reports the net per-tick and per-second food rate for one farmer', () => {
    // 4 population: 3 unemployed, 1 farmer.
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
    }));
    engine.assignWorkers('farmer', 1);

    // Farmer produces 0.0625 food/tick and consumes 0.025 food/tick.
    expect(engine.getTickRates().food).toBeCloseTo(0.0375, 10);
    expect(engine.getResourceRates().food).toBeCloseTo(0.1875, 10);
  });

  it('nets unemployed workers to zero food', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
    }));

    expect(engine.getTickRates().food).toBeCloseTo(0, 10);
    expect(engine.getResourceRates().food).toBeCloseTo(0, 10);
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

  it('reports a rate of zero when no job is staffed', () => {
    const engine = new GameEngine(createTestWorld({ population: 4 }));

    expect(engine.getResourceRates()).toEqual({
      wood: 0,
      stone: 0,
      food: 0,
      gold: 0,
    });
  });
});

describe('GameEngine batch ticking', () => {
  it('applies the same food growth over a batch of ticks as over a single tick loop', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
    }));
    engine.assignWorkers('farmer', 1);

    const foodBefore = engine.getState().resources.food;

    engine.runTicks(100);

    const foodAfter = engine.getState().resources.food;

    // 100 ticks at 0.0375 food/tick = 3.75 food.
    expect(foodAfter - foodBefore).toBeCloseTo(3.75, 6);
    expect(engine.getState().tick).toBe(100);
  });

  it('matches the single-tick path tick for tick', () => {
    const build = () => {
      const engine = new GameEngine(createTestWorld({
        population: 4,
        workers: { unemployed: 3 },
        buildings: ['farm'],
      }));
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
