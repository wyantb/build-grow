/**
 * Rebirth: choosing better genes for the population.
 *
 * A rebirth throws the world away and starts a new one, but the people who
 * carry it over are better than the ones before. Each member of the
 * population gets a chance to pass on better genes, and the best result
 * wins: a population of twenty has twenty chances at each stat, and the
 * best of those twenty is what the species ends up with.
 *
 * The roll is a normal distribution over the six core stats. Most people
 * pass on no improvement at all; a few pass on one point, fewer on two, and
 * a handful on three. Only better genes are ever chosen, so a stat never
 * goes down.
 *
 * Mana sensitivity is not a core stat. It is shown, but a gold rebirth
 * never raises it.
 *
 * Each species rolls independently: the rolls of one race do not help
 * another race. A village with 2 elves and 10 humans gives the elves 2
 * rolls per core stat and the humans 10.
 */

import type { Stats } from '../data/species.js';
import { STAT_NAMES } from '../data/species.js';

/**
 * The stats a rebirth can improve.
 *
 * These are the six core stats. Mana sensitivity is deliberately missing:
 * it is shown to the player, but a gold rebirth does not touch it.
 */
export const REBIRTH_STATS = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

export type RebirthStat = typeof REBIRTH_STATS[number];

/**
 * The chance that one person passes on a three point improvement.
 */
export const THREE_POINT_CHANCE = 0.005;

/**
 * The chance that one person passes on a two point improvement.
 */
export const TWO_POINT_CHANCE = 0.07;

/**
 * The chance that one person passes on a one point improvement.
 */
export const ONE_POINT_CHANCE = 0.175;

/**
 * The largest improvement a single person can pass on.
 */
export const MAX_STAT_INCREASE = 3;

/**
 * The chance that one person passes on no improvement at all.
 *
 * The three chances do not add up to one, so the rest of the people pass
 * on nothing.
 */
export const NO_CHANGE_CHANCE
  = 1 - THREE_POINT_CHANCE - TWO_POINT_CHANCE - ONE_POINT_CHANCE;

/**
 * The improvement one person passes on, from a roll.
 *
 * The roll is one number, read against the chances in order: the rarest
 * improvement first, so the chances do not have to be cumulative.
 */
export const rollStatIncrease = (random: () => number = Math.random): number => {
  const roll = random();

  if (roll < THREE_POINT_CHANCE) {
    return 3;
  }

  if (roll < THREE_POINT_CHANCE + TWO_POINT_CHANCE) {
    return 2;
  }

  if (roll < THREE_POINT_CHANCE + TWO_POINT_CHANCE + ONE_POINT_CHANCE) {
    return 1;
  }

  return 0;
};

/**
 * The improvement a population passes on for one stat.
 *
 * Every member of the population gets a roll, and the best roll wins. A
 * population of one is a single roll, so it usually ends up with nothing.
 */
export const getBestStatIncrease = (
  population: number,
  random: () => number = Math.random,
): number => {
  let best = 0;

  for (let i = 0; i < population; i++) {
    const increase = rollStatIncrease(random);

    if (increase > best) {
      best = increase;
    }
  }

  return best;
};

/**
 * The stats a species ends up with after a rebirth.
 *
 * Each core stat is rolled on its own, so the population can pass on a
 * better strength and a better wisdom without either of them costing the
 * other anything. Mana sensitivity is copied across untouched.
 */
export const getRebirthStats = (
  current: Stats,
  population: number,
  random: () => number = Math.random,
): Stats => {
  const next: Stats = { ...current };

  for (const stat of REBIRTH_STATS) {
    next[stat] = current[stat] + getBestStatIncrease(population, random);
  }

  return next;
};

/**
 * The stats each species would have after a rebirth, rolled independently.
 *
 * Each species rolls its own stat increases based on its own population.
 * A species with zero members does not roll and keeps its current stats.
 */
export const getRebirthStatsPerSpecies = (
  speciesStats: Record<string, Stats>,
  speciesCounts: Record<string, number>,
  random: () => number = Math.random,
): Record<string, Stats> => {
  const result: Record<string, Stats> = {};

  for (const [speciesId, stats] of Object.entries(speciesStats)) {
    const count = speciesCounts[speciesId] ?? 0;

    result[speciesId] = count > 0
      ? getRebirthStats(stats, count, random)
      : { ...stats };
  }

  return result;
};

/**
 * The stats a species would have after a rebirth, without changing them.
 *
 * The preview and the rebirth itself must roll the same way, so both use
 * this.
 */
export const getRebirthPreview = (
  current: Stats,
  population: number,
  random: () => number = Math.random,
): Stats => getRebirthStats(current, population, random);

/**
 * Pick a random species weighted by population count.
 *
 * With 1 elf and 4 humans, the chance of picking the elf is 1 / 5 = 20%.
 * Returns undefined when there is nobody or all counts are zero.
 */
export const pickBirthSpecies = (
  speciesCounts: Record<string, number>,
  random: () => number = Math.random,
): string | undefined => {
  const total = Object.values(speciesCounts).reduce((sum, c) => sum + c, 0);

  if (total <= 0) {
    return undefined;
  }

  const roll = random() * total;
  let cumulative = 0;

  for (const [speciesId, count] of Object.entries(speciesCounts)) {
    cumulative += count;

    if (roll < cumulative) {
      return speciesId;
    }
  }

  // Fall through for floating point edge cases.
  const ids = Object.keys(speciesCounts);

  return ids[ids.length - 1];
};

/**
 * The stats the player is shown, in the order they are listed.
 *
 * Mana sensitivity is included: it is shown even though a rebirth never
 * raises it.
 */
export const REBIRTH_DISPLAY_STATS = STAT_NAMES;
