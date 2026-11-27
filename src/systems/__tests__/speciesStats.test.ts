import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { JOBS, JOB_STATS } from '../../data/jobs.js';
import { DEFAULT_SPECIES_ID, NEUTRAL_STATS } from '../../data/species.js';
import type { Stats } from '../../types/worldState.js';
import { getAverageStats, getJobFactor, getStatFactor, getWeightedStatFactor } from '../stats.js';
import { createTestWorld } from './testWorld.js';

/**
 * The base rate of a job, per worker, per tick.
 */
const baseRate = (jobId: string, resource: keyof typeof JOBS[string]['production']): number =>
  JOBS[jobId]!.production[resource];

/**
 * A set of stats where only the given ones differ from the average.
 */
const stats = (overrides: Partial<Stats>): Stats => ({ ...NEUTRAL_STATS, ...overrides });

describe('the stat factor', () => {
  it('treats a stat of 100 as neither a bonus nor a malus', () => {
    expect(getStatFactor(100)).toBe(1);
  });

  it('reads a stat below the average as a malus and one above it as a bonus', () => {
    expect(getStatFactor(80)).toBeCloseTo(0.8, 10);
    expect(getStatFactor(130)).toBeCloseTo(1.3, 10);
  });

  it('halves the departure from the average at half weight', () => {
    // A 10% malus is a 5% malus when it counts half.
    expect(getWeightedStatFactor(90, 0.5)).toBeCloseTo(0.95, 10);

    // A 30% bonus is a 15% bonus when it counts half.
    expect(getWeightedStatFactor(130, 0.5)).toBeCloseTo(1.15, 10);
  });

  it('leaves the average alone at any weight', () => {
    expect(getWeightedStatFactor(100, 1)).toBe(1);
    expect(getWeightedStatFactor(100, 0.5)).toBe(1);
  });
});

describe('the job factor', () => {
  it('counts the primary stat fully and the secondary stat half', () => {
    const factor = getJobFactor(
      { primary: 'strength', secondary: 'intelligence' },
      stats({ strength: 80, intelligence: 90 }),
    );

    // 0.8 x 0.95
    expect(factor).toBeCloseTo(0.76, 10);
  });

  it('multiplies a primary bonus and a secondary malus', () => {
    const factor = getJobFactor(
      { primary: 'strength', secondary: 'intelligence' },
      stats({ strength: 130, intelligence: 85 }),
    );

    // 1.3 x 0.925
    expect(factor).toBeCloseTo(1.2025, 10);
  });

  it('leaves a job with no stats of its own alone', () => {
    expect(getJobFactor({}, stats({ strength: 5 }))).toBe(1);
  });

  it('leaves a job alone when every stat is the average', () => {
    const factor = getJobFactor(JOB_STATS['lumberjack']!, NEUTRAL_STATS);

    expect(factor).toBe(1);
  });
});

describe('the average stats of a job', () => {
  it('averages the stats of a mixed job over its people', () => {
    const elf = stats({ strength: 120 });
    const human = stats({ strength: 80 });

    const average = getAverageStats(
      { elf: 1, human: 1 },
      (id) => (id === 'elf' ? elf : human),
    );

    expect(average.strength).toBeCloseTo(100, 10);
  });

  it('weighs each person the same, whatever their species', () => {
    const elf = stats({ strength: 200 });
    const human = stats({ strength: 0 });

    // One elf and three humans: 200 + 0 + 0 + 0, over four people.
    const average = getAverageStats(
      { elf: 1, human: 3 },
      (id) => (id === 'elf' ? elf : human),
    );

    expect(average.strength).toBeCloseTo(50, 10);
  });

  it('gives a job with nobody in it the average stats', () => {
    const average = getAverageStats({}, () => NEUTRAL_STATS);

    expect(average).toEqual(NEUTRAL_STATS);
  });
});

