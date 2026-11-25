import { z } from 'zod';
import { JOBS } from '../data/jobs.js';
import { MARKET_RESOURCES } from '../data/market.js';
import { SPECIES, STARTING_SPECIES_IDS } from '../data/species.js';
import { GAME_VERSION } from '../systems/gameVersion.js';

// Define the basic resource schema
export const ResourceSchema = z.object({
  wood: z.number(),
  stone: z.number(),
  food: z.number(),
  gold: z.number(),
});

export type Resource = z.infer<typeof ResourceSchema>;

/**
 * The stats a creature has.
 *
 * Every stat runs on the same scale, where 100 is the universal average: a
 * stat of 100 gives neither a bonus nor a malus, and every point away from
 * 100 is a percent away from the average in either direction.
 */
export const StatsSchema = z.object({
  strength: z.number(),
  dexterity: z.number(),
  constitution: z.number(),
  intelligence: z.number(),
  wisdom: z.number(),
  charisma: z.number(),
  manaSensitivity: z.number(),
});

export type Stats = z.infer<typeof StatsSchema>;

// Define the job schema
export const JobSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  workers: z.number(),
  capacity: z.number(), // 0 = uncapped
  canDefault: z.boolean(),
  production: ResourceSchema, // per tick
  consumption: ResourceSchema, // per tick (e.g. food per worker)
  /**
   * Who works this job, by species id.
   *
   * A job can be staffed by more than one species, so the counts add up to
   * the job's worker count.
   */
  species: z.record(z.string(), z.number()),
});

export type Job = z.infer<typeof JobSchema>;

// Define the building schema
export const BuildingSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cost: ResourceSchema,
});

export type Building = z.infer<typeof BuildingSchema>;

/**
 * A species living in the world.
 *
 * The roster holds the stats of the creatures that are here, which is what
 * decides how well they work.
 */
export const SpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stats: StatsSchema,
});

export type Species = z.infer<typeof SpeciesSchema>;

/**
 * Per-tick market orders.
 *
 * Gold is the medium of exchange and is never traded, so the allocation maps
 * only hold tradable resources.
 */
export const MarketSchema = z.object({
  /** Units bought per tick, by resource. */
  buys: z.partialRecord(z.enum(MARKET_RESOURCES), z.number()),
  /** Units sold per tick, by resource. */
  sells: z.partialRecord(z.enum(MARKET_RESOURCES), z.number()),
});

export type MarketState = z.infer<typeof MarketSchema>;

// Define the main world state schema
export const WorldStateSchema = z.object({
  version: z.string(),
  tick: z.number(),
  resources: ResourceSchema,
  population: z.number(),
  jobs: z.record(z.string(), JobSchema),
  buildings: z.record(z.string(), BuildingSchema),
  buildingCounts: z.record(z.string(), z.number()), // built count per building type
  /** The species living in the world, by species id. */
  species: z.record(z.string(), SpeciesSchema),
  unlockedBuildings: z.array(z.string()),
  unlockedJobs: z.array(z.string()),
  gameTime: z.number(), // in seconds
  defaultJob: z.string(), // id of the job new workers go to
  market: MarketSchema,
});

export type WorldState = z.infer<typeof WorldStateSchema>;

// Create initial state
export const createInitialState = (): WorldState => {
  const initialState: WorldState = {
    version: GAME_VERSION,
    tick: 0,
    resources: {
      wood: 250,
      stone: 250,
      food: 500,
      gold: 0,
    },
    population: 5,
    jobs: Object.fromEntries(
      Object.entries(JOBS).map(([id, job]) => [id, { ...job, workers: 0, species: {} }]),
    ),
    buildings: {
      // A new world starts with one hut, so the starting population has
      // somewhere to live. The hut is part of the world, not something the
      // player builds.
      'hut-0': {
        id: 'hut',
        name: 'Hut',
        description: 'Basic housing for your population.',
        cost: { wood: 0, stone: 0, food: 0, gold: 0 },
      },
    },
    buildingCounts: { hut: 1 },
    /**
     * The species in the world.
     *
     * A new world starts with humans, who are competent at most things and
     * hopeless with magic. The roster holds the stats of the creatures that
     * are here, so a species that arrives later brings its own stats.
     */
    species: Object.fromEntries(
      SPECIES.filter((species) => STARTING_SPECIES_IDS.includes(species.id)).map((species) => [species.id, {
        id: species.id,
        name: species.name,
        description: species.description,
        stats: { ...species.baseStats },
      }]),
    ),
    unlockedBuildings: ['hut', 'market', 'caravanserai', 'lumberjack', 'quarry', 'farm'],
    unlockedJobs: ['settler'],
    gameTime: 0,
    defaultJob: 'unemployed',
    market: {
      buys: {},
      sells: {},
    },
  };

  // Put initial population in the default job
  const defaultJobRef = initialState.jobs[initialState.defaultJob];
  if (defaultJobRef) {
    defaultJobRef.workers = initialState.population;
    defaultJobRef.species = { human: initialState.population };
  }

  return initialState;
};
