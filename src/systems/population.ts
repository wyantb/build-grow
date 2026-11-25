/**
 * Population and housing.
 *
 * Huts house people, and people grow when there is somewhere to live. The
 * growth rule is a geometric trial: every so often the world rolls against
 * the chance of a birth, and a birth adds one person.
 *
 * The chance of a birth grows in steps with the size of the population. A
 * larger civilization reproduces faster, but not in proportion to its size:
 * each step of 40 people adds the same 1%, so doubling the population never
 * doubles the birth rate.
 */

import { TICKS_PER_SECOND } from './ticks.js';

/** How many people one hut houses. */
export const POPULATION_PER_HUT = 5;

/** How often the world rolls for a birth, in ticks. */
export const GROWTH_INTERVAL_TICKS = 25;

/**
 * The chance of a birth at the smallest populations, per growth interval.
 *
 * With a roll every 5 seconds and a mean wait of 20 seconds, the chance is
 * one in four.
 */
export const MIN_BIRTH_CHANCE = 0.25;

/**
 * How many people share one step of the birth rate.
 *
 * Every population this size adds one step to the birth rate.
 */
export const POPULATION_PER_BONUS = 40;

/**
 * What one step of the birth rate adds.
 *
 * The chance of a birth is `MIN_BIRTH_CHANCE + BIRTH_CHANCE_BONUS *
 * floor(population / POPULATION_PER_BONUS)`.
 */
export const BIRTH_CHANCE_BONUS = 0.01;

/**
 * The highest chance of a birth.
 *
 * The population can never grow faster than one person per interval.
 */
export const MAX_BIRTH_CHANCE = 1;

/** The seconds one growth interval lasts. */
export const GROWTH_INTERVAL_SECONDS = GROWTH_INTERVAL_TICKS / TICKS_PER_SECOND;

/**
 * The people the huts can hold.
 *
 * Every hut counts, because a building is finished the moment it is paid
 * for.
 */
export const getPopulationCapacity = (hutCount: number): number =>
  hutCount * POPULATION_PER_HUT;

/**
 * The chance of a birth in one growth interval, for a given population.
 *
 * The rate is flat at the minimum until the population reaches a step, then
 * it rises by one bonus at a time. The chance is capped, so the population
 * can never grow faster than one person per interval.
 */
export const getBirthChance = (population: number): number => {
  if (population <= 0) {
    return 0;
  }

  const steps = Math.floor(population / POPULATION_PER_BONUS);
  const chance = MIN_BIRTH_CHANCE + steps * BIRTH_CHANCE_BONUS;

  return Math.min(MAX_BIRTH_CHANCE, chance);
};

/**
 * The mean wait for a birth, in seconds, for a given population.
 *
 * The wait follows a geometric distribution, so the mean is one over the
 * chance. The population grows a little faster than this suggests, because
 * each new person raises the chance for the next one.
 */
export const getMeanGrowthSeconds = (population: number): number => {
  const chance = getBirthChance(population);

  if (chance <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return GROWTH_INTERVAL_SECONDS / chance;
};
