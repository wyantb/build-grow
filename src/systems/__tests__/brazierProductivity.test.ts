import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

describe('the brazier productivity chain', () => {
  it('a brazier boosts a job with bronze tools', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['brazier', 'copper_mine'],
      unlockedBuildings: ['brazier', 'copper_mine'],
      researchedTechs: ['bronze_pick', 'mining'],
      workers: { copper_miner: 1 },
    }));

    const rates = engine.getTickRates();
    // Without brazier: 0.3 copper/tick. With 1 brazier: 10% boost → 0.3 * 1.10 = 0.33
    expect(rates.copper).toBeCloseTo(0.33, 5);
  });

  it('two braziers give a larger boost', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['brazier', 'brazier', 'copper_mine'],
      unlockedBuildings: ['brazier', 'copper_mine'],
      researchedTechs: ['bronze_pick', 'mining'],
      workers: { copper_miner: 1 },
    }));

    const rates = engine.getTickRates();
    // With 2 braziers: 20% boost → 0.3 * 1.20 = 0.36
    expect(rates.copper).toBeCloseTo(0.36, 5);
  });

  it('braziers do not boost jobs without bronze tools tech', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['brazier', 'copper_mine'],
      unlockedBuildings: ['brazier', 'copper_mine'],
      researchedTechs: ['mining'],
      workers: { copper_miner: 1 },
    }));

    const rates = engine.getTickRates();
    // No bronze_pick tech → no boost
    expect(rates.copper).toBeCloseTo(0.3, 5);
  });

  it('braziers consume bronze per tick', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['brazier'],
      unlockedBuildings: ['brazier'],
      researchedTechs: ['bronze_pick'],
      resources: { bronze: 10 },
    }));

    const rates = engine.getTickRates();
    // Each brazier burns BRAZIER_BRONZE_PER_TICK of bronze
    expect(rates.bronze).toBeLessThan(0);
  });

  it('brazier boost stacks with stat bonuses', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['brazier', 'copper_mine'],
      unlockedBuildings: ['brazier', 'copper_mine'],
      researchedTechs: ['bronze_pick', 'mining'],
      workers: { copper_miner: 1 },
      species: {
        human: { strength: 130 },
      },
      jobSpecies: { copper_miner: { human: 1 } },
    }));

    const rates = engine.getTickRates();
    // 0.3 base * 1.3 strength * 1.1 brazier = 0.429
    expect(rates.copper).toBeCloseTo(0.429, 5);
  });
});
