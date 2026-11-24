import { createSignal, createMemo } from 'solid-js'
import { createStore, SetStoreFunction } from 'solid-js/store'
import type { WorldState, Resource } from '../types/worldState'
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