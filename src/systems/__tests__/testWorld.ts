import { createInitialState } from '../../types/worldState.js';
import type { Building, Resource, Stats, WorldState } from '../../types/worldState.js';
import type { MarketResource } from '../../data/market.js';
import { DEFAULT_SPECIES_ID, NEUTRAL_STATS, SPECIES } from '../../data/species.js';
import { normalizeJobOrder } from '../../data/jobs.js';

export interface WorldOverrides {
  population?: number;
  resources?: Partial<Resource>;
  /** Workers per job id. Jobs not listed start empty. */
  workers?: Record<string, number>;
  /** Completed buildings, by building type id. */
  buildings?: string[];
  /** Building types the player has unlocked. */
  unlockedBuildings?: string[];
  /** Per-tick market buy orders, by resource. */
  marketBuys?: Partial<Record<MarketResource, number>>;
  /** Per-tick market sell orders, by resource. */
  marketSells?: Partial<Record<MarketResource, number>>;
  /**
   * The stats of the species in the world, by species id.
   *
   * A test world starts with the status quo: humans whose stats are all
   * the universal average, so a job's rate is exactly what it was before
   * stats existed.
   */
  species?: Record<string, Partial<Stats>>;
  /**
   * Who works each job, by job id and then by species id.
   *
   * Without this, every worker of a job is of the default species.
   */
  jobSpecies?: Record<string, Record<string, number>>;
  /**
   * The jobs in priority order, top to bottom.
   *
   * Without this, the jobs are in the order the catalog holds them.
   */
  jobOrder?: string[];
  /**
   * Technologies that have been researched.
   *
   * Without this, the world starts with no technologies.
   */
  researchedTechs?: string[];
}

const zeroResource = (): Resource => ({ wood: 0, stone: 0, food: 0, gold: 0, research: 0, clay: 0, copper: 0, tin: 0, bronze: 0, paper: 0 });

/**
 * Build a world state for tests.
 *
 * The engine only accepts a state through its constructor, so tests
 * assemble one here instead of mutating the engine after construction.
 */
export function createTestWorld(overrides: WorldOverrides = {}): WorldState {
  const state = createInitialState();

  state.population = overrides.population ?? state.population;

  if (overrides.jobOrder) {
    state.jobOrder = normalizeJobOrder(overrides.jobOrder);
  }

  if (overrides.resources) {
    state.resources = { ...state.resources, ...overrides.resources };
  }

  if (overrides.researchedTechs) {
    state.researchedTechnologies = [...overrides.researchedTechs];
  }

  for (const job of Object.values(state.jobs)) {
    job.workers = 0;
    job.species = {};
  }

  // A new game starts with a hut, but a test world starts with only the
  // buildings it asks for, so the listed ones are the whole set.
  state.buildings = {};
  state.buildingCounts = {};

  for (const [jobId, workers] of Object.entries(overrides.workers ?? {})) {
    const job = state.jobs[jobId];
    if (!job) {
      throw new Error(`Unknown job id: ${jobId}`);
    }
    job.workers = workers;
  }

  // The status quo: humans whose stats are all the universal average. A job
  // then works at exactly the rate the job table says, which is what the
  // tests that predate stats expect.
  for (const entry of Object.values(state.species)) {
    entry.stats = { ...NEUTRAL_STATS };
  }

  // A test world holds every species in the catalog, so a test can staff a
  // job with any of them.
  for (const species of SPECIES) {
    state.species[species.id] = {
      id: species.id,
      name: species.name,
      description: species.description,
      stats: { ...NEUTRAL_STATS },
      count: 0,
    };
  }

  for (const [speciesId, stats] of Object.entries(overrides.species ?? {})) {
    const entry = state.species[speciesId];
    if (!entry) {
      throw new Error(`Unknown species id: ${speciesId}`);
    }
    entry.stats = { ...NEUTRAL_STATS, ...stats };
  }

  // Every worker of a job is of the default species, unless the test says
  // who works it.
  for (const [jobId, job] of Object.entries(state.jobs)) {
    if (job.workers <= 0) {
      continue;
    }

    const staffing = overrides.jobSpecies?.[jobId];

    if (staffing) {
      job.species = { ...staffing };

      continue;
    }

    job.species = { [DEFAULT_SPECIES_ID]: job.workers };
  }

  // The roster counts the whole population. The people in a job are
  // counted there; the rest have not found work yet and are of the
  // default species.
  for (const entry of Object.values(state.species)) {
    entry.count = 0;
  }

  for (const job of Object.values(state.jobs)) {
    for (const [speciesId, count] of Object.entries(job.species)) {
      const entry = state.species[speciesId];

      if (entry) {
        entry.count += count;
      }
    }
  }

  const working = Object.values(state.species)
    .reduce((sum, entry) => sum + entry.count, 0);
  const withoutWork = Math.max(0, state.population - working);

  if (withoutWork > 0) {
    const defaultSpecies = state.species[DEFAULT_SPECIES_ID];

    if (defaultSpecies) {
      defaultSpecies.count += withoutWork;
    }
  }

  // Each building of a type needs its own instance key, the same way the
  // engine numbers them. Two huts are `hut-0` and `hut-1`, not `hut-0` twice.
  const instanceCounters: Record<string, number> = {};

  for (const buildingId of overrides.buildings ?? []) {
    const index = instanceCounters[buildingId] ?? 0;

    instanceCounters[buildingId] = index + 1;

    const key = `${buildingId}-${index}`;
    const building: Building = {
      id: buildingId,
      name: buildingId,
      description: `${buildingId} test building`,
      cost: zeroResource(),
    };
    state.buildings[key] = building;
    state.buildingCounts[buildingId] = (state.buildingCounts[buildingId] ?? 0) + 1;
  }

  if (overrides.unlockedBuildings) {
    state.unlockedBuildings = [...overrides.unlockedBuildings];
  }

  if (overrides.marketBuys) {
    state.market.buys = { ...overrides.marketBuys };
  }

  if (overrides.marketSells) {
    state.market.sells = { ...overrides.marketSells };
  }

  return state;
}
