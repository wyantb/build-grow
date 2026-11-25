import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import {
  BASE_GROWTH_CHANCE,
  GROWTH_INTERVAL_SECONDS,
  GROWTH_INTERVAL_TICKS,
  POPULATION_PER_HUT,
  getBirthChance,
  getMeanGrowthSeconds,
  getPopulationCapacity,
} from '../population.js';
import { getGameState, resetGameState } from '../../hooks/useGameState.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import { createTestWorld } from './testWorld.js';

/**
 * A roll that always succeeds, so a birth happens on every check.
 */
const alwaysBirths = () => 0;

/**
 * A roll that never succeeds, so no birth ever happens.
 */
const neverBirths = () => 1;

describe('population capacity', () => {
  it('houses five people in a hut', () => {
    expect(POPULATION_PER_HUT).toBe(5);
    expect(getPopulationCapacity(1)).toBe(5);
    expect(getPopulationCapacity(3)).toBe(15);
  });

  it('houses nobody without a hut', () => {
    expect(getPopulationCapacity(0)).toBe(0);
  });

  it('starts a new game with one hut and room for five', () => {
    const engine = new GameEngine();

    expect(engine.getState().buildingCounts['hut']).toBe(1);
    expect(engine.getState().buildings['hut-0']?.built).toBe(true);
    expect(engine.getPopulationCapacity()).toBe(5);
    expect(engine.getState().population).toBe(5);
  });

  it('counts a hut that is still going up for nothing', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');
    engine.runTicks(3);

    // The new hut is still under construction, so it houses nobody.
    expect(engine.getState().buildings['hut-0']?.built).toBe(false);
    expect(engine.getPopulationCapacity()).toBe(0);

    engine.runTicks(7);

    expect(engine.getState().buildings['hut-0']?.built).toBe(true);
    expect(engine.getPopulationCapacity()).toBe(5);
  });
});

describe('population growth', () => {
  it('does not grow past the capacity of the huts', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      buildings: ['hut'],
    }), alwaysBirths);

    // The only hut is full, so no birth can happen.
    engine.runTicks(GROWTH_INTERVAL_TICKS * 10);

    expect(engine.getState().population).toBe(5);
  });

  it('grows when there is room in the huts', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      buildings: ['hut'],
    }), alwaysBirths);

    engine.runTicks(GROWTH_INTERVAL_TICKS);

    expect(engine.getState().population).toBe(5);
  });

  it('grows by one person per check, not by more', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      buildings: ['hut', 'hut'],
    }), alwaysBirths);

    engine.runTicks(GROWTH_INTERVAL_TICKS);

    expect(engine.getState().population).toBe(5);
  });

  it('only rolls on the growth interval', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      buildings: ['hut'],
    }), alwaysBirths);

    // One tick short of the interval, so no roll has happened yet.
    engine.runTicks(GROWTH_INTERVAL_TICKS - 1);

    expect(engine.getState().population).toBe(4);

    engine.runTicks(1);

    expect(engine.getState().population).toBe(5);
  });

  it('never grows when the roll fails', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      buildings: ['hut'],
    }), neverBirths);

    engine.runTicks(GROWTH_INTERVAL_TICKS * 20);

    expect(engine.getState().population).toBe(4);
  });

  it('puts a new person in the default job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      buildings: ['hut'],
    }), alwaysBirths);

    engine.runTicks(GROWTH_INTERVAL_TICKS);

    expect(engine.getState().population).toBe(5);
    expect(engine.getState().jobs['unemployed']?.workers).toBe(5);
  });

  it('does not run the roll before the first interval', () => {
    let rolls = 0;

    const engine = new GameEngine(createTestWorld({
      population: 4,
      buildings: ['hut'],
    }), () => {
      rolls++;

      return 0;
    });

    engine.runTicks(GROWTH_INTERVAL_TICKS - 1);

    expect(rolls).toBe(0);

    engine.runTicks(1);

    expect(rolls).toBe(1);
  });
});

describe('the growth rate', () => {
  it('takes twenty seconds on average at the starting population', () => {
    expect(BASE_GROWTH_CHANCE).toBe(0.25);
    expect(GROWTH_INTERVAL_SECONDS).toBe(5);
    expect(getMeanGrowthSeconds(5)).toBeCloseTo(20, 10);
  });

  it('grows faster as the population grows', () => {
    expect(getBirthChance(10)).toBeGreaterThan(getBirthChance(5));
    expect(getBirthChance(100)).toBeGreaterThan(getBirthChance(10));
  });

  it('grows logarithmically, so a bigger population is not proportionally faster', () => {
    // Doubling the population raises the birth rate by less than the rate
    // itself.
    const chanceAt5 = getBirthChance(5);
    const chanceAt10 = getBirthChance(10);
    const chanceAt20 = getBirthChance(20);

    expect(chanceAt10 / chanceAt5).toBeLessThan(2);
    expect(chanceAt20 / chanceAt10).toBeLessThan(2);

    // The ratio itself shrinks as the population grows, which is what a
    // logarithmic curve does.
    expect(chanceAt20 / chanceAt10).toBeLessThan(chanceAt10 / chanceAt5);
  });

  it('never grows faster than one person per interval', () => {
    expect(getBirthChance(1000)).toBeLessThanOrEqual(1);
    expect(getBirthChance(100000)).toBe(1);
    expect(getMeanGrowthSeconds(100000)).toBeCloseTo(GROWTH_INTERVAL_SECONDS, 10);
  });

  it('grows no slower as the population shrinks', () => {
    expect(getBirthChance(1)).toBeGreaterThanOrEqual(0);
    expect(getBirthChance(0)).toBe(0);
  });

  it('settles at the base rate for the starting population', () => {
    expect(getBirthChance(5)).toBeCloseTo(BASE_GROWTH_CHANCE, 10);
  });
});

describe('the store', () => {
  it('reports the capacity of the huts to the resources panel', () => {
    resetGameState();

    const gameState = getGameState();

    // A new world has one hut, so the population fills it exactly.
    expect(gameState.getPopulation()).toBe(5);
    expect(gameState.getPopulationCapacity()).toBe(5);

    resetGameState();
  });

  it('grows the capacity when a hut is finished', () => {
    resetGameState();

    const gameState = getGameState();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(10);
    gameState.mirrorEngineState();

    expect(gameState.getPopulationCapacity()).toBe(10);

    resetGameState();
  });
});

describe('population through a save', () => {
  it('keeps the population and the capacity through a round trip', () => {
    const engine = new GameEngine(createTestWorld({
      population: 8,
      buildings: ['hut', 'hut'],
    }));

    const restored = deserializePayload(serializeState(engine.getState()));

    expect(restored.population).toBe(8);
    expect(restored.buildingCounts['hut']).toBe(2);
    expect(getPopulationCapacity(restored.buildingCounts['hut'] ?? 0)).toBe(10);
  });

  it('does not give a saved world the hut a new game starts with', () => {
    const engine = new GameEngine(createTestWorld({
      population: 3,
    }));

    const restored = deserializePayload(serializeState(engine.getState()));

    expect(restored.buildingCounts['hut']).toBeUndefined();
    expect(getPopulationCapacity(restored.buildingCounts['hut'] ?? 0)).toBe(0);
  });
});
