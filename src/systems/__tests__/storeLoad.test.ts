import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGameState, resetGameState } from '../../hooks/useGameState.js';
import { deserializePayload, serializeState } from '../saveSystem.js';

beforeEach(() => {
  resetGameState();
});

afterEach(() => {
  resetGameState();
});

describe('the store after a load', () => {
  it('shows the loaded world, not the one it replaced', () => {
    const gameState = getGameState();

    // Build and finish a hut, then save.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    const saved = serializeState(gameState.gameEngine.getState());
    const savedCount = gameState.getBuildingCounts()['hut'] ?? 0;

    expect(savedCount).toBeGreaterThan(0);

    // Change the world: build a second hut and let it finish.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    expect(gameState.getBuildingCounts()['hut']).toBe(savedCount + 1);

    // Load the save back.
    gameState.loadState(deserializePayload(saved));

    expect(gameState.getBuildingCounts()['hut']).toBe(savedCount);
  });

  it('drops a building the loaded world does not have', () => {
    const gameState = getGameState();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    const saved = serializeState(gameState.gameEngine.getState());
    const savedHuts = Object.values(gameState.getBuildings())
      .filter((building) => building.id === 'hut').length;

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    expect(Object.values(gameState.getBuildings())
      .filter((building) => building.id === 'hut')).toHaveLength(savedHuts + 1);

    gameState.loadState(deserializePayload(saved));

    expect(Object.values(gameState.getBuildings())
      .filter((building) => building.id === 'hut')).toHaveLength(savedHuts);
  });

  it('puts the game clock back to where the save was taken', () => {
    const gameState = getGameState();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    const saved = serializeState(gameState.gameEngine.getState());
    const savedTime = saved.gameTime;

    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    expect(gameState.getGameTime()).toBeGreaterThan(savedTime);

    gameState.loadState(deserializePayload(saved));

    expect(gameState.getGameTime()).toBeCloseTo(savedTime, 5);
  });
});
