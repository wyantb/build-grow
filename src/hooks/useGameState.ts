import { createSignal, createMemo } from 'solid-js';
import { createStore } from 'solid-js';
import type { WorldState, Resource, Stats } from '../types/worldState.js';
import { createInitialState } from '../types/worldState.js';
import { BUILDING_TYPES, getBuildingType } from '../data/buildings.js';
import type { BuildingType } from '../data/buildings.js';
import type { TechnologyType } from '../data/technologies.js';
import { getTechnology } from '../data/technologies.js';
import { getTradeCapacity } from '../data/market.js';
import type { MarketResource } from '../data/market.js';
import type { MarketAction, MarketFlow } from '../systems/marketSystem.js';
import { getPopulationCapacity as getCapacityFromHuts } from '../systems/population.js';
import GameEngine, {
  REBIRTH_GOLD_COST,
} from '../systems/gameEngine.js';

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

/**
 * Bring a store record in line with a plain one, in place.
 *
 * The same rule as `syncArray` applies: the keys that did not change stay
 * untouched, so only the counts that really moved notify.
 */
const syncRecord = (target: Record<string, number>, source: Record<string, number>): void => {
  for (const [key, value] of Object.entries(source)) {
    if (target[key] !== value) {
      target[key] = value;
    }
  }

  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      delete target[key];
    }
  }
};

/**
 * Bring the pending rebirth in the store in line with the engine's.
 *
 * The rebirth holds the stats of every species, so it is written field by
 * field. A world with no pending rebirth clears the store's, because a
 * rebirth that was confirmed leaves nothing behind.
 */
