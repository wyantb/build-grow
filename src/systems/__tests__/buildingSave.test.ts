import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import { createTestWorld } from './testWorld.js';

/**
 * A building is part of the save.
 *
 * A building is finished the moment it is paid for, so there is no progress
 * to keep: the save holds the building and the count that goes with it.
 */
describe('a building in the save', () => {
  it('keeps the building and its count through a save and load', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');

    const saved = serializeState(engine.getState());

    expect(saved.buildings['hut-0']?.id).toBe('hut');
    expect(saved.buildingCounts['hut']).toBe(1);

    const restored = deserializePayload(saved);

    expect(restored.buildings['hut-0']?.id).toBe('hut');
    expect(restored.buildingCounts['hut']).toBe(1);
  });

  it('counts the building as finished straight away', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');

    const saved = serializeState(engine.getState());

    expect(saved.buildingCounts['hut']).toBe(1);
  });

  it('keeps several buildings at once', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 500, stone: 500, food: 500 },
    }));

    engine.addBuilding('hut');
    engine.addBuilding('farm');

    const saved = serializeState(engine.getState());

    expect(Object.keys(saved.buildings).sort()).toEqual(['farm-0', 'hut-0']);

    const restored = deserializePayload(saved);

    expect(Object.keys(restored.buildings).sort()).toEqual(['farm-0', 'hut-0']);
    expect(restored.buildingCounts).toEqual({ hut: 1, farm: 1 });
  });

  it('drops a building the loaded world does not have', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 500, stone: 500, food: 500 },
    }));

    engine.addBuilding('hut');

    const saved = serializeState(engine.getState());

    // The world moves on: a second building is added.
    engine.addBuilding('farm');

    expect(Object.keys(engine.getState().buildings)).toEqual(['hut-0', 'farm-0']);

    // Loading the older save drops the building it does not have.
    engine.loadState(deserializePayload(saved));

    expect(Object.keys(engine.getState().buildings)).toEqual(['hut-0']);
    expect(engine.getState().buildings['farm-0']).toBeUndefined();
  });
});
