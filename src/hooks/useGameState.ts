import { createSignal, createMemo } from 'solid-js'
import { createStore, SetStoreFunction, reconcile } from 'solid-js/store'
import type { WorldState, Resource, Job, Building } from '../types/worldState'
import { createInitialState } from '../types/worldState'

// Create a game state store with proper typing
export const useGameState = () => {
  // Create the main game state store
  const [state, setState] = createStore<WorldState>(createInitialState())
  
  // Resource rates - to be updated by the game loop
  const [resourceRates, setResourceRates] = createSignal<Resource>({
    wood: 0,
    stone: 0,
    food: 0,
    gold: 0
  })
  
  // Update the game state
  const updateState: SetStoreFunction<WorldState> = (...args: any[]) => {
    // @ts-ignore - This is a limitation of the solid-js types
    return setState(...args)
  }
  
  // Set resource rates from external source (game engine)
  const setResourceRatesExternal = (rates: Resource) => {
    setResourceRates(rates)
  }
  
  // Get resource production rates
  const getResourceRates = createMemo((): Resource => {
    return resourceRates()
  })
  
  // Building management
  const buildBuilding = (buildingId: string) => {
    // Check if building exists
    if (!state.buildings[buildingId]) {
      console.error(`Building ${buildingId} not found`)
      return false
    }
    
    // Check if already built
    if (state.buildings[buildingId].built) {
      console.error(`Building ${buildingId} already built`)
      return false
    }
    
    // Check if player can afford it
    const building = state.buildings[buildingId]
    const resources = state.resources
    if (resources.wood < building.cost.wood ||
        resources.stone < building.cost.stone ||
        resources.food < building.cost.food ||
        resources.gold < building.cost.gold) {
      console.error(`Not enough resources to build ${buildingId}`)
      return false
    }
    
    // Deduct resources
    setState('resources', {
      wood: resources.wood - building.cost.wood,
      stone: resources.stone - building.cost.stone,
      food: resources.food - building.cost.food,
      gold: resources.gold - building.cost.gold
    })
    
    // Start construction
    setState('buildings', buildingId, {
      constructionProgress: 0,
      built: false
    })
    
    return true
  }
  
  // Job management
  const assignWorker = (jobId: string) => {
    // Check if job exists
    if (!state.jobs[jobId]) {
      console.error(`Job ${jobId} not found`)
      return false
    }
    
    // Check if there are available workers
    const totalAssigned = Object.values(state.jobs).reduce((total, job) => total + job.workers, 0)
    if (totalAssigned >= state.population) {
      console.error('No available workers')
      return false
    }
    
    // Assign worker
    setState('jobs', jobId, 'workers', state.jobs[jobId].workers + 1)
    
    return true
  }
  
  const unassignWorker = (jobId: string) => {
    // Check if job exists
    if (!state.jobs[jobId]) {
      console.error(`Job ${jobId} not found`)
      return false
    }
    
    // Check if there are workers to unassign
    if (state.jobs[jobId].workers <= 0) {
      console.error('No workers to unassign')
      return false
    }
    
    // Unassign worker
    setState('jobs', jobId, 'workers', state.jobs[jobId].workers - 1)
    
    return true
  }
  
  // Simple state accessors
  const getTick = () => state.tick
  const getResources = () => state.resources
  const getPopulation = () => state.population
  const getJobs = () => state.jobs
  const getBuildings = () => state.buildings
  const getGameTime = () => state.gameTime
  
  return {
    state,
    setState: updateState,
    getTick,
    getResources,
    getPopulation,
    getJobs,
    getBuildings,
    getGameTime,
    getResourceRates,
    setResourceRates: setResourceRatesExternal,
    buildBuilding,
    assignWorker,
    unassignWorker,
    // Expose the raw state for debugging
    rawState: state
  }
}

// Export a singleton instance for the entire app
export type GameStateReturnType = ReturnType<typeof useGameState>
let gameStateInstance: GameStateReturnType | null = null

export const getGameState = () => {
  if (!gameStateInstance) {
    gameStateInstance = useGameState()
  }
  return gameStateInstance
}