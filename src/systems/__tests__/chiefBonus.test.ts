import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

describe('chief research bonus', () => {
  it('one chief doubles the natural research output', () => {
    const totalPop = 5;

    // Baseline: all 5 are farmers, no chief
    const baseline = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm'],
      workers: { farmer: totalPop },
    }));

    const baselineRates = baseline.getTickRates();
    expect(baselineRates.research).toBeCloseTo(0.1, 4); // 5 humans * 0.02

    // With chief: 4 farmers + 1 chief
    const withChief = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm', 'estate'],
      workers: { farmer: 4, chief: 1 },
    }));

    const chiefRates = withChief.getTickRates();
    // Natural: 5 * 0.02 = 0.1, Chief bonus: 0.1 * 1 chief = 0.1, Total: 0.2
    expect(chiefRates.research).toBeCloseTo(0.2, 4);

    // Also verify the actual tick applies the bonus
    baseline.runTicks(1);
    withChief.runTicks(1);

    const baselineAfter = baseline.getState().resources.research;
    const chiefAfter = withChief.getState().resources.research;

    expect(chiefAfter).toBeGreaterThan(baselineAfter);
    expect(chiefAfter).toBeCloseTo(baselineAfter * 2, 4);
  });

  it('two chiefs triples the natural research output', () => {
    const totalPop = 5;

    const withTwoChiefs = new GameEngine(createTestWorld({
      population: totalPop,
      buildings: ['farm', 'estate'],
      workers: { farmer: 3, chief: 2 },
    }));

    const rates = withTwoChiefs.getTickRates();
    // Natural: 5 * 0.02 = 0.1, Chief bonus: 0.1 * 2 = 0.2, Total: 0.3
    expect(rates.research).toBeCloseTo(0.3, 4);
  });
});
