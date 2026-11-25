/**
 * The calendar.
 *
 * The world runs on a simple clock: a day is a fixed number of seconds, a
 * season is a fixed number of days, and a year is four seasons. These are
 * default world parameters rather than a game mechanic, but the header shows
 * them so the player has a sense of how long they have been playing.
 */

/** How many seconds one day lasts. */
export const SECONDS_PER_DAY = 60;

/** How many days one season lasts. */
export const DAYS_PER_SEASON = 30;

/** How many seasons one year lasts. */
export const SEASONS_PER_YEAR = 4;

/** The names of the seasons, in order. */
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

export interface CalendarDate {
  /** The season of the year, starting at zero. */
  season: number;
  /** The name of the season. */
  seasonName: string;
  /** The day of the season, starting at one. */
  day: number;
  /** The year, starting at one. */
  year: number;
}

/**
 * Work out the date from the elapsed game time.
 */
export const getCalendarDate = (gameTime: number): CalendarDate => {
  const totalDays = Math.floor(gameTime / SECONDS_PER_DAY);
  const year = Math.floor(totalDays / (DAYS_PER_SEASON * SEASONS_PER_YEAR)) + 1;
  const dayOfYear = totalDays % (DAYS_PER_SEASON * SEASONS_PER_YEAR);
  const season = Math.floor(dayOfYear / DAYS_PER_SEASON);
  const day = (dayOfYear % DAYS_PER_SEASON) + 1;

  return {
    season,
    seasonName: SEASON_NAMES[season] ?? SEASON_NAMES[0],
    day,
    year,
  };
};

/**
 * The date as a short label, such as "Spring -- Day 4".
 */
export const formatCalendarDate = (gameTime: number): string => {
  const date = getCalendarDate(gameTime);

  return `${date.seasonName} -- Day ${date.day}`;
};
