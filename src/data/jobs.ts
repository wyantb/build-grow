import type { Job, Resource } from '../types/worldState.js';
import type { JobStats } from '../systems/stats.js';

// Per-tick production rates (engine runs at 5 ticks/sec)
// Settler: 0.2 food/s → 0.04/tick
// Lumberjack: 5 wood/s → 1.0/tick
// Quarrier: 4 stone/s → 0.8/tick

const ZERO: Resource = { wood: 0, stone: 0, food: 0, gold: 0 };
const DEFAULT_CONSUMPTION = { wood: 0, stone: 0, food: 0.025, gold: 0 };

/**
 * The stats each job leans on.
 *
 * The primary stat counts fully and the secondary stat counts half, so a
 * job's rate is the base rate times both factors. A job that is missing
 * here is neither helped nor hindered by any stat.
 */
export const JOB_STATS: Record<string, JobStats> = {
  lumberjack: { primary: 'strength', secondary: 'intelligence' },
  quarrier: { primary: 'strength', secondary: 'constitution' },
  farmer: { primary: 'constitution', secondary: 'wisdom' },
  settler: { primary: 'intelligence', secondary: 'charisma' },
};

export const JOBS: Record<string, Omit<Job, 'workers' | 'species'>> = {
  unemployed: {
    id: 'unemployed',
    name: 'Unemployed',
    description: 'Workers with no role yet. From harvesting, they\'ll just manage to feed themselves.',
    capacity: 0, // uncapped
    canDefault: true,
    production: { wood: 0, stone: 0, food: 0.025, gold: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  settler: {
    id: 'settler',
    name: 'Settler',
    description: 'Generalist workers who gather basic resources. Outcompeted by specialized roles.',
    capacity: 0, // uncapped
    canDefault: true,
    // Per tick (5 ticks/sec): 0.5/5=0.1 wood, 0.2/5=0.04 stone, 0.1/5=0.02 food
    production: { wood: 0.1, stone: 0.04, food: 0.01, gold: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  lumberjack: {
    id: 'lumberjack',
    name: 'Lumberjack',
    description: 'Cuts wood from nearby forests.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    // 5 wood/s → 1.0/tick
    production: { wood: 1.0, stone: 0, food: 0, gold: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  quarrier: {
    id: 'quarrier',
    name: 'Quarrier',
    description: 'Mines stone from quarries.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    // 4 stone/s → 0.8/tick
    production: { wood: 0, stone: 0.8, food: 0, gold: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    description: 'Grows food on farmland to feed the population.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    // 2.5 × DEFAULT_CONSUMPTION (0.025) = 0.0625 food/tick
    production: { wood: 0, stone: 0, food: 0.0625, gold: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    description: 'Trades goods at the market. Each merchant carries one buy and one sell trade per tick.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    production: ZERO,
    consumption: DEFAULT_CONSUMPTION,
  },
};

// Building type id → job id mapping.
// Each completed building of a given type adds 1 capacity to its job.
export const BUILDING_JOB_MAP: Record<string, string> = {
  lumberjack: 'lumberjack',
  quarry: 'quarrier',
  farm: 'farmer',
  market: 'merchant',
};

// The same mapping the other way around, so a job can be traced back to the
// building that makes it available.
const BUILDING_FOR_JOB: Record<string, string> = {};

for (const [buildingId, jobId] of Object.entries(BUILDING_JOB_MAP)) {
  BUILDING_FOR_JOB[jobId] = buildingId;
}

/**
 * The order the jobs are in when a world starts.
 *
 * The player can reorder the jobs, so this is only the starting order.
 */
export const DEFAULT_JOB_ORDER: string[] = Object.keys(JOBS);

/**
 * True when a job is available to the player.
 *
 * A job that belongs to a building is only available once that building
 * has been built. A job without a building is always available.
 */
export const isJobAvailable = (
  jobId: string,
  buildingCounts: Record<string, number>,
): boolean => {
  const buildingId = BUILDING_FOR_JOB[jobId];

  if (!buildingId) {
    return true;
  }

  return (buildingCounts[buildingId] ?? 0) > 0;
};

/**
 * The available jobs, by job id.
 *
 * The Jobs panel shows these, and the order of them is the priority order
 * the player has set.
 */
export const getAvailableJobIds = (
  buildingCounts: Record<string, number>,
  jobIds: string[] = Object.keys(JOBS),
): string[] => jobIds.filter((jobId) => isJobAvailable(jobId, buildingCounts));

/**
 * A job order brought into line with the jobs that exist.
 *
 * A job the game does not know about is dropped. A job the order forgot is
 * put back at the end, so the order always holds every job exactly once.
 */
export const normalizeJobOrder = (order: string[] | undefined): string[] => {
  if (!order || order.length === 0) {
    return [...DEFAULT_JOB_ORDER];
  }

  const known = new Set(Object.keys(JOBS));
  const seen = new Set<string>();
  const result: string[] = [];

  for (const jobId of order) {
    if (!known.has(jobId) || seen.has(jobId)) {
      continue;
    }

    seen.add(jobId);
    result.push(jobId);
  }

  for (const jobId of DEFAULT_JOB_ORDER) {
    if (!seen.has(jobId)) {
      result.push(jobId);
    }
  }

  return result;
};

// Food consumed per population point per tick (0.05 food/s / 5 ticks = 0.01)
export const FOOD_CONSUMPTION_PER_TICK = 0.01;
