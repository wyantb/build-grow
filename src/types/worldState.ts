import { z } from 'zod';
import { DEFAULT_JOB_ORDER, JOBS } from '../data/jobs.js';
import { MARKET_RESOURCES } from '../data/market.js';
import { DEFAULT_SPECIES_ID, SPECIES, STARTING_SPECIES_IDS } from '../data/species.js';
import { GAME_VERSION } from '../systems/gameVersion.js';
import { RESOURCES } from '../data/resources.js';
import type { ResourceEnum } from '../data/resources.js';

/**
 * Build a Zod schema from the RESOURCES catalog.
 *
 * Every key in RESOURCES becomes a required number field, so adding a new
 * resource to the catalog automatically makes it part of the save format.
 */
type ResourceShape = { [K in ResourceEnum]: z.ZodNumber };

function buildResourceSchema(): z.ZodObject<ResourceShape> {
  const shape = {} as ResourceShape;
  for (const key of Object.keys(RESOURCES) as ResourceEnum[]) {
    shape[key] = z.number();
  }

  return z.object(shape);
}

export const ResourceSchema = buildResourceSchema();

// Re-export Resource from the catalog so callers use a single type.
export type { Resource, ResourceOptional } from '../data/resources.js';

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
  production: ResourceOptional, // per tick
  consumption: ResourceOptional, // per tick (e.g. food per worker)
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
 * decides how well they work, and how many of them there are.
 */
export const SpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  stats: StatsSchema,
  /**
   * How many of this species are in the world.
   *
   * The people working a job are counted in the job, so this counts the
   * whole species, employed or not.
   */
  count: z.number(),
});

export type Species = z.infer<typeof SpeciesSchema>;

/**
 * A rebirth the player has started but not confirmed.
 *
 * The rebirth throws the world away and starts a new one, so the player is
 * shown what changes before they commit to it: the stats each species has
 * now, and the stats it will have after.
 *
 * The player also chooses the composition of the next village: which races
 * make up the 5 lives, picked from the rebirth pool.
 */
export const PendingRebirthSchema = z.object({
  /** The stats each species has now, by species id. */
  before: z.record(z.string(), StatsSchema),
  /** The stats each species will have after the rebirth, by species id. */
  after: z.record(z.string(), StatsSchema),
  /**
   * The composition of the next village: how many lives are of each race.
   *
   * The player picks this from the rebirth pool before confirming.
   */
  composition: z.record(z.string(), z.number()),
});

export type PendingRebirth = z.infer<typeof PendingRebirthSchema>;

/**
 * The rebirth pool.
 *
 * Humans are always present at REBIRTH_LIVES per village; elves accumulate
 * one per completed gold rebirth.
 */
export const RebirthPoolSchema = z.object({
  /** How many humans the player may use in the next village. */
  human: z.number(),
  /** How many elves the player may use in the next village. */
  elf: z.number(),
});

export type RebirthPool = z.infer<typeof RebirthPoolSchema>;

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

/**
 * The city center — a virtual building that is always present.
 *
 * It grants housing and storage from the start, and can be upgraded through
 * rebirth and other mechanics. The values here are the current capacities,
 * not the base values; mechanics that improve the city center bump these
 * numbers directly.
 */
export const CityCenterSchema = z.object({
  /** How many people the city center can house. */
  housing: z.number(),
  /** Base storage capacity for wood and stone (wood and stone share this cap). */
  storageWoodStone: z.number(),
  /** Base storage capacity for food (before sheds and grain silos). */
  storageFood: z.number(),
  /** Base storage capacity for research. */
  storageResearch: z.number(),
  /** Base storage capacity for clay (revealed once clay making is researched). */
  storageClay: z.number(),
});

export type CityCenterState = z.infer<typeof CityCenterSchema>;

// Define the main world state schema
export const WorldStateSchema = z.object({
  version: z.string(),
  tick: z.number(),
  resources: ResourceSchema,
  population: z.number(),
  jobs: z.record(z.string(), JobSchema),
  /**
   * The jobs in priority order, top to bottom.
   *
   * The player sets this order in the Jobs panel. It is a list of every job
   * id, so the order stays complete even when a job is not on screen.
   */
  jobOrder: z.array(z.string()),
  buildings: z.record(z.string(), BuildingSchema),
  buildingCounts: z.record(z.string(), z.number()), // built count per building type
  /** The species living in the world, by species id. */
  species: z.record(z.string(), SpeciesSchema),
  unlockedBuildings: z.array(z.string()),
  unlockedJobs: z.array(z.string()),
  /** Technologies the player has researched. */
  researchedTechnologies: z.array(z.string()),
  gameTime: z.number(), // in seconds
  defaultJob: z.string(), // id of the job new workers go to
  market: MarketSchema,
  /**
   * The city center — a virtual building that is always present.
   *
   * It grants housing and storage from the start, and can be upgraded
   * through rebirth and other mechanics.
   */
  cityCenter: CityCenterSchema,
  /**
   * A rebirth the player has started but not confirmed.
   *
   * It is absent while no rebirth is pending. The player is taken out of the
   * village while it is there, so it has to be saved with the world.
   */
  pendingRebirth: PendingRebirthSchema.optional(),
  /**
   * The rebirth pool.
   *
   * Tracks what races are available for the next village. Starts at zero
   * elves and grows by one each time the player confirms a gold rebirth.
   */
  rebirthPool: RebirthPoolSchema,
});

export type WorldState = z.infer<typeof WorldStateSchema>;

// Create initial state
export const createInitialState = (): WorldState => {
  // The starting population, as the number of humans in the roster.
  const startingPopulation = 5;

  const initialState: WorldState = {
    version: GAME_VERSION,
    tick: 0,
    resources: {
      wood: 250,
      stone: 250,
      food: 500,
      gold: 0,
      research: 0,
      clay: 0,
      copper: 0,
      tin: 0,
      bronze: 0,
    },
    population: startingPopulation,
    jobs: Object.fromEntries(
      Object.entries(JOBS).map(([id, job]) => [id, { ...job, workers: 0, species: {} }]),
    ),
    jobOrder: [...DEFAULT_JOB_ORDER],
    buildings: {},
    buildingCounts: {},
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
        count: 0,
      }]),
    ),
    unlockedBuildings: ['hut', 'market', 'caravanserai', 'lumberjack', 'quarry', 'farm', 'shed'],
    unlockedJobs: ['settler'],
    researchedTechnologies: [],
    gameTime: 0,
    defaultJob: 'unemployed',
    market: {
      buys: {},
      sells: {},
    },
    /**
     * The city center — a virtual building that is always present.
     *
     * Initial values can be upgraded through rebirth and other mechanics.
     */
    cityCenter: {
      housing: 5,
      storageWoodStone: 750,
      storageFood: 500,
      storageResearch: 200,
      storageClay: 250,
    },
    rebirthPool: {
      human: 5,
      elf: 0,
    },
  };

  // The roster counts the whole population, which is all of one species
  // when a world starts.
  const startingSpecies = initialState.species[DEFAULT_SPECIES_ID];
  if (startingSpecies) {
    startingSpecies.count = startingPopulation;
  }

  // Population is derived from the species roster, so set it last.
  initialState.population = startingPopulation;

  // Put initial population in the default job
  const defaultJobRef = initialState.jobs[initialState.defaultJob];
  if (defaultJobRef) {
    defaultJobRef.workers = startingPopulation;
    defaultJobRef.species = { [DEFAULT_SPECIES_ID]: startingPopulation };
  }

  return initialState;
};
