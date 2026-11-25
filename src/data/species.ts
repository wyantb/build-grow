/**
 * Species and their stats.
 *
 * Every stat runs on the same scale, where 100 is the universal average: a
 * stat of 100 gives neither a bonus nor a malus, and every point away from
 * 100 is a percent away from the average in either direction.
 */

/** The stats a creature has. */
export interface Stats {
  /** Physical power. Lifting, cutting and carrying. */
  strength: number;
  /** Speed and precision. Moving fast and working accurately. */
  dexterity: number;
  /** Endurance and resilience. Hard work and resisting harm. */
  constitution: number;
  /** Learning and deduction. Understanding, planning and inventing. */
  intelligence: number;
  /** Insight and experience. Judgement, tradition and craft. */
  wisdom: number;
  /** Presence and persuasion. Leading, trading and rallying. */
  charisma: number;
  /** Affinity for magic. Handling mana and casting spells. */
  manaSensitivity: number;
}

/** The stat names, in the order they are listed to the player. */
export const STAT_NAMES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
  'manaSensitivity',
] as const;

export type StatName = typeof STAT_NAMES[number];

/**
 * The stat that counts for nothing.
 *
 * A stat of 100 is the average, so the effect of a stat on a job is
 * `stat / 100`.
 */
export const NEUTRAL_STAT = 100;

/** A species of creature. */
export interface SpeciesType {
  id: string;
  name: string;
  description: string;
  /** The stats a member of this species starts with. */
  baseStats: Stats;
}

/**
 * Stats that are the universal average.
 *
 * This is the status quo for the existing tests: a population where every
 * stat is 100 does exactly what it did before stats existed, because a stat
 * of 100 contributes a factor of 1.
 */
export const NEUTRAL_STATS: Stats = {
  strength: NEUTRAL_STAT,
  dexterity: NEUTRAL_STAT,
  constitution: NEUTRAL_STAT,
  intelligence: NEUTRAL_STAT,
  wisdom: NEUTRAL_STAT,
  charisma: NEUTRAL_STAT,
  manaSensitivity: NEUTRAL_STAT,
};

/**
 * The species in the world.
 *
 * Only humans exist so far. They are competent at most things and hopeless
 * with magic, which is what the starting population is made of.
 */
export const SPECIES: SpeciesType[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Recently arrived from another universe through time travel and cloning technology.',
    baseStats: {
      strength: 80,
      dexterity: 80,
      constitution: 80,
      intelligence: 80,
      wisdom: 80,
      charisma: 80,
      manaSensitivity: 5,
    },
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Long-lived and quick to learn, but frail and short of strength.',
    baseStats: {
      strength: 85,
      dexterity: 95,
      constitution: 70,
      intelligence: 110,
      wisdom: 105,
      charisma: 90,
      manaSensitivity: 85,
    },
  },
];

/**
 * The species a new world starts with.
 *
 * A species that arrives later is not in this list, so a new game never
 * starts with it.
 */
export const STARTING_SPECIES_IDS = ['human'];

const speciesById = new Map(SPECIES.map((species) => [species.id, species]));

/**
 * The species a new world starts with, and the one a worker belongs to
 * unless the player says otherwise.
 */
export const DEFAULT_SPECIES_ID = 'human';

export const getSpecies = (id: string): SpeciesType | undefined => speciesById.get(id);
