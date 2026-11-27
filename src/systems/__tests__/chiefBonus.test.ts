import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

describe('chief research', () => {
  it('one chief doubles total natural research', () => {
    const totalPop = 5;

    // Baseline: all 5 are farmers, no chief
    const baseline = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm'],
      workers: { farmer: totalPop },
    }));

    const baselineRates = baseline.getTickRates();
    // 5 humans * 0.02 = 0.1
    expect(baselineRates.research).toBeCloseTo(0.1, 4);

    // With chief: 4 farmers + 1 chief (neutral stats, factor = 1)
    const withChief = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm', 'estate'],
      workers: { farmer: 4, chief: 1 },
    }));

    const chiefRates = withChief.getTickRates();
    // Natural: 5 * 0.02 = 0.1, Chief bonus: 0.1 * 1 * 1.0 = 0.1, Total: 0.2
    expect(chiefRates.research).toBeCloseTo(0.2, 4);

    // Verify tick() applies the same bonus
    baseline.runTicks(1);
    withChief.runTicks(1);

    const baselineAfter = baseline.getState().resources.research;
    const chiefAfter = withChief.getState().resources.research;

    expect(chiefAfter).toBeCloseTo(baselineAfter * 2, 4);
  });

  it('two chiefs triples total natural research', () => {
    const totalPop = 5;

    const withTwoChiefs = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm', 'estate'],
      workers: { farmer: 3, chief: 2 },
    }));

    const rates = withTwoChiefs.getTickRates();
    // Natural: 5 * 0.02 = 0.1, Chief bonus: 0.1 * 2 * 1.0 = 0.2, Total: 0.3
    expect(rates.research).toBeCloseTo(0.3, 4);
  });

  it('chief research scales with wisdom (primary) and charisma (secondary)', () => {
    const totalPop = 5;

    // 4 farmers + 1 chief with high stats
    const withStatChief = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm', 'estate'],
      workers: { farmer: 4, chief: 1 },
      species: { human: { wisdom: 150, charisma: 120 } },
    }));

    const rates = withStatChief.getTickRates();
    // Natural: 5 * 0.02 = 0.1
    // Chief factor: wisdom 150/100=1.5 (full) * charisma 120/100=1.2 (half weight => 1+(0.2)*0.5=1.1)
    // = 1.5 * 1.1 = 1.65
    // Chief bonus: 0.1 * 1 * 1.65 = 0.165
    // Total: 0.1 + 0.165 = 0.265
    expect(rates.research).toBeCloseTo(0.265, 4);
  });
});