describe('a job staffed by one species', () => {
  it('produces wood at the base rate when the stats are the average', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
    }));

    engine.assignWorkers('lumberjack', 1);

    expect(engine.getTickRates().wood).toBeCloseTo(baseRate('lumberjack', 'wood'), 10);
  });

  it('scales the production of a resource over a batch of ticks', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
      species: { human: { strength: 80, intelligence: 90 } },
    }));

    engine.assignWorkers('lumberjack', 1);

    const woodBefore = engine.getState().resources.wood;

    engine.runTicks(100);

    // 100 ticks of one lumberjack at 0.8 x 0.95 of the base rate.
    const expected = baseRate('lumberjack', 'wood') * 0.8 * 0.95 * 100;
    const produced = engine.getState().resources.wood - woodBefore;

    expect(produced).toBeCloseTo(expected, 6);
  });

  it('scales the production up when the stats are above the average', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
      species: { human: { strength: 130, intelligence: 85 } },
    }));

    engine.assignWorkers('lumberjack', 1);

    const woodBefore = engine.getState().resources.wood;

    engine.runTicks(100);

    // 1.3 x 0.925
    const expected = baseRate('lumberjack', 'wood') * 1.3 * 0.925 * 100;
    const produced = engine.getState().resources.wood - woodBefore;

    expect(produced).toBeCloseTo(expected, 6);
  });

  it('leaves the consumption of the job alone', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
      species: { human: { strength: 5, intelligence: 5 } },
    }));

    engine.assignWorkers('lumberjack', 1);

    // A lumberjack eats the same whatever their stats are, so the food
    // the job costs is the same.
    const expected = (baseRate('lumberjack', 'food') - JOBS['lumberjack']!.consumption.food);

    expect(engine.getTickRates().food).toBeCloseTo(expected, 10);
  });
});

describe('the worked examples from the design', () => {
  it('gives a lumberjack with 80 strength and 90 intelligence a 0.8 x 0.95 rate', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
      species: { human: { strength: 80, intelligence: 90 } },
    }));

    engine.assignWorkers('lumberjack', 1);

    const rate = engine.getTickRates().wood;
    const base = baseRate('lumberjack', 'wood');

    expect(rate / base).toBeCloseTo(0.8 * 0.95, 10);
  });

  it('gives a lumberjack with 130 strength and 85 intelligence a 1.3 x 0.925 rate', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
      species: { human: { strength: 130, intelligence: 85 } },
    }));

    engine.assignWorkers('lumberjack', 1);

    const rate = engine.getTickRates().wood;
    const base = baseRate('lumberjack', 'wood');

    expect(rate / base).toBeCloseTo(1.3 * 0.925, 10);
  });
});

