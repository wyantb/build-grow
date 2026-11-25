/**
 * Population and housing.
 *
 * Huts house people, and people grow when there is somewhere to live. The
 * growth rule is a geometric trial: every so often the world rolls against
 * the chance of a birth, and a birth adds one person.
 *
 * The chance of a birth grows with the size of the population, on a
 * logarithmic curve. A larger civilization reproduces faster, but not in
 * proportion to its size: the curve flattens out, so doubling the
 * population does not double the birth rate.
 */

import { TICKS_PER_SECOND } from './ticks.js';

/** How many people one hut houses. */
export const POPULATION_PER_HUT = 5;

/** How often the world rolls for a birth, in ticks. */
export const GROWTH_INTERVAL_TICKS = 25;

/**
 * The chance of a birth at the starting population, per growth interval.
 *
 * With a roll every 5 seconds and a mean wait of 20 seconds, the chance is
 * one in four.
 */
export const BASE_GROWTH_CHANCE = 0.25;

/**
 * The population the base chance applies to.
 *
 * The growth curve is measured from here, so the starting population gets
 * exactly the base chance.
 */
export const BASE_POPULATION = 5;

/**
 * How fast the growth rate climbs with the population.
 *
 * The chance of a birth is `BASE_GROWTH_CHANCE * (1 + GROWTH_SCALE *
 * ln(population / BASE_POPULATION))`, so this is the share of the base chance
 * that each factor of e adds to the birth rate.
 */
export const GROWTH_SCALE = 0.5;

/** The seconds one growth interval lasts. */
export const GROWTH_INTERVAL_SECONDS = GROWTH_INTERVAL_TICKS / TICKS_PER_SECOND;

/**
 * The people the huts can hold.
 *
 * Only finished huts count. A hut under construction houses nobody.
 */
export const getPopulationCapacity = (hutCount: number): number =>
  hutCount * POPULATION_PER_HUT;

/**
 * The chance of a birth in one growth interval, for a given population.
 *
 * The curve is logarithmic, so the birth rate rises with the population but
 * ever more slowly. The chance is capped at 1, so the population can never
 * grow faster than one person per interval.
 */
export const getBirthChance = (population: number): number => {
  if (population <= 0) {
    return 0;
  }

  const growth = 1 + GROWTH_SCALE * Math.log(population / BASE_POPULATION);
  const chance = BASE_GROWTH_CHANCE * Math.max(0, growth);

  return Math.min(1, chance);
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
