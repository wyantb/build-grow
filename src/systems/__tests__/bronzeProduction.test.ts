import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

describe('the bronze production chain', () => {
  it('produces copper and tin with 1 miner each over 100 ticks', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['copper_mine', 'tin_mine'],
      unlockedBuildings: ['copper_mine', 'tin_mine'],
      researchedTechs: ['mining'],
      workers: { copper_miner: 1, tin_miner: 1, bronze_caster: 0 },
      resources: { copper: 0, tin: 0, bronze: 0 },
    }));

    engine.runTicks(100);

    // At least some copper and tin accumulated (rates depend on stats but miners produce).
    expect(engine.getState().resources.copper).toBeGreaterThan(0);
    expect(engine.getState().resources.tin).toBeGreaterThan(0);
    // No bronze yet because bronze_caster has no workers.
    expect(engine.getState().resources.bronze).toBe(0);
  });

  it('produces bronze when a caster is staffed', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['copper_mine', 'tin_mine', 'copper_kiln'],
      unlockedBuildings: ['copper_mine', 'tin_mine', 'copper_kiln'],
      researchedTechs: ['mining', 'bronze_alloy'],
      workers: { copper_miner: 1, tin_miner: 1, bronze_caster: 1 },
      resources: { copper: 50, tin: 50, bronze: 0 },
    }));

    engine.runTicks(100);

    // Bronze should have been produced from consumed copper + tin.
    expect(engine.getState().resources.bronze).toBeGreaterThan(0);
  });

  it('mining jobs benefit from strength stat', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['copper_mine'],
      unlockedBuildings: ['copper_mine'],
      researchedTechs: ['mining'],
      workers: { copper_miner: 1 },
      species: {
        human: { strength: 130 },
      },
      jobSpecies: { copper_miner: { human: 1 } },
    }));

    const before = engine.getState().resources.copper;
    engine.runTicks(10);
    const after = engine.getState().resources.copper;

    // Strength 130 gives +30% rate vs neutral stats (strength 100).
    // Base copper_miner rate is 0.3/tick, 10 ticks, 1 worker => 3.0 * 1.3 = 3.9
    expect(after - before).toBeCloseTo(3.9, 5);
  });

  it('tin_miner benefits from dexterity stat', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['tin_mine'],
      unlockedBuildings: ['tin_mine'],
      researchedTechs: ['mining'],
      workers: { tin_miner: 1 },
      species: {
        human: { dexterity: 150 },
      },
      jobSpecies: { tin_miner: { human: 1 } },
    }));

    const before = engine.getState().resources.tin;
    engine.runTicks(10);
    const after = engine.getState().resources.tin;

    // Dexterity 150 gives +50% rate. Base 0.15/tick => 1.5 * 1.5 = 2.25
    expect(after - before).toBeCloseTo(2.25, 5);
  });

  it('bronze_caster benefits from constitution stat', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['copper_kiln'],
      unlockedBuildings: ['copper_kiln'],
      researchedTechs: ['mining', 'bronze_alloy'],
      workers: { bronze_caster: 1 },
      species: {
        human: { constitution: 120 },
      },
      jobSpecies: { bronze_caster: { human: 1 } },
      resources: { copper: 100, tin: 100, bronze: 0 },
    }));

    const before = engine.getState().resources.bronze;
    engine.runTicks(10);
    const after = engine.getState().resources.bronze;

    // Constitution 120 => +20% rate. Base 0.25/tick => 2.5 * 1.2 = 3.0
    expect(after - before).toBeCloseTo(3.0, 5);
  });
});
