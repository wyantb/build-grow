import type { Job, Resource } from '../types/worldState.js';

// Per-tick production rates (engine runs at 5 ticks/sec)
// Settler: 0.2 food/s → 0.04/tick
// Lumberjack: 5 wood/s → 1.0/tick
// Quarrier: 4 stone/s → 0.8/tick

const ZERO: Resource = { wood: 0, stone: 0, food: 0, gold: 0 };
const DEFAULT_CONSUMPTION = { wood: 0, stone: 0, food: 0.025, gold: 0 };

export const JOBS: Record<string, Omit<Job, 'workers'>> = {
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
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    description: 'Trades goods at the market (production TBD).',
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
  market: 'merchant',
};

// Food consumed per population point per tick (0.05 food/s / 5 ticks = 0.01)
export const FOOD_CONSUMPTION_PER_TICK = 0.01;