describe('a job with the stats of the design', () => {
  it('gives the lumberjack strength and intelligence', () => {
    expect(JOB_STATS['lumberjack']).toEqual({ primary: 'strength', secondary: 'intelligence' });
  });

  it('gives the quarrier strength and constitution', () => {
    expect(JOB_STATS['quarrier']).toEqual({ primary: 'strength', secondary: 'constitution' });
  });

  it('gives the farmer constitution and wisdom', () => {
    expect(JOB_STATS['farmer']).toEqual({ primary: 'constitution', secondary: 'wisdom' });
  });

  it('gives the settler intelligence and charisma', () => {
    expect(JOB_STATS['settler']).toEqual({ primary: 'intelligence', secondary: 'charisma' });
  });

  it('gives no job any stats when it has none of its own', () => {
    expect(JOB_STATS['merchant']).toBeUndefined();
    expect(JOB_STATS['unemployed']).toBeUndefined();
  });

  it('scales a quarry with the stats of its own job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['quarry'],
      species: { human: { strength: 80, constitution: 90 } },
    }));

    engine.assignWorkers('quarrier', 1);

    // A quarrier produces stone and eats food, so the stone rate is the
    // production alone.
    const rate = engine.getTickRates().stone;
    const base = baseRate('quarrier', 'stone');

    expect(rate / base).toBeCloseTo(0.8 * 0.95, 10);
  });

  it('scales a farmer with the stats of its own job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['farm'],
      species: { human: { constitution: 80, wisdom: 90 } },
    }));

    engine.assignWorkers('farmer', 1);

    // A farmer produces food and eats food, so the food rate is the
    // production scaled by the stats, less what the worker eats.
    const rate = engine.getTickRates().food;
    const base = baseRate('farmer', 'food');
    const eaten = JOBS['farmer']!.consumption.food;

    expect(rate).toBeCloseTo((base * 0.8 * 0.95) - eaten, 10);
  });

  it('scales a settler with the stats of its own job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      species: { human: { intelligence: 80, charisma: 90 } },
    }));

    engine.assignWorkers('settler', 1);

    // A settler produces wood and eats food, so the wood rate is the
    // production alone.
    const rate = engine.getTickRates().wood;
    const base = baseRate('settler', 'wood');

    expect(rate / base).toBeCloseTo(0.8 * 0.95, 10);
  });

  it('leaves a merchant alone, whatever its stats are', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['market'],
      species: { human: { strength: 5, intelligence: 5, constitution: 5 } },
    }));

    engine.assignWorkers('merchant', 1);

    expect(engine.getTickRates().wood).toBeCloseTo(0, 10);
    expect(engine.getTickRates().stone).toBeCloseTo(0, 10);
  });
});

describe('a job staffed by more than one species', () => {
  it('averages the stats of the species working it', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { lumberjack: 2, unemployed: 2 },
      buildings: ['lumberjack', 'lumberjack'],
      species: {
        human: { strength: 80, intelligence: 100 },
        elf: { strength: 120, intelligence: 100 },
      },
      jobSpecies: { lumberjack: { human: 1, elf: 1 }, unemployed: { human: 1, elf: 1 } },
    }));

    const rate = engine.getTickRates().wood;
    const base = baseRate('lumberjack', 'wood');

    // Two workers at the base rate.
    expect(rate / base).toBeCloseTo(2, 10);
  });

  it('works at the rate of the weaker species when one is much worse', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { lumberjack: 2, unemployed: 2 },
      buildings: ['lumberjack', 'lumberjack'],
      species: {
        human: { strength: 100, intelligence: 100 },
        elf: { strength: 60, intelligence: 100 },
      },
      jobSpecies: { lumberjack: { human: 1, elf: 1 }, unemployed: { human: 1, elf: 1 } },
    }));

    const rate = engine.getTickRates().wood;
    const base = baseRate('lumberjack', 'wood');

    // The average strength of 100 and 60 is 80, so two workers work at
    // 0.8 of the base rate each.
    expect(rate / base).toBeCloseTo(2 * 0.8, 10);
  });
});

describe('the species of a job', () => {
  it('records who works a job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
    }));

    engine.assignWorkers('lumberjack', 1);

    expect(engine.getState().jobs['lumberjack']?.species).toEqual({ human: 1 });
  });

  it('counts the people who leave a job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
    }));

    engine.assignWorkers('lumberjack', 1);
    engine.assignWorkers('lumberjack', -1);

    expect(engine.getState().jobs['lumberjack']?.species).toEqual({});
    expect(engine.getState().jobs['lumberjack']?.workers).toBe(0);
  });

  it('moves the people who leave a job to the default job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 3 },
      buildings: ['lumberjack'],
    }));

    engine.assignWorkers('lumberjack', 1);
    engine.assignWorkers('lumberjack', -1);

    expect(engine.getState().jobs['unemployed']?.species).toEqual({ human: 4 });
  });

  it('counts every worker of a job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 7,
      workers: { unemployed: 5 },
      buildings: ['lumberjack', 'lumberjack'],
    }));

    engine.assignWorkers('lumberjack', 2);

    expect(engine.getState().jobs['lumberjack']?.species).toEqual({ human: 2 });
    expect(engine.getState().jobs['lumberjack']?.workers).toBe(2);
  });

  it('counts the workers of a job that has more than one species', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      workers: { lumberjack: 2, unemployed: 3 },
      buildings: ['lumberjack', 'lumberjack'],
      jobSpecies: { lumberjack: { human: 1, elf: 1 }, unemployed: { human: 1, elf: 2 } },
    }));

    expect(engine.getState().jobs['lumberjack']?.species).toEqual({ human: 1, elf: 1 });
    expect(engine.getState().jobs['lumberjack']?.workers).toBe(2);
  });
});

