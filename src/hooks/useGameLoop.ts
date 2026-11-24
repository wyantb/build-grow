import { onCleanup } from 'solid-js'
import { getGameState } from './useGameState.js'

export const useGameLoop = () => {
  const gameState = getGameState()
  const { gameEngine } = gameState

  // Mirror engine state into the reactive store on every engine change
  const unsubscribe = gameEngine.subscribe(() => {
    gameState.mirrorEngineState()
    gameState.setResourceRates(gameEngine.getResourceRates())
  })

  // Start the game engine
  gameEngine.start()

  // Cleanup when component unmounts
  onCleanup(() => {
    unsubscribe()
    gameEngine.stop()
  })

  return {
    gameEngine,
    gameState
  }
}