import { describe, it, expect } from 'vitest';
import {
  DAYS_PER_SEASON,
  formatCalendarDate,
  getCalendarDate,
  SECONDS_PER_DAY,
  SEASONS_PER_YEAR,
} from '../calendar.js';

describe('the calendar', () => {
  it('starts on the first day of spring', () => {
    const date = getCalendarDate(0);

    expect(date.seasonName).toBe('Spring');
    expect(date.day).toBe(1);
    expect(date.year).toBe(1);
  });

  it('moves to the next day after a day is over', () => {
    const date = getCalendarDate(SECONDS_PER_DAY);

    expect(date.day).toBe(2);
    expect(date.seasonName).toBe('Spring');
  });

  it('moves to the next season after a season is over', () => {
    const date = getCalendarDate(SECONDS_PER_DAY * DAYS_PER_SEASON);

    expect(date.seasonName).toBe('Summer');
    expect(date.day).toBe(1);
  });

  it('runs through all four seasons', () => {
    const names = Array.from({ length: SEASONS_PER_YEAR }, (_, index) =>
      getCalendarDate(SECONDS_PER_DAY * DAYS_PER_SEASON * index).seasonName);

    expect(names).toEqual(['Spring', 'Summer', 'Autumn', 'Winter']);
  });

  it('starts a new year after the last season', () => {
    const date = getCalendarDate(SECONDS_PER_DAY * DAYS_PER_SEASON * SEASONS_PER_YEAR);

    expect(date.seasonName).toBe('Spring');
    expect(date.year).toBe(2);
  });

  it('formats the date for the header', () => {
    expect(formatCalendarDate(0)).toBe('Spring -- Day 1');
    expect(formatCalendarDate(SECONDS_PER_DAY * 4)).toBe('Spring -- Day 5');
  });

  it('counts a partial day as part of the day it is in', () => {
    expect(formatCalendarDate(SECONDS_PER_DAY * 2 + 30)).toBe('Spring -- Day 3');
  });
});