describe('the rate the engine reports', () => {
  it('matches the wood gained over a batch of ticks', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      workers: { unemployed: 4 },
      buildings: ['lumberjack'],
      species: { human: { strength: 80, intelligence: 90 } },
    }));

    engine.assignWorkers('lumberjack', 1);

    const rate = engine.getTickRates().wood;
    const woodBefore = engine.getState().resources.wood;

    engine.runTicks(50);

    const gained = engine.getState().resources.wood - woodBefore;

    expect(gained).toBeCloseTo(rate * 50, 6);
  });

  it('matches the food gained over a batch of ticks', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      workers: { unemployed: 4 },
      buildings: ['farm'],
      resources: { food: 200 },
      species: { human: { constitution: 120, wisdom: 110 } },
    }));

    engine.assignWorkers('farmer', 1);

    const rate = engine.getTickRates().food;
    const foodBefore = engine.getState().resources.food;

    engine.runTicks(50);

    const gained = engine.getState().resources.food - foodBefore;

    expect(gained).toBeCloseTo(rate * 50, 6);
  });

  it('matches the stone gained over a batch of ticks', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      workers: { unemployed: 4 },
      buildings: ['quarry'],
      species: { human: { strength: 130, constitution: 85 } },
    }));

    engine.assignWorkers('quarrier', 1);

    const rate = engine.getTickRates().stone;
    const stoneBefore = engine.getState().resources.stone;

    engine.runTicks(50);

    const gained = engine.getState().resources.stone - stoneBefore;

    expect(gained).toBeCloseTo(rate * 50, 6);
  });

  it('matches the wood gained over a batch of ticks for a mixed job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 5,
      workers: { unemployed: 5 },
      buildings: ['lumberjack', 'lumberjack'],
      species: {
        human: { strength: 80, intelligence: 100 },
        elf: { strength: 120, intelligence: 100 },
      },
      jobSpecies: { unemployed: { human: 3, elf: 2 } },
    }));

    engine.assignWorkers('lumberjack', 1, 'human');
    engine.assignWorkers('lumberjack', 1, 'elf');

    const rate = engine.getTickRates().wood;
    const woodBefore = engine.getState().resources.wood;

    engine.runTicks(50);

    const gained = engine.getState().resources.wood - woodBefore;

    expect(gained).toBeCloseTo(rate * 50, 6);
  });
});