const syncPendingRebirth = (
  state: WorldState,
  pending: WorldState['pendingRebirth'],
): void => {
  if (!pending) {
    delete state.pendingRebirth;

    return;
  }

  if (!state.pendingRebirth) {
    state.pendingRebirth = {
      before: {},
      after: {},
      composition: {},
    };
  }

  for (const [speciesId, stats] of Object.entries(pending.before)) {
    const existing = state.pendingRebirth.before[speciesId];

    if (existing) {
      for (const name of Object.keys(stats) as (keyof Stats)[]) {
        existing[name] = stats[name];
      }
    } else {
      state.pendingRebirth.before[speciesId] = { ...stats };
    }
  }

  for (const [speciesId, stats] of Object.entries(pending.after)) {
    const existing = state.pendingRebirth.after[speciesId];

    if (existing) {
      for (const name of Object.keys(stats) as (keyof Stats)[]) {
        existing[name] = stats[name];
      }
    } else {
      state.pendingRebirth.after[speciesId] = { ...stats };
    }
  }

  // Mirror the composition.
  for (const [speciesId, count] of Object.entries(pending.composition)) {
    state.pendingRebirth.composition[speciesId] = count;
  }

  for (const key of Object.keys(state.pendingRebirth.composition)) {
    if (!(key in pending.composition)) {
      delete state.pendingRebirth.composition[key];
    }
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
    research: 0,
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
      state.population = gameEngine.getPopulation();
      state.defaultJob = engineState.defaultJob;
      syncArray(state.jobOrder, engineState.jobOrder);

      state.resources.wood = engineState.resources.wood;
      state.resources.stone = engineState.resources.stone;
      state.resources.food = engineState.resources.food;
      state.resources.gold = engineState.resources.gold;
      state.resources.research = engineState.resources.research;

      for (const [jobId, job] of Object.entries(engineState.jobs)) {
        if (state.jobs[jobId]) {
          state.jobs[jobId].workers = job.workers;
          state.jobs[jobId].capacity = job.capacity;
          syncRecord(state.jobs[jobId].species, job.species);
        } else {
          state.jobs[jobId] = { ...job, species: { ...job.species } };
        }
      }

      // A building instance never changes once it exists, so only new ones
      // have to be copied over.
      for (const [buildingId, building] of Object.entries(engineState.buildings)) {
        if (!state.buildings[buildingId]) {
          state.buildings[buildingId] = { ...building };
        }
      }

      // The roster of species is written in one field at a time, because
      // handing the store the engine's own object would be skipped by
      // Solid's identity check.
      for (const [speciesId, species] of Object.entries(engineState.species)) {
        if (state.species[speciesId]) {
          state.species[speciesId].name = species.name;
          state.species[speciesId].description = species.description;
          state.species[speciesId].stats.strength = species.stats.strength;
          state.species[speciesId].stats.dexterity = species.stats.dexterity;
          state.species[speciesId].stats.constitution = species.stats.constitution;
          state.species[speciesId].stats.intelligence = species.stats.intelligence;
          state.species[speciesId].stats.wisdom = species.stats.wisdom;
          state.species[speciesId].stats.charisma = species.stats.charisma;
          state.species[speciesId].stats.manaSensitivity = species.stats.manaSensitivity;
        } else {
          state.species[speciesId] = { ...species, stats: { ...species.stats } };
        }
      }

      // Mirror building counts
      for (const [id, count] of Object.entries(engineState.buildingCounts)) {
        state.buildingCounts[id] = count;
      }

      // Mirror market orders
      state.market.buys = { ...engineState.market.buys };
      state.market.sells = { ...engineState.market.sells };

      // Mirror the rebirth pool.
      state.rebirthPool.human = engineState.rebirthPool.human;
      state.rebirthPool.elf = engineState.rebirthPool.elf;

      syncArray(state.unlockedBuildings, engineState.unlockedBuildings);
      syncArray(state.researchedTechnologies, engineState.researchedTechnologies);

      syncPendingRebirth(state, engineState.pendingRebirth);
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
      state.population = gameEngine.getPopulation();
      state.defaultJob = engineState.defaultJob;

      state.resources.wood = engineState.resources.wood;
      state.resources.stone = engineState.resources.stone;
      state.resources.food = engineState.resources.food;
      state.resources.gold = engineState.resources.gold;
      state.resources.research = engineState.resources.research;

      // The order is written onto the array the store already holds, so
      // only the places that really moved notify their readers.
      syncArray(state.jobOrder, engineState.jobOrder);

      state.jobs = {};
      for (const [jobId, job] of Object.entries(engineState.jobs)) {
        state.jobs[jobId] = {
          ...job,
          production: { ...job.production },
          consumption: { ...job.consumption },
          species: { ...job.species },
        };
      }

      state.species = {};
      for (const [speciesId, species] of Object.entries(engineState.species)) {
        state.species[speciesId] = { ...species, stats: { ...species.stats } };
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

      state.rebirthPool.human = engineState.rebirthPool.human;
      state.rebirthPool.elf = engineState.rebirthPool.elf;

      syncPendingRebirth(state, engineState.pendingRebirth);
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

  /**
   * Move a job up or down in the priority order.
   *
   * @param direction -1 to move the job up, 1 to move it down.
   */
  const moveJob = (jobId: string, direction: -1 | 1): boolean => {
    const moved = gameEngine.moveJob(jobId, direction);

    if (!moved) {
      return false;
    }

    mirrorEngineState();

    return true;
  };

  /**
   * Move a job to a given place in the priority order.
   *
   * @param targetIndex - The place to move it to, counted among the visible jobs.
   */
  const reorderJob = (jobId: string, targetIndex: number): boolean => {
    const moved = gameEngine.reorderJob(jobId, targetIndex);

    if (!moved) {
      return false;
    }

    mirrorEngineState();

    return true;
  };

  /**
   * True when the player has enough gold to rebirth.
   *
   * Read from the mirrored store, so the figure stays reactive. The engine's
   * own state is not a tracking scope.
   */
  const canRebirth = (): boolean => (state.resources.gold ?? 0) >= REBIRTH_GOLD_COST;

  /**
   * The rebirth the player is in the middle of, if any.
   *
   * Read from the mirrored store, so the view comes and goes with the
   * rebirth.
   */
  const getPendingRebirth = () => state.pendingRebirth ?? null;

  /**
   * Start a rebirth.
   *
   * The player is taken out of the village and shown what the rebirth
   * brings. The world is left alone until they confirm it.
   */
  const beginRebirth = (): boolean => {
    const begun = gameEngine.beginRebirth();

    if (!begun) {
      return false;
    }

    mirrorEngineState();

    return true;
  };

  /**
   * Carry out the pending rebirth.
   *
   * The world is replaced by a new one, so the store is replaced to match.
   */
  const confirmRebirth = (): boolean => {
    const confirmed = gameEngine.confirmRebirth();

    if (!confirmed) {
      return false;
    }

    replaceEngineState();

    return true;
  };

  /**
   * Abandon the pending rebirth and go back to the village.
   */
  const cancelRebirth = (): boolean => {
    const cancelled = gameEngine.cancelRebirth();

    if (!cancelled) {
      return false;
    }

    mirrorEngineState();

    return true;
  };

  /**
   * The pool of races available for the next village.
   */
  const getRebirthPool = (): WorldState['rebirthPool'] =>
    gameEngine.getRebirthPool();

  /**
   * Update the composition of the next village.
   */
  const setComposition = (composition: Record<string, number>): boolean => {
    const done = gameEngine.setComposition(composition);

    if (!done) {
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
    research: 0,
  });

  // The market's own per-second rates, with no job production mixed in.
  const [marketRates, setMarketRates] = createSignal<Resource>({
    wood: 0,
    stone: 0,
    food: 0,
    gold: 0,
    research: 0,
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
   * The people the huts and the city center can hold.
   *
   * Read from the mirrored building counts so the figure stays reactive.
   */
  const getPopulationCapacity = (): number =>
    state.cityCenter.housing
    + getCapacityFromHuts(state.buildingCounts['hut'] ?? 0);

  /**
   * The maximum amount of a resource the storage structures can hold.
   *
   * Gold is uncapped. Read from the mirrored building counts so the figure
   * stays reactive. Each building that declares a storageBonus in the catalog
   * adds its per-copy amount to the relevant cap.
   */
  const getMaxStorage = (resource: 'wood' | 'stone' | 'food' | 'research'): number => {
    let woodStoneBonus = 0;
    let foodBonus = 0;

    for (const type of BUILDING_TYPES) {
      const bonus = type.storageBonus;
      if (!bonus) {continue;}
      const count = state.buildingCounts[type.id] ?? 0;
      if (count === 0) {continue;}
      if (bonus.woodStone) {
        woodStoneBonus += count * bonus.woodStone;
      }
      if (bonus.food) {
        foodBonus += count * bonus.food;
      }
    }

    switch (resource) {
      case 'wood':
      case 'stone':
        return state.cityCenter.storageWoodStone + woodStoneBonus;
      case 'food':
        return state.cityCenter.storageFood + foodBonus;
      case 'research':
        return state.cityCenter.storageResearch;
    }
  };

  /**
   * Break down storage capacity by source for a resource.
   *
   * Returns an array of `{ label, value }` pairs, one per source that
   * contributes (city center always first, then each building with a
   * non-zero count).
   */
  const getStorageBreakdown = (
    resource: 'wood' | 'stone' | 'food' | 'research',
  ): Array<{ label: string; value: number }> => {
    const entries: Array<{ label: string; value: number }> = [];

    if (resource === 'wood' || resource === 'stone') {
      entries.push({ label: 'City Center', value: state.cityCenter.storageWoodStone });
      for (const type of BUILDING_TYPES) {
        const bonus = type.storageBonus?.woodStone;
        if (!bonus) {continue;}
        const count = state.buildingCounts[type.id] ?? 0;
        if (count === 0) {continue;}
        entries.push({ label: type.name, value: count * bonus });
      }
    } else {
      entries.push({ label: 'City Center', value: state.cityCenter.storageFood });
      for (const type of BUILDING_TYPES) {
        const bonus = type.storageBonus?.food;
        if (!bonus) {continue;}
        const count = state.buildingCounts[type.id] ?? 0;
        if (count === 0) {continue;}
        entries.push({ label: type.name, value: count * bonus });
      }
    }

    return entries;
  };

  const getJobs = () => state.jobs;
  const getBuildings = () => state.buildings;
  const getGameTime = () => state.gameTime;
  const getBuildingCounts = () => state.buildingCounts;

  // Building catalog for the unlocked building types
  const getBuildingCatalog = (): BuildingType[] =>
    BUILDING_TYPES.filter((type) => state.unlockedBuildings.includes(type.id));

  // Technology catalog for the UI
  const getTechnologyCatalog = (): TechnologyType[] => gameEngine.getTechnologyCatalog();

  // Read technology state from the Solid store so the UI reacts when
  // research points change or a technology is completed.
  const isTechnologyResearched = (techId: string): boolean =>
    state.researchedTechnologies.includes(techId);

  const canResearch = (techId: string): boolean => {
    const tech = getTechnology(techId);
    if (!tech) {return false;}
    if (isTechnologyResearched(techId)) {return false;}

    return tech.prereqs.every((prereq) => isTechnologyResearched(prereq));
  };

  const canAffordResearch = (techId: string): boolean => {
    const tech = getTechnology(techId);
    if (!tech) {return false;}

    return state.resources.research >= (tech.cost.research ?? 0);
  };

  const doResearch = (techId: string): boolean => {
    const researched = gameEngine.researchTechnology(techId);
    if (researched) {
      mirrorEngineState();
    }

    return researched;
  };

  return {
    state,
    setState,
    getTick,
    getResources,
    getPopulation,
    getPopulationCapacity,
    getMaxStorage,
    getStorageBreakdown,
    getJobs,
    getBuildings,
    getGameTime,
    getBuildingCounts,
    getResourceRates,
    setResourceRates: setResourceRatesExternal,
    getBuildingCatalog,
    getTechnologyCatalog,
    isTechnologyResearched,
    canResearch,
    canAffordResearch,
    doResearch,
    buildBuilding,
    assignWorkers,
    moveJob,
    reorderJob,
    canRebirth,
    getPendingRebirth,
    beginRebirth,
    confirmRebirth,
    cancelRebirth,
    getRebirthPool,
    setComposition,
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
