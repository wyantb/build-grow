import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../formatDateTime.js';

/**
 * The UTC offset the platform reports for `date`, as `GMT+hhmm`.
 *
 * The test computes this itself, so it does not depend on the timezone the
 * test machine happens to be in.
 */
const expectedOffset = (date: Date): string => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);

  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');

  return `GMT${sign}${hours}${minutes}`;
};

describe('formatDateTime', () => {
  it('ends with the UTC offset', () => {
    expect(formatDateTime('2026-11-25T14:28:12.151Z')).toMatch(/GMT[+-]\d{4}$/);
  });

  it('uses the offset of the platform for that moment', () => {
    const iso = '2026-11-25T14:28:12.151Z';
    const date = new Date(iso);

    expect(formatDateTime(iso)).toBe(`${date.toLocaleString()} ${expectedOffset(date)}`);
  });

  it('shows the local reading rather than the raw timestamp', () => {
    const label = formatDateTime('2026-11-25T14:28:12.151Z');

    expect(label).not.toContain('2026-11-25T14:28:12.151Z');
    expect(label).not.toContain('Z');
  });

  it('pads a whole-hour offset to four digits', () => {
    // A whole-hour zone has no minutes, so they must still be written.
    expect(formatDateTime('2026-11-25T14:28:12.151Z')).toMatch(/GMT[+-]\d{2}00$/);
  });

  it('keeps a timestamp that cannot be parsed', () => {
    expect(formatDateTime('not a date')).toBe('not a date');
  });
});
