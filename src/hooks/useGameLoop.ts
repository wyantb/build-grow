import { createEffect, onCleanup } from 'solid-js'
import { getGameState } from './useGameState'
import GameEngine from '../systems/gameEngine'

export const useGameLoop = () => {
  const gameState = getGameState()
  const gameEngine = new GameEngine()
  
  // Start the game engine
  gameEngine.start()
  
  // Sync game engine state with our reactive state
  const syncState = () => {
    // Get the current game state from the engine
    const engineState = gameEngine.getState()
    const rates = gameEngine.getResourceRates()
    
    // Update our reactive state
    gameState.setState({
      tick: engineState.tick,
      resources: engineState.resources,
      population: engineState.population,
      jobs: engineState.jobs,
      buildings: engineState.buildings,
      gameTime: engineState.gameTime
    })
    
    // Update resource rates separately
    gameState.setResourceRates(rates)
  }
  
  // Set up game loop interval to sync with the game engine's natural timing
  const intervalId = setInterval(syncState, 200) // Match the game engine's 5 ticks per second
  
  // Cleanup when component unmounts
  onCleanup(() => {
    clearInterval(intervalId)
    gameEngine.stop()
  })
  
  return {
    gameEngine,
    gameState
  }
}