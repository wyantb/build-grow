import { describe, expect, it } from 'vitest';
import { formatNumber } from '../formatNumber.js';

describe('formatNumber', () => {
  it('formats zero as 0.00', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('formats very small positive numbers as 0.00', () => {
    expect(formatNumber(0.00001)).toBe('0.00');
    expect(formatNumber(1e-10)).toBe('0.00');
  });

  it('formats very small negative numbers as 0.00', () => {
    expect(formatNumber(-0.00001)).toBe('0.00');
    expect(formatNumber(-1e-10)).toBe('0.00');
  });

  it('formats small numbers with scientific notation', () => {
    expect(formatNumber(0.001)).toBe('1.00e-3');
    expect(formatNumber(-0.005)).toBe('-5.00e-3');
  });

  it('formats regular numbers with appropriate decimals', () => {
    expect(formatNumber(5)).toBe('5.00');
    expect(formatNumber(15)).toBe('15.0');
    expect(formatNumber(150)).toBe('150');
  });

  it('formats large numbers with K suffix', () => {
    expect(formatNumber(1500)).toBe('1.50K');
    expect(formatNumber(999999)).toBe('1000.00K');
  });

  it('formats very large numbers with M suffix', () => {
    expect(formatNumber(1500000)).toBe('1.50M');
    expect(formatNumber(1e9)).toBe('1000.00M');
  });
});
