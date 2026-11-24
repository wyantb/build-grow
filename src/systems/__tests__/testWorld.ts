import { createInitialState } from '../../types/worldState.js';
import type { Building, Resource, WorldState } from '../../types/worldState.js';
import type { MarketResource } from '../../data/market.js';

export interface WorldOverrides {
  population?: number;
  resources?: Partial<Resource>;
  /** Workers per job id. Jobs not listed start empty. */
  workers?: Record<string, number>;
  /** Completed buildings, by building type id. */
  buildings?: string[];
  /** Per-tick market buy orders, by resource. */
  marketBuys?: Partial<Record<MarketResource, number>>;
  /** Per-tick market sell orders, by resource. */
  marketSells?: Partial<Record<MarketResource, number>>;
}

const zeroResource = (): Resource => ({ wood: 0, stone: 0, food: 0, gold: 0 });

/**
 * Build a world state for tests.
 *
 * The engine only accepts a state through its constructor, so tests
 * assemble one here instead of mutating the engine after construction.
 */
export function createTestWorld(overrides: WorldOverrides = {}): WorldState {
  const state = createInitialState();

  state.population = overrides.population ?? state.population;

  if (overrides.resources) {
    state.resources = { ...state.resources, ...overrides.resources };
  }

  for (const job of Object.values(state.jobs)) {
    job.workers = 0;
  }

  for (const [jobId, workers] of Object.entries(overrides.workers ?? {})) {
    const job = state.jobs[jobId];
    if (!job) {
      throw new Error(`Unknown job id: ${jobId}`);
    }
    job.workers = workers;
  }

  for (const buildingId of overrides.buildings ?? []) {
    const key = `${buildingId}-0`;
    const building: Building = {
      id: buildingId,
      name: buildingId,
      description: `${buildingId} test building`,
      cost: zeroResource(),
      buildTime: 0,
      built: true,
      constructionProgress: 100,
    };
    state.buildings[key] = building;
    state.buildingCounts[buildingId] = (state.buildingCounts[buildingId] ?? 0) + 1;
  }

  if (overrides.marketBuys) {
    state.market.buys = { ...overrides.marketBuys };
  }

  if (overrides.marketSells) {
    state.market.sells = { ...overrides.marketSells };
  }

  return state;
}
