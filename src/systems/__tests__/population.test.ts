import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import {
  BIRTH_CHANCE_BONUS,
  GROWTH_INTERVAL_SECONDS,
  GROWTH_INTERVAL_TICKS,
  MAX_BIRTH_CHANCE,
  MIN_BIRTH_CHANCE,
  POPULATION_PER_BONUS,
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
    expect(MIN_BIRTH_CHANCE).toBe(0.25);
    expect(GROWTH_INTERVAL_SECONDS).toBe(5);
    expect(getMeanGrowthSeconds(5)).toBeCloseTo(20, 10);
  });

  it('grows faster as the population grows', () => {
    // The rate is flat inside a step, so it only rises at a step boundary.
    expect(getBirthChance(40)).toBeGreaterThan(getBirthChance(39));
    expect(getBirthChance(80)).toBeGreaterThan(getBirthChance(79));
    expect(getBirthChance(100)).toBeGreaterThan(getBirthChance(79));
  });

  it('stays at the minimum until the population reaches a step', () => {
    expect(getBirthChance(1)).toBeCloseTo(MIN_BIRTH_CHANCE, 10);
    expect(getBirthChance(5)).toBeCloseTo(MIN_BIRTH_CHANCE, 10);
    expect(getBirthChance(39)).toBeCloseTo(MIN_BIRTH_CHANCE, 10);

    // The fortieth person is the first one that earns a bonus.
    expect(getBirthChance(40)).toBeCloseTo(MIN_BIRTH_CHANCE + BIRTH_CHANCE_BONUS, 10);
  });

  it('adds one bonus for every step of forty people', () => {
    expect(POPULATION_PER_BONUS).toBe(40);

    expect(getBirthChance(40)).toBeCloseTo(0.26, 10);
    expect(getBirthChance(80)).toBeCloseTo(0.27, 10);
    expect(getBirthChance(120)).toBeCloseTo(0.28, 10);
    expect(getBirthChance(400)).toBeCloseTo(0.35, 10);
    expect(getBirthChance(1000)).toBeCloseTo(0.50, 10);
  });

  it('holds the rate steady between two steps', () => {
    expect(getBirthChance(40)).toBe(getBirthChance(79));
    expect(getBirthChance(80)).toBe(getBirthChance(119));
  });

  it('caps at one birth per interval', () => {
    expect(MAX_BIRTH_CHANCE).toBe(1);
    expect(getBirthChance(3000)).toBe(1);
    expect(getBirthChance(3001)).toBe(1);
    expect(getBirthChance(100000)).toBe(1);
    expect(getMeanGrowthSeconds(100000)).toBeCloseTo(GROWTH_INTERVAL_SECONDS, 10);
  });

  it('reaches the cap at the population the bonus fills it', () => {
    // The minimum plus 75 bonuses of 1% is 100%.
    const capPopulation = POPULATION_PER_BONUS * Math.round(
      (MAX_BIRTH_CHANCE - MIN_BIRTH_CHANCE) / BIRTH_CHANCE_BONUS,
    );

    expect(capPopulation).toBe(3000);
    expect(getBirthChance(capPopulation - 1)).toBeLessThan(MAX_BIRTH_CHANCE);
    expect(getBirthChance(capPopulation)).toBe(MAX_BIRTH_CHANCE);
  });

  it('grows no slower as the population shrinks', () => {
    expect(getBirthChance(1)).toBeGreaterThanOrEqual(0);
    expect(getBirthChance(0)).toBe(0);
  });

  it('never grows faster than one person per interval', () => {
    for (const population of [1, 40, 400, 3000, 100000]) {
      expect(getBirthChance(population)).toBeLessThanOrEqual(MAX_BIRTH_CHANCE);
    }
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
