import { describe, expect, it } from 'vitest';
import { timeToIncome, timeToAvailable, formatTime } from '../formatTimeToAfford.js';
import type { Resource } from '../../types/worldState.js';

const zeroRates: Resource = { wood: 0, stone: 0, food: 0, gold: 0, research: 0 };

describe('timeToIncome', () => {
  it('returns undefined when the cost is zero', () => {
    expect(timeToIncome({ wood: 0, stone: 0, food: 0, gold: 0, research: 0 }, zeroRates)).toBeUndefined();
  });

  it('returns total cost divided by rate for a single resource', () => {
    const cost: Resource = { wood: 100, stone: 0, food: 0, gold: 0, research: 0 };
    const rates: Resource = { wood: 5, stone: 0, food: 0, gold: 0, research: 0 };

    expect(timeToIncome(cost, rates)).toBe(20);
  });

  it('returns the slowest resource when multiple are needed', () => {
    // wood: 100 / 10 = 10s, stone: 200 / 5 = 40s → slowest = 40s
    const cost: Resource = { wood: 100, stone: 200, food: 0, gold: 0, research: 0 };
    const rates: Resource = { wood: 10, stone: 5, food: 0, gold: 0, research: 0 };

    expect(timeToIncome(cost, rates)).toBe(40);
  });

  it('returns Infinity when a needed resource is not produced', () => {
    const cost: Resource = { wood: 100, stone: 50, food: 0, gold: 0, research: 0 };
    const rates: Resource = { wood: 10, stone: 0, food: 0, gold: 0, research: 0 };

    expect(timeToIncome(cost, rates)).toBe(Infinity);
  });

  it('ignores player resources (income-only calculation)', () => {
    const cost: Resource = { wood: 100, stone: 0, food: 0, gold: 0, research: 0 };
    const rates: Resource = { wood: 5, stone: 0, food: 0, gold: 0, research: 0 };

    // Even though player has 100 wood, income calculation ignores it.
    expect(timeToIncome(cost, rates)).toBe(20);
  });
});

describe('timeToAvailable', () => {
  it('returns undefined when the player already has enough', () => {
    const cost: Resource = { wood: 50, stone: 0, food: 0, gold: 0, research: 0 };
    const resources: Resource = { wood: 100, stone: 0, food: 0, gold: 0, research: 0 };

    expect(timeToAvailable(cost, zeroRates, resources)).toBeUndefined();
  });

  it('returns deficit divided by rate for a single resource', () => {
    const cost: Resource = { wood: 100, stone: 0, food: 0, gold: 0, research: 0 };
    const resources: Resource = { wood: 40, stone: 0, food: 0, gold: 0, research: 0 };
    const rates: Resource = { wood: 5, stone: 0, food: 0, gold: 0, research: 0 };

    expect(timeToAvailable(cost, rates, resources)).toBe(12); // deficit 60 / 5
  });

  it('returns Infinity when deficit exists and rate is zero', () => {
    const cost: Resource = { wood: 100, stone: 0, food: 0, gold: 0, research: 0 };
    const resources: Resource = { wood: 40, stone: 0, food: 0, gold: 0, research: 0 };

    expect(timeToAvailable(cost, zeroRates, resources)).toBe(Infinity);
  });

  it('skips resources already in stock and returns slowest deficit', () => {
    // Need 100 wood (have 100 → skip), need 200 stone (have 50, deficit 150, rate 5 → 30s)
    const cost: Resource = { wood: 100, stone: 200, food: 0, gold: 0, research: 0 };
    const resources: Resource = { wood: 100, stone: 50, food: 0, gold: 0, research: 0 };
    const rates: Resource = { wood: 0, stone: 5, food: 0, gold: 0, research: 0 };

    expect(timeToAvailable(cost, rates, resources)).toBe(30);
  });
});

describe('formatTime', () => {
  it('says "now" for zero or negative', () => {
    expect(formatTime(0)).toBe('now');
    expect(formatTime(-5)).toBe('now');
  });

  it('says "never" for Infinity', () => {
    expect(formatTime(Infinity)).toBe('never');
  });

  it('rounds up whole seconds below 60', () => {
    expect(formatTime(1)).toBe('1s');
    expect(formatTime(5.1)).toBe('6s');
    expect(formatTime(59)).toBe('59s');
  });

  it('shows minutes with one decimal for 60–3600s', () => {
    expect(formatTime(60)).toBe('1.0 min');
    expect(formatTime(90)).toBe('1.5 min');
    expect(formatTime(3599)).toBe('60.0 min');
  });

  it('shows hours with one decimal for 3600–86400s', () => {
    expect(formatTime(3600)).toBe('1.0 h');
    expect(formatTime(8640)).toBe('2.4 h');
    expect(formatTime(86400)).toBe('24.0 h');
  });

  it('caps at 24+ h above 86400s', () => {
    expect(formatTime(86401)).toBe('24+ h');
  });
});
