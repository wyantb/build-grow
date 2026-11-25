import { createEffect, onCleanup } from 'solid-js';
import { getGameState } from './useGameState.js';
import { useSettings } from './useSettings.js';

export const useGameLoop = () => {
  const gameState = getGameState();
  const { gameEngine } = gameState;
  const { isPaused } = useSettings();

  // Mirror engine state into the reactive store on every engine change
  const unsubscribe = gameEngine.subscribe(() => {
    gameState.mirrorEngineState();
    gameState.setResourceRates(gameEngine.getResourceRates());
  });

  // Start the game engine
  gameEngine.start();

  // Pausing stops the clock. The engine keeps running, but the world does not
  // advance while it is paused, so a player can look at the game or set up a
  // save without the world moving under them.
  createEffect(
    () => isPaused(),
    (paused) => {
      if (paused) {
        gameEngine.stop();

        return;
      }

      gameEngine.start();
    },
  );

  // Cleanup when component unmounts
  onCleanup(() => {
    unsubscribe();
    gameEngine.stop();
  });

  return {
    gameEngine,
    gameState,
  };
};
