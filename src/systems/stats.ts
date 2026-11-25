/**
 * How a creature's stats change what it produces.
 *
 * A job has a primary stat and a secondary stat. The primary stat counts
 * fully and the secondary stat counts half, and the two effects multiply:
 * a lumberjack with 80 strength and 90 intelligence cuts wood at
 * `0.8 x 0.95` of the base rate.
 *
 * A stat of 100 is the universal average, so it contributes a factor of 1
 * and neither helps nor hinders.
 */

import type { StatName, Stats } from '../data/species.js';
import { NEUTRAL_STAT, NEUTRAL_STATS } from '../data/species.js';

/** The stats a job leans on. */
export interface JobStats {
  /** The stat that counts fully. */
  primary?: StatName;
  /** The stat that counts half. */
  secondary?: StatName;
}

/**
 * How much of a stat's effect a job takes.
 *
 * The primary stat counts in full, the secondary stat counts half.
 */
export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.5;

/**
 * The factor a stat contributes to a job.
 *
 * A stat of 100 is the average and contributes 1. A stat of 80 is a 20%
 * malus and contributes 0.8; a stat of 130 is a 30% bonus and contributes
 * 1.3.
 */
export const getStatFactor = (stat: number): number => stat / NEUTRAL_STAT;

/**
 * The factor a stat contributes to a job, at a given weight.
 *
 * The weight decides how much of the stat's departure from the average
 * counts. A stat of 90 is a 10% malus: at full weight it contributes 0.9,
 * and at half weight the malus is halved, so it contributes 0.95.
 */
export const getWeightedStatFactor = (stat: number, weight: number): number =>
  1 + (getStatFactor(stat) - 1) * weight;

/**
 * The factor a job's stats give it, for one set of stats.
 *
 * The primary and the secondary stat multiply together, so a job with a
 * 20% malus and a 5% malus works at `0.8 x 0.95` of the base rate.
 *
 * A job with no stats of its own is neither helped nor hindered.
 */
export const getJobFactor = (jobStats: JobStats, stats: Stats): number => {
  let factor = 1;

  if (jobStats.primary) {
    factor *= getWeightedStatFactor(stats[jobStats.primary], PRIMARY_WEIGHT);
  }

  if (jobStats.secondary) {
    factor *= getWeightedStatFactor(stats[jobStats.secondary], SECONDARY_WEIGHT);
  }

  return factor;
};

/**
 * The average stats of the creatures working a job.
 *
 * A job can be staffed by more than one species, so the stats of each
 * species are averaged over the people it provides. Every person counts
 * the same, so a job with one elf and one human has the average of the two.
 */
export const getAverageStats = (
  staffing: Record<string, number>,
  statsOf: (speciesId: string) => Stats,
): Stats => {
  const average: Stats = {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
    manaSensitivity: 0,
  };

  const names = Object.keys(average) as (keyof Stats)[];
  let people = 0;

  for (const [speciesId, count] of Object.entries(staffing)) {
    if (count <= 0) {
      continue;
    }

    const stats = statsOf(speciesId);

    people += count;

    for (const name of names) {
      average[name] += stats[name] * count;
    }
  }

  if (people <= 0) {
    // Nobody is recorded as working the job, so it has no stats to go on.
    // The average is neutral, which leaves the job's rate untouched.
    return { ...NEUTRAL_STATS };
  }

  for (const name of names) {
    average[name] /= people;
  }

  return average;
};
