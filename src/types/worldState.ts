import { z } from 'zod';
import { JOBS } from '../data/jobs.js';

// Define the basic resource schema
export const ResourceSchema = z.object({
  wood: z.number(),
  stone: z.number(),
  food: z.number(),
  gold: z.number(),
});

export type Resource = z.infer<typeof ResourceSchema>;

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
});

export type Job = z.infer<typeof JobSchema>;

// Define the building schema
export const BuildingSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cost: ResourceSchema,
  buildTime: z.number(), // in ticks
  built: z.boolean(),
  constructionProgress: z.number(), // 0-100
});

export type Building = z.infer<typeof BuildingSchema>;

// Define species schema
export const SpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  baseStats: z.object({
    strength: z.number(),
    intelligence: z.number(),
    agility: z.number(),
    magic: z.number(),
  }),
  growthRate: z.number(),
  resourceConsumption: z.number(),
});

// Additional fantasy species
export const FantasySpeciesSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  baseStats: z.object({
    strength: z.number(),
    intelligence: z.number(),
    agility: z.number(),
    magic: z.number(),
  }),
  growthRate: z.number(),
  resourceConsumption: z.number(),
});

export type FantasySpecies = z.infer<typeof FantasySpeciesSchema>;

export type Species = z.infer<typeof SpeciesSchema>;

// Define the main world state schema
export const WorldStateSchema = z.object({
  version: z.string(),
  tick: z.number(),
  resources: ResourceSchema,
  population: z.number(),
  jobs: z.record(z.string(), JobSchema),
  buildings: z.record(z.string(), BuildingSchema),
  buildingCounts: z.record(z.string(), z.number()), // built count per building type
  species: SpeciesSchema,
  unlockedBuildings: z.array(z.string()),
  unlockedJobs: z.array(z.string()),
  gameTime: z.number(), // in seconds
  defaultJob: z.string(), // id of the job new workers go to
});

export type WorldState = z.infer<typeof WorldStateSchema>;

// Create initial state
export const createInitialState = (): WorldState => {
  const initialState: WorldState = {
    version: '1.0.0',
    tick: 0,
    resources: {
      wood: 250,
      stone: 250,
      food: 500,
      gold: 0,
    },
    population: 5,
    jobs: Object.fromEntries(
      Object.entries(JOBS).map(([id, job]) => [id, { ...job, workers: 0 }]),
    ),
    buildings: {},
    buildingCounts: {},
    species: {
      id: 'human',
      name: 'Human',
      description: 'Recently arrived from another universe through time travel and cloning technology',
      baseStats: {
        strength: 5,
        intelligence: 5,
        agility: 5,
        magic: 2,
      },
      growthRate: 1.0,
      resourceConsumption: 1.0,
    },
    unlockedBuildings: ['hut', 'market', 'lumberjack', 'quarry', 'farm', 'builder'],
    unlockedJobs: ['settler'],
    gameTime: 0,
    defaultJob: 'unemployed',
  };

  // Put initial population in the default job
  const defaultJobRef = initialState.jobs[initialState.defaultJob];
  if (defaultJobRef) {
    defaultJobRef.workers = initialState.population;
  }

  return initialState;
};
