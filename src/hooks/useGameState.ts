import { createSignal, createMemo } from 'solid-js';
import { createStore } from 'solid-js';
import type { WorldState, Resource } from '../types/worldState.js';
import { createInitialState } from '../types/worldState.js';
import { BUILDING_TYPES, getBuildingType } from '../data/buildings.js';
import type { BuildingType } from '../data/buildings.js';
import { getTradeCapacity } from '../data/market.js';
import type { MarketResource } from '../data/market.js';
import type { MarketAction, MarketFlow } from '../systems/marketSystem.js';
import { getPopulationCapacity as getCapacityFromHuts } from '../systems/population.js';
import GameEngine from '../systems/gameEngine.js';

/**
 * Bring a store array in line with a plain array, in place.
 *
 * The store tracks the items of an array, so replacing the array with a fresh
 * copy makes every reader of it re-run, even when the items did not change.
 * Writing the items onto the array the store already holds notifies only the
 * indices that actually moved.
 */
const syncArray = (target: string[], source: string[]): void => {
  source.forEach((item, index) => {
    if (target[index] !== item) {
      target[index] = item;
    }
  });

  if (target.length > source.length) {
    target.splice(source.length, target.length - source.length);
  }
};

// Create a game state store with proper typing
export const useGameState = () => {
  // The engine owns the authoritative game state; the store mirrors it
  // reactively so the UI can bind to plain reactive reads.
  const gameEngine = new GameEngine();

  // Create the main game state store
  const [state, setState] = createStore<WorldState>(createInitialState());

  // Resource rates - to be updated by the game loop
  const [resourceRates, setResourceRates] = createSignal<Resource>({
    wood: 0,
    stone: 0,
    food: 0,
    gold: 0,
  });

  // Set resource rates from external source (game engine)
  const setResourceRatesExternal = (rates: Resource) => {
    setResourceRates(rates);
  };

  // Get resource production rates
  const getResourceRates = createMemo((): Resource => {
    return resourceRates();
  });

  // Mirror the engine state into the reactive store.
  // Solid 2's store setter takes a single draft callback. The draft is
  // mutated in place, which preserves the identity of existing nested objects
  // so <For> does not rebuild its rows on every tick.
  const mirrorEngineState = () => {
    const engineState = gameEngine.getState();

    setState((state) => {
      state.tick = engineState.tick;
      state.gameTime = engineState.gameTime;
      state.population = engineState.population;
      state.defaultJob = engineState.defaultJob;

      state.resources.wood = engineState.resources.wood;
      state.resources.stone = engineState.resources.stone;
      state.resources.food = engineState.resources.food;
      state.resources.gold = engineState.resources.gold;

      for (const [jobId, job] of Object.entries(engineState.jobs)) {
        if (state.jobs[jobId]) {
          state.jobs[jobId].workers = job.workers;
          state.jobs[jobId].capacity = job.capacity;
        } else {
          state.jobs[jobId] = { ...job };
        }
      }

      // A building instance never changes once it exists, so only new ones
      // have to be copied over.
      for (const [buildingId, building] of Object.entries(engineState.buildings)) {
        if (!state.buildings[buildingId]) {
          state.buildings[buildingId] = { ...building };
        }
      }

      // Mirror building counts
      for (const [id, count] of Object.entries(engineState.buildingCounts)) {
        state.buildingCounts[id] = count;
      }

      // Mirror market orders
      state.market.buys = { ...engineState.market.buys };
      state.market.sells = { ...engineState.market.sells };
    });

    // The market rates come from the engine's plan for the next tick, so
    // they are mirrored alongside the state they were planned against.
    setMarketTickRates(gameEngine.getMarketTickRates());
    setMarketRates(gameEngine.getMarketRates());
    setMarketFlow(gameEngine.getMarketFlow());
  };

  /**
   * Mirror the engine state into the reactive store, replacing whole
   * subtrees instead of updating them in place.
   *
   * The normal mirror only adds and updates, so a building that a loaded save
   * no longer has would stay in the store forever. A load replaces the
   * subtrees outright, which drops the stale entries.
   */
  const replaceEngineState = () => {
    const engineState = gameEngine.getState();

    setState((state) => {
      state.tick = engineState.tick;
      state.gameTime = engineState.gameTime;
      state.population = engineState.population;
      state.defaultJob = engineState.defaultJob;

      state.resources.wood = engineState.resources.wood;
      state.resources.stone = engineState.resources.stone;
      state.resources.food = engineState.resources.food;
      state.resources.gold = engineState.resources.gold;

      state.jobs = {};
      for (const [jobId, job] of Object.entries(engineState.jobs)) {
        state.jobs[jobId] = {
          ...job,
          production: { ...job.production },
          consumption: { ...job.consumption },
        };
      }

      state.buildings = {};
      for (const [instanceKey, building] of Object.entries(engineState.buildings)) {
        state.buildings[instanceKey] = {
          ...building,
          cost: { ...building.cost },
        };
      }

      state.buildingCounts = { ...engineState.buildingCounts };
      syncArray(state.unlockedBuildings, engineState.unlockedBuildings);
      syncArray(state.unlockedJobs, engineState.unlockedJobs);

      state.market.buys = { ...engineState.market.buys };
      state.market.sells = { ...engineState.market.sells };
    });

    setMarketTickRates(gameEngine.getMarketTickRates());
    setMarketRates(gameEngine.getMarketRates());
    setMarketFlow(gameEngine.getMarketFlow());
  };

  /**
   * Load a world into the game.
   *
   * The engine takes the state as the authoritative one, and the store is
   * replaced to match, so no part of the previous world survives.
   */
  const loadState = (newState: WorldState) => {
    gameEngine.loadState(newState);
    replaceEngineState();
  };

  /**
   * Throw the world away and start a new one.
   *
   * The store is replaced to match, so no part of the old world survives.
   */
  const resetState = () => {
    gameEngine.resetState();
    replaceEngineState();
  };

  // Building management
  const buildBuilding = (buildingId: string) => {
    const buildingType = getBuildingType(buildingId);
    if (!buildingType) {
      console.error(`Building ${buildingId} not found`);

      return false;
    }

    // The engine owns the state, so the cost check and the build must both
    // happen there.
    const built = gameEngine.addBuilding(buildingId);
    if (!built) {
      console.error(`Not enough resources to build ${buildingId}`);

      return false;
    }

    mirrorEngineState();

    return true;
  };

  // Job management
  const assignWorkers = (jobId: string, count: number): boolean => {
    const job = state.jobs[jobId];
    if (!job) {
      console.error(`Job ${jobId} not found`);

      return false;
    }

    const assigned = gameEngine.assignWorkers(jobId, count);
    if (!assigned) {
      console.error(`Could not assign ${count} workers to ${jobId}`);

      return false;
    }

    mirrorEngineState();

    return true;
  };

  const setDefaultJob = (jobId: string): boolean => {
    const success = gameEngine.setDefaultJob(jobId);
    if (!success) {
      console.error(`Cannot set ${jobId} as default job`);

      return false;
    }

    mirrorEngineState();

    return true;
  };

  const getAvailableWorkers = (): number => {
    const defaultJobId = state.defaultJob;
    const totalAssigned = Object.values(state.jobs)
      .filter((j) => j.id !== defaultJobId)
      .reduce((sum, j) => sum + j.workers, 0);

    return Math.max(0, state.population - totalAssigned);
  };

  // Market management
  const setMarketAllocation = (
    action: MarketAction,
    resource: MarketResource,
    count: number,
  ): boolean => {
    const allocated = gameEngine.setMarketAllocation(action, resource, count);
    if (!allocated) {
      console.error(`Could not allocate ${count} ${resource} ${action} slots`);

      return false;
    }

    mirrorEngineState();

    return true;
  };

  const getMarketOrders = () => state.market;

  /**
   * Release the buy and the sell order for `resource`.
   *
   * The resource stops being traded and the trades both orders held are
   * freed.
   */
  const clearMarketAllocation = (resource: MarketResource): boolean => {
    const cleared = gameEngine.clearMarketAllocation(resource);
    if (!cleared) {
      console.error(`Could not clear the market orders for ${resource}`);

      return false;
    }

    mirrorEngineState();

    return true;
  };

  const isMarketBuilt = () => (state.buildingCounts['market'] ?? 0) > 0;

  /**
   * Merchants available to trade.
   *
   * Read from the mirrored store so the count stays reactive; the engine's
   * own state is not a tracking scope.
   */
  const getMerchantCount = (): number => {
    if (!isMarketBuilt()) {return 0;}

    return state.jobs['merchant']?.workers ?? 0;
  };

  /**
   * Caravanserai that are completed.
   *
   * Read from the mirrored store so the count stays reactive.
   */
  const getCaravanseraiCount = (): number => state.buildingCounts['caravanserai'] ?? 0;

  /**
   * Total trade positions the merchants can carry per tick.
   *
   * Each caravanserai gives every merchant one more position.
   */
  const getMarketTradeCapacity = (): number =>
    getTradeCapacity(getMerchantCount(), getCaravanseraiCount());

  /**
   * Trades still free for `action`.
   *
   * Every unit of an order occupies one of the merchants' trades, so the
   * quantity in use is what counts against the merchant capacity.
   */
  const getFreeMarketTrades = (action: MarketAction): number => {
    const orders = action === 'buy' ? state.market.buys : state.market.sells;
    const used = Object.values(orders).reduce((sum, count) => sum + (count ?? 0), 0);

    return Math.max(0, getMarketTradeCapacity() - used);
  };

  /**
   * Net resource change per tick that the market orders will settle.
   *
   * The engine plans the tick's trades from the current state, so this
   * matches what actually settles: a buy that cannot be paid for does not
   * show up here.
   */
  const [marketTickRates, setMarketTickRates] = createSignal<Resource>({
    wood: 0,
    stone: 0,
    food: 0,
    gold: 0,
  });

  // The market's own per-second rates, with no job production mixed in.
  const [marketRates, setMarketRates] = createSignal<Resource>({
    wood: 0,
    stone: 0,
    food: 0,
    gold: 0,
  });

  // The units bought and sold per second, split by direction.
  const [marketFlow, setMarketFlow] = createSignal<MarketFlow>({ bought: {}, sold: {} });

  const getMarketTickRates = (): Resource => marketTickRates();

  const getMarketRates = (): Resource => marketRates();

  const getMarketFlow = (): MarketFlow => marketFlow();

  // Simple state accessors
  const getTick = () => state.tick;
  const getResources = () => state.resources;
  const getPopulation = () => state.population;

  /**
   * The people the huts can hold.
   *
   * Read from the mirrored building counts so the figure stays reactive.
   */
  const getPopulationCapacity = (): number =>
    getCapacityFromHuts(state.buildingCounts['hut'] ?? 0);

  const getJobs = () => state.jobs;
  const getBuildings = () => state.buildings;
  const getGameTime = () => state.gameTime;
  const getBuildingCounts = () => state.buildingCounts;

  // Building catalog for the unlocked building types
  const getBuildingCatalog = (): BuildingType[] =>
    BUILDING_TYPES.filter((type) => state.unlockedBuildings.includes(type.id));

  return {
    state,
    setState,
    getTick,
    getResources,
    getPopulation,
    getPopulationCapacity,
    getJobs,
    getBuildings,
    getGameTime,
    getBuildingCounts,
    getResourceRates,
    setResourceRates: setResourceRatesExternal,
    getBuildingCatalog,
    buildBuilding,
    assignWorkers,
    setDefaultJob,
    getAvailableWorkers,
    getMarketOrders,
    isMarketBuilt,
    setMarketAllocation,
    clearMarketAllocation,
    getMerchantCount,
    getCaravanseraiCount,
    getMarketTradeCapacity,
    getFreeMarketTrades,
    getMarketTickRates,
    getMarketRates,
    getMarketFlow,
    gameEngine,
    mirrorEngineState,
    replaceEngineState,
    loadState,
    resetState,
    // Expose the raw state for debugging
    rawState: state,
  };
};

// Export a singleton instance for the entire app
export type GameStateReturnType = ReturnType<typeof useGameState>
let gameStateInstance: GameStateReturnType | null = null;

export const getGameState = () => {
  if (!gameStateInstance) {
    gameStateInstance = useGameState();
  }

  return gameStateInstance;
};

/**
 * Throw away the shared game state, so the next `getGameState` builds a new
 * one.
 *
 * Tests use this to start from a clean world. The game itself never calls it.
 */
export const resetGameState = (): void => {
  gameStateInstance = null;
};
