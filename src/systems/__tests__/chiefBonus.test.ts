import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

describe('chief research', () => {
  it('chief produces base research per tick, modified by stats', () => {
    const totalPop = 5;

    // Baseline: all 5 are farmers, no chief
    const baseline = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm'],
      workers: { farmer: totalPop },
    }));

    const baselineRates = baseline.getTickRates();
    // 5 humans * 0.02 natural research
    expect(baselineRates.research).toBeCloseTo(0.1, 4);

    // With chief: 4 farmers + 1 chief (neutral stats, so factor = 1)
    const withChief = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm', 'estate'],
      workers: { farmer: 4, chief: 1 },
    }));

    const chiefRates = withChief.getTickRates();
    // 5 * 0.02 species + 1 * 0.02 * 1.0 (neutral stats) = 0.12
    expect(chiefRates.research).toBeCloseTo(0.12, 4);

    // Also verify the actual tick
    baseline.runTicks(1);
    withChief.runTicks(1);

    const baselineAfter = baseline.getState().resources.research;
    const chiefAfter = withChief.getState().resources.research;

    expect(chiefAfter).toBeGreaterThan(baselineAfter);
  });

  it('chief research scales with wisdom (primary) and charisma (secondary)', () => {
    // Chief with high wisdom and charisma, 1 unemployed
    const withStatChief = new GameEngine(createTestWorld({
      population: 2,
      buildings: ['estate'],
      workers: { chief: 1 },
      species: { human: { wisdom: 150, charisma: 120 } },
    }));

    // Species base research: 2 * 0.02 = 0.04
    // Primary wisdom: 150/100 = 1.5, full weight
    // Secondary charisma: 120/100 = 1.2, half weight => 1 + (1.2-1)*0.5 = 1.1
    // Chief job: 0.02 * 1.5 * 1.1 = 0.033
    // Total: 0.04 + 0.033 = 0.073
    const rates = withStatChief.getTickRates();
    expect(rates.research).toBeCloseTo(0.073, 4);
  });

  it('chief job produces research on top of species base', () => {
    // 1 chief, 1 unemployed — total pop 2 but only chief has a job
    const chiefWorld = new GameEngine(createTestWorld({
      population: 2,
      buildings: ['estate'],
      workers: { chief: 1 },
    }));

    const rates = chiefWorld.getTickRates();
    // Species: 2 * 0.02 = 0.04
    // Chief job: 1 * 0.02 * 1.0 = 0.02
    // Total: 0.06
    expect(rates.research).toBeCloseTo(0.06, 4);
  });
});
