import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGameState, resetGameState } from '../../hooks/useGameState.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import { createTestWorld } from './testWorld.js';

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

describe('the store unlocked lists', () => {
  it('keeps the unlocked buildings of the loaded world', () => {
    const gameState = getGameState();

    gameState.gameEngine.loadState(createTestWorld({
      unlockedBuildings: ['hut', 'market'],
    }));
    gameState.replaceEngineState();

    expect(gameState.getBuildingCatalog().map((type) => type.id).sort())
      .toEqual(['hut', 'market']);
  });

  it('keeps the same array when a load does not change the unlocks', () => {
    const gameState = getGameState();
    const before = gameState.state.unlockedBuildings;

    gameState.gameEngine.loadState(createTestWorld());
    gameState.replaceEngineState();

    expect(gameState.state.unlockedBuildings).toBe(before);
  });

  it('adds an unlocked building the loaded world has', () => {
    const gameState = getGameState();

    gameState.gameEngine.loadState(createTestWorld({
      unlockedBuildings: ['hut', 'market'],
    }));
    gameState.replaceEngineState();

    gameState.gameEngine.loadState(createTestWorld({
      unlockedBuildings: ['hut', 'market', 'caravanserai'],
    }));
    gameState.replaceEngineState();

    expect(gameState.getBuildingCatalog().map((type) => type.id).sort())
      .toEqual(['caravanserai', 'hut', 'market']);
  });

  it('drops an unlocked building the loaded world does not have', () => {
    const gameState = getGameState();

    gameState.gameEngine.loadState(createTestWorld({
      unlockedBuildings: ['hut', 'market', 'caravanserai'],
    }));
    gameState.replaceEngineState();

    gameState.gameEngine.loadState(createTestWorld({
      unlockedBuildings: ['hut'],
    }));
    gameState.replaceEngineState();

    expect(gameState.getBuildingCatalog().map((type) => type.id)).toEqual(['hut']);
  });
});

describe('the store trade capacity', () => {
  it('counts the caravanserai into the capacity it reports', () => {
    const gameState = getGameState();

    gameState.gameEngine.loadState(createTestWorld({
      population: 4,
      workers: { merchant: 2 },
      buildings: ['market', 'caravanserai', 'caravanserai'],
    }));
    gameState.replaceEngineState();

    expect(gameState.getCaravanseraiCount()).toBe(2);
    expect(gameState.getMarketTradeCapacity()).toBe(6);
  });

  it('reports the capacity of the merchants alone without a caravanserai', () => {
    const gameState = getGameState();

    gameState.gameEngine.loadState(createTestWorld({
      population: 4,
      workers: { merchant: 2 },
      buildings: ['market'],
    }));
    gameState.replaceEngineState();

    expect(gameState.getCaravanseraiCount()).toBe(0);
    expect(gameState.getMarketTradeCapacity()).toBe(2);
  });
});
