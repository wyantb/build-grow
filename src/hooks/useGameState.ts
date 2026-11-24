import { createSignal, createMemo } from 'solid-js';
import { createStore } from 'solid-js';
import type { WorldState, Resource } from '../types/worldState.js';
import { createInitialState } from '../types/worldState.js';
import { BUILDING_TYPES, getBuildingType } from '../data/buildings.js';
import type { BuildingType } from '../data/buildings.js';
import GameEngine from '../systems/gameEngine.js';

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

      for (const [buildingId, building] of Object.entries(engineState.buildings)) {
        if (state.buildings[buildingId]) {
          state.buildings[buildingId].constructionProgress = building.constructionProgress;
          state.buildings[buildingId].built = building.built;
        } else {
          state.buildings[buildingId] = { ...building };
        }
      }

      // Mirror building counts
      for (const [id, count] of Object.entries(engineState.buildingCounts)) {
        state.buildingCounts[id] = count;
      }
    });
  };

  // Building management
  const buildBuilding = (buildingId: string) => {
    const buildingType = getBuildingType(buildingId);
    if (!buildingType) {
      console.error(`Building ${buildingId} not found`);

      return false;
    }

    // Already under construction or finished
    const existing = state.buildings[buildingId];
    if (existing?.built) {
      console.error(`Building ${buildingId} already built`);

      return false;
    }

    // The engine owns the state, so the cost check and the construction
    // start must both happen there.
    const started = gameEngine.addBuilding(buildingId);
    if (!started) {
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

  // Simple state accessors
  const getTick = () => state.tick;
  const getResources = () => state.resources;
  const getPopulation = () => state.population;
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
    gameEngine,
    mirrorEngineState,
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
