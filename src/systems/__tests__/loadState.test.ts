import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import { createTestWorld } from './testWorld.js';

describe('GameEngine.loadState', () => {
  it('replaces the world with the loaded one', () => {
    const engine = new GameEngine(createTestWorld({ population: 5 }));

    const loaded = createTestWorld({
      population: 30,
      resources: { wood: 999, stone: 0, food: 0, gold: 0 },
      workers: { lumberjack: 4 },
      buildings: ['hut', 'farm'],
    });

    engine.loadState(deserializePayload(serializeState(loaded)));

    const state = engine.getState();

    expect(state.population).toBe(30);
    expect(state.resources.wood).toBe(999);
    expect(state.jobs['lumberjack']?.workers).toBe(4);
    expect(state.buildingCounts['farm']).toBe(1);
  });

  it('drops the buildings the loaded world does not have', () => {
    const engine = new GameEngine(createTestWorld({ buildings: ['hut', 'hut', 'farm'] }));

    expect(Object.keys(engine.getState().buildings)).toHaveLength(3);

    const loaded = createTestWorld({ buildings: ['hut'] });

    engine.loadState(deserializePayload(serializeState(loaded)));

    expect(Object.keys(engine.getState().buildings)).toHaveLength(1);
    expect(engine.getState().buildingCounts).toEqual({ hut: 1 });
  });

  it('recalculates job capacity from the loaded buildings', () => {
    const engine = new GameEngine(createTestWorld({ buildings: ['lumberjack', 'lumberjack'] }));

    expect(engine.getState().jobs['lumberjack']?.capacity).toBe(2);

    const loaded = createTestWorld({ buildings: ['lumberjack'] });

    engine.loadState(deserializePayload(serializeState(loaded)));

    expect(engine.getState().jobs['lumberjack']?.capacity).toBe(1);
  });

  it('keeps the market system writing to the loaded state', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['market'],
      workers: { merchant: 2 },
      marketSells: { wood: 2 },
    }));

    const loaded = createTestWorld({
      population: 10,
      resources: { wood: 400, stone: 0, food: 0, gold: 0 },
      buildings: ['market'],
      workers: { merchant: 2 },
      marketSells: { wood: 2 },
    });

    engine.loadState(deserializePayload(serializeState(loaded)));

    const goldBefore = engine.getState().resources.gold;

    engine.runTicks(1);

    // The market system holds a reference to the state object. If the load
    // did not re-point it, the trades would settle into the old world and
    // the gold of the loaded world would not move.
    expect(engine.getState().resources.gold).toBeGreaterThan(goldBefore);
    expect(engine.getState().resources.wood).toBeLessThan(400);
  });

  it('does not build on top of the buildings it loaded', () => {
    const engine = new GameEngine(createTestWorld({ buildings: ['hut'] }));

    const loaded = createTestWorld({ buildings: ['hut', 'hut'] });

    engine.loadState(deserializePayload(serializeState(loaded)));

    // The instance counter is rebuilt from the loaded buildings, so a new
    // hut gets a fresh key instead of overwriting an existing one.
    const built = engine.addBuilding('hut');

    expect(built).toBe(true);
    expect(Object.keys(engine.getState().buildings)).toHaveLength(3);
  });

  it('notifies its subscribers so the store can be updated', () => {
    const engine = new GameEngine(createTestWorld());
    let notifications = 0;

    engine.subscribe(() => {
      notifications++;
    });

    engine.loadState(deserializePayload(serializeState(createTestWorld({ population: 7 }))));

    expect(notifications).toBe(1);
  });
});
