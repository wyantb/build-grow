import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import { createTestWorld } from './testWorld.js';

/**
 * A building that is still under construction is part of the save.
 *
 * The progress is the only thing that has to survive a load: the building
 * has to pick up from the same point instead of starting over or jumping
 * straight to finished.
 */
describe('a building under construction', () => {
  it('keeps its progress through a save and load', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');

    // Three ticks is 30% of the construction done.
    engine.runTicks(3);

    const saved = serializeState(engine.getState());

    expect(saved.buildings['hut-0']?.built).toBe(false);
    expect(saved.buildings['hut-0']?.constructionProgress).toBe(30);

    const restored = deserializePayload(saved);

    expect(restored.buildings['hut-0']?.built).toBe(false);
    expect(restored.buildings['hut-0']?.constructionProgress).toBe(30);
  });

  it('is not counted as finished until it completes', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');
    engine.runTicks(3);

    const saved = serializeState(engine.getState());

    // The count holds finished buildings only.
    expect(saved.buildingCounts['hut']).toBeUndefined();

    const restored = deserializePayload(saved);

    expect(restored.buildingCounts['hut']).toBeUndefined();
  });

  it('finishes from where the save left it, not from the start', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');
    engine.runTicks(3);

    const saved = serializeState(engine.getState());

    // A fresh engine that loads the save continues the same building.
    const loaded = new GameEngine(deserializePayload(saved));

    loaded.runTicks(7);

    // Ten ticks in total finish the building.
    expect(loaded.getState().buildings['hut-0']?.built).toBe(true);
    expect(loaded.getState().buildings['hut-0']?.constructionProgress).toBe(100);
    expect(loaded.getState().buildingCounts['hut']).toBe(1);
  });

  it('does not finish the building on the tick it is loaded', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 100 },
    }));

    engine.addBuilding('hut');
    engine.runTicks(3);

    const saved = serializeState(engine.getState());
    const loaded = new GameEngine(deserializePayload(saved));

    // The load itself must not advance the construction.
    expect(loaded.getState().buildings['hut-0']?.constructionProgress).toBe(30);
    expect(loaded.getState().buildings['hut-0']?.built).toBe(false);
  });

  it('keeps the progress of several buildings at once', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 500, stone: 500, food: 500 },
    }));

    engine.addBuilding('hut');
    engine.runTicks(2);

    engine.addBuilding('farm');
    engine.runTicks(3);

    const saved = serializeState(engine.getState());

    expect(saved.buildings['hut-0']?.constructionProgress).toBe(50);
    expect(saved.buildings['farm-0']?.constructionProgress).toBe(30);

    const restored = deserializePayload(saved);

    expect(restored.buildings['hut-0']?.constructionProgress).toBe(50);
    expect(restored.buildings['farm-0']?.constructionProgress).toBe(30);
    expect(restored.buildings['hut-0']?.built).toBe(false);
    expect(restored.buildings['farm-0']?.built).toBe(false);
  });

  it('drops a building the loaded world does not have', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      resources: { wood: 500, stone: 500, food: 500 },
    }));

    engine.addBuilding('hut');
    engine.runTicks(3);

    const saved = serializeState(engine.getState());

    // The world moves on: a second building starts.
    engine.addBuilding('farm');
    engine.runTicks(1);

    expect(Object.keys(engine.getState().buildings)).toEqual(['hut-0', 'farm-0']);

    // Loading the older save drops the building it does not have.
    engine.loadState(deserializePayload(saved));

    expect(Object.keys(engine.getState().buildings)).toEqual(['hut-0']);
    expect(engine.getState().buildings['farm-0']).toBeUndefined();
    expect(engine.getState().buildings['hut-0']?.constructionProgress).toBe(30);
  });
});