describe('the bookkeeping of the species', () => {
  it('adds up to the worker count of the job', () => {
    const engine = new GameEngine(createTestWorld({
      population: 8,
      workers: { unemployed: 7 },
      buildings: ['lumberjack', 'lumberjack'],
      jobSpecies: { unemployed: { human: 4, elf: 3 } },
    }));

    engine.assignWorkers('lumberjack', 2, 'human');
    engine.assignWorkers('lumberjack', 1, 'elf');

    const job = engine.getState().jobs['lumberjack'];
    const counted = Object.values(job?.species ?? {}).reduce((sum, count) => sum + count, 0);

    expect(counted).toBe(job?.workers);
  });

  it('adds up to the worker count after a removal', () => {
    const engine = new GameEngine(createTestWorld({
      population: 8,
      workers: { unemployed: 7 },
      buildings: ['lumberjack', 'lumberjack'],
      jobSpecies: { unemployed: { human: 4, elf: 3 } },
    }));

    engine.assignWorkers('lumberjack', 2, 'human');
    engine.assignWorkers('lumberjack', 1, 'elf');
    engine.assignWorkers('lumberjack', -2);

    const job = engine.getState().jobs['lumberjack'];
    const counted = Object.values(job?.species ?? {}).reduce((sum, count) => sum + count, 0);

    expect(counted).toBe(job?.workers);
  });

  it('keeps the population the same when workers move between jobs', () => {
    const engine = new GameEngine(createTestWorld({
      population: 6,
      workers: { unemployed: 5 },
      buildings: ['lumberjack'],
    }));

    engine.assignWorkers('lumberjack', 1);

    expect(engine.getPopulation()).toBe(6);

    const total = Object.values(engine.getState().jobs)
      .reduce((sum, job) => sum + job.workers, 0);

    expect(total).toBe(6);
  });

  it('does not assign more workers of a species than the world has', () => {
    const engine = new GameEngine(createTestWorld({
      population: 6,
      workers: { unemployed: 5 },
      buildings: ['lumberjack', 'lumberjack'],
      jobSpecies: { unemployed: { human: 5, elf: 1 } },
    }));

    // There is one elf in the world, so only one can be assigned.
    engine.assignWorkers('lumberjack', 1, 'elf');
    engine.assignWorkers('lumberjack', 1, 'elf');

    const job = engine.getState().jobs['lumberjack'];

    expect(job?.species['elf'] ?? 0).toBeLessThanOrEqual(1);
  });

  it('assigns nobody when the world has nobody of that species', () => {
    const engine = new GameEngine(createTestWorld({
      population: 6,
      workers: { unemployed: 5 },
      buildings: ['lumberjack', 'lumberjack'],
      jobSpecies: { unemployed: { human: 5 } },
    }));

    engine.assignWorkers('lumberjack', 1, 'elf');

    expect(engine.getState().jobs['lumberjack']?.workers).toBe(0);
    expect(engine.getState().jobs['lumberjack']?.species).toEqual({});
  });
});

describe('the roster of species', () => {
  it('counts the whole population of a new world', () => {
    const engine = new GameEngine();

    expect(engine.getState().species[DEFAULT_SPECIES_ID]?.count).toBe(5);
  });

  it('counts a child as a member of the species', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      buildings: ['hut', 'hut'],
    }), () => 0);

    engine.runTicks(25);

    expect(engine.getPopulation()).toBe(5);
    expect(engine.getState().species[DEFAULT_SPECIES_ID]?.count).toBe(5);
  });

  it('adds up to the population of the world', () => {
    const engine = new GameEngine(createTestWorld({
      population: 6,
      workers: { unemployed: 4, lumberjack: 2 },
      buildings: ['lumberjack', 'lumberjack'],
    }));

    const counted = Object.values(engine.getState().species)
      .reduce((sum, entry) => sum + entry.count, 0);

    expect(counted).toBe(engine.getPopulation());
  });
});

describe('the species of a new world', () => {
  it('starts with humans who are good at everything but magic', () => {
    const engine = new GameEngine();

    const human = engine.getState().species[DEFAULT_SPECIES_ID];

    expect(human?.stats.strength).toBe(80);
    expect(human?.stats.dexterity).toBe(80);
    expect(human?.stats.constitution).toBe(80);
    expect(human?.stats.intelligence).toBe(80);
    expect(human?.stats.wisdom).toBe(80);
    expect(human?.stats.charisma).toBe(80);
    expect(human?.stats.manaSensitivity).toBe(5);
  });

  it('starts with the whole population in the default job', () => {
    const engine = new GameEngine();

    expect(engine.getState().jobs['unemployed']?.species).toEqual({ human: 5 });
  });
});
