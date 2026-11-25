import { describe, expect, it } from 'vitest';
import { formatExact, formatNumber } from '../formatNumber.js';

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

describe('formatExact', () => {
  it('keeps a whole number whole', () => {
    expect(formatExact(250, 'en-US')).toBe('250');
    expect(formatExact(0, 'en-US')).toBe('0');
  });

  it('rounds to at most two decimals', () => {
    expect(formatExact(4167.456, 'en-US')).toBe('4,167.46');
    expect(formatExact(4167.454, 'en-US')).toBe('4,167.45');
    expect(formatExact(4.167456, 'en-US')).toBe('4.17');
  });

  it('drops trailing zeros', () => {
    expect(formatExact(5, 'en-US')).toBe('5');
    expect(formatExact(5.1, 'en-US')).toBe('5.1');
    expect(formatExact(5.00, 'en-US')).toBe('5');
  });

  it('inserts grouping separators', () => {
    expect(formatExact(4167, 'en-US')).toBe('4,167');
    expect(formatExact(1234567, 'en-US')).toBe('1,234,567');
  });

  it('keeps the sign on a negative number', () => {
    expect(formatExact(-12.345, 'en-US')).toBe('-12.35');
    expect(formatExact(-4167, 'en-US')).toBe('-4,167');
  });

  it('does not drift on a value that accumulated in floating point', () => {
    expect(formatExact(3.750000000000006, 'en-US')).toBe('3.75');
    expect(formatExact(0.1 + 0.2, 'en-US')).toBe('0.3');
  });

  it('follows the locale it is given', () => {
    expect(formatExact(4167.456, 'de-DE')).toBe('4.167,46');
    expect(formatExact(4167.456, 'en-US')).toBe('4,167.46');
  });

  it('shows a very large number in full rather than shortening it', () => {
    expect(formatExact(1e9, 'en-US')).toBe('1,000,000,000');
  });
});
