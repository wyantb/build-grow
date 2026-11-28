import type { Job, Resource } from '../types/worldState.js';
import type { JobStats } from '../systems/stats.js';

// Per-tick production rates (engine runs at 5 ticks/sec)
// Settler: 0.2 food/s → 0.04/tick
// Lumberjack: 5 wood/s → 1.0/tick
// Quarrier: 4 stone/s → 0.8/tick

const ZERO: Resource = { wood: 0, stone: 0, food: 0, gold: 0, research: 0, clay: 0 };
const DEFAULT_CONSUMPTION = { wood: 0, stone: 0, food: 0, gold: 0, research: 0, clay: 0 };

export const JOBS: Record<string, Omit<Job, 'workers' | 'species'>> = {
  unemployed: {
    id: 'unemployed',
    name: 'Unemployed',
    description: 'Workers with no role yet. From harvesting, they\'ll hopefully manage to feed themselves.',
    capacity: 0, // uncapped
    canDefault: true,
    production: { wood: 0, stone: 0, food: 0.025, gold: 0, research: 0, clay: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  settler: {
    id: 'settler',
    name: 'Settler',
    description: 'Generalist workers who gather basic resources. Outcompeted by specialized roles.',
    capacity: 0, // uncapped
    canDefault: true,
    // Per tick (5 ticks/sec): 0.5/5=0.1 wood, 0.2/5=0.04 stone, 0.1/5=0.02 food
    production: { wood: 0.1, stone: 0.04, food: 0.01, gold: 0, research: 0, clay: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  lumberjack: {
    id: 'lumberjack',
    name: 'Lumberjack',
    description: 'Cuts wood from nearby forests.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    // 5 wood/s → 1.0/tick
    production: { wood: 1.0, stone: 0, food: 0, gold: 0, research: 0, clay: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  quarrier: {
    id: 'quarrier',
    name: 'Quarrier',
    description: 'Mines stone from quarries.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    // 4 stone/s → 0.8/tick
    production: { wood: 0, stone: 0.8, food: 0, gold: 0, research: 0, clay: 0 },
    consumption: DEFAULT_CONSUMPTION,
  },
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    description: 'Grows food on farmland to feed the population.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    // 2.5 × old DEFAULT_CONSUMPTION (0.025) = 0.0625 food/tick
    production: { wood: 0, stone: 0, food: 0.08, gold: 0, research: 0, clay: 0 },
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
  ceramist: {
    id: 'ceramist',
    name: 'Ceramist',
    description: 'Shapes clay into useful wares. Each ceramist makes sheds 5% more spacious.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    production: { wood: 0, stone: 0, food: 0, gold: 0, research: 0, clay: 0.2 },
    consumption: { wood: 0, stone: 0.6, food: 0, gold: 0, research: 0, clay: 0 },
  },
  chief: {
    id: 'chief',
    name: 'Chief',
    description: 'Keeps the settlement organized and harnesses ideas for the greater good.',
    capacity: 0, // set dynamically from buildings
    canDefault: false,
    production: ZERO,
    consumption: DEFAULT_CONSUMPTION,
  },
};

type JobsDetails = typeof JOBS;
type JobBaseType = keyof JobsDetails;

type JobStatsCompleteMap = {
  [job in JobBaseType]: null | JobStats;
};

/**
 * The stats each job leans on.
 *
 * The primary stat counts fully and the secondary stat counts half, so a
 * job's rate is the base rate times both factors. A job that is missing
 * here is neither helped nor hindered by any stat.
 */
export const JOB_STATS: JobStatsCompleteMap = {
  lumberjack: { primary: 'strength', secondary: 'intelligence' },
  quarrier: { primary: 'strength', secondary: 'constitution' },
  farmer: { primary: 'constitution', secondary: 'wisdom' },
  settler: { primary: 'intelligence', secondary: 'charisma' },
  ceramist: { primary: 'intelligence', secondary: 'dexterity' },
  unemployed: null,
  merchant: null,
  chief: { primary: 'wisdom', secondary: 'charisma' },
};

// Building type id → job id mapping.
// Each completed building of a given type adds 1 capacity to its job.
export const BUILDING_JOB_MAP: Record<string, string> = {
  lumberjack: 'lumberjack',
  quarry: 'quarrier',
  farm: 'farmer',
  market: 'merchant',
  pottery_studio: 'ceramist',
  estate: 'chief',
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
 * Normalize a job priority order.
 *
 * Unknown or duplicate job ids are dropped. Jobs that are missing from the
 * order are appended. A job that can be defaulted (settler, unemployed) is
 * always placed at the end, with unemployed last, so the player's priority
 * order covers every meaningful job before the fallback block.
 */
export const normalizeJobOrder = (order: string[] | undefined): string[] => {
  // Start from DEFAULT_JOB_ORDER when no order is given, so a world that
  // never set one still gets the canonical starting order.
  const base: string[] = order && order.length > 0 ? [...order] : [...DEFAULT_JOB_ORDER];

  const known = new Set(Object.keys(JOBS));
  const seen = new Set<string>();
  const result: string[] = [];

  // First pass: keep only non-defaultable jobs in the player's order.
  for (const jobId of base) {
    if (!known.has(jobId) || seen.has(jobId)) {
      continue;
    }

    seen.add(jobId);

    if (!JOBS[jobId]?.canDefault) {
      result.push(jobId);
    }
  }

  // New jobs that were not in the order yet: insert them above the
  // defaultable block (unless they are defaultable themselves).
  for (const jobId of DEFAULT_JOB_ORDER) {
    if (seen.has(jobId)) {
      continue;
    }

    seen.add(jobId);

    if (!JOBS[jobId]?.canDefault) {
      result.push(jobId);
    }
  }

  // The defaultable jobs always go at the end: settler, then unemployed.
  result.push('settler', 'unemployed');

  return result;
};

// Food consumed per population point per tick (0.05 food/s / 5 ticks = 0.01)
export const FOOD_CONSUMPTION_PER_TICK = 0.01;
