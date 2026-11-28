import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';
import { getBuildingType, getScaledCost, COST_SCALE_FACTOR } from '../../data/buildings.js';

describe('Caravanserai building', () => {
  it('costs 500 wood and 500 stone', () => {
    const type = getBuildingType('caravanserai');

    expect(type).toBeDefined();
    expect(type?.cost.wood).toBe(500);
    expect(type?.cost.stone).toBe(500);
  });

  it('scales its cost the same way as every other building', () => {
    const type = getBuildingType('caravanserai');

    if (!type) {
      throw new Error('The caravanserai is missing from the catalog.');
    }

    // getScaledCost always returns a filled Resource, so at count 0 we get
    // the base cost with all keys present (zeros filled in).
    const zeroCost = getScaledCost(type.cost, 0);
    expect(zeroCost.wood).toBe(500);
    expect(zeroCost.stone).toBe(500);
    expect(zeroCost.food).toBe(0);
    expect(getScaledCost(type.cost, 1).wood).toBe(Math.ceil(500 * COST_SCALE_FACTOR));
    expect(getScaledCost(type.cost, 1).stone).toBe(Math.ceil(500 * COST_SCALE_FACTOR));
    expect(getScaledCost(type.cost, 2).wood).toBe(Math.ceil(500 * COST_SCALE_FACTOR ** 2));
  });

  it('takes the resources when it is built', () => {
    const engine = new GameEngine(createTestWorld({
      resources: { wood: 500, stone: 500 },
    }));

    expect(engine.addBuilding('caravanserai')).toBe(true);

    const state = engine.getState();

    expect(state.resources.wood).toBe(0);
    expect(state.resources.stone).toBe(0);
  });

  it('is refused when the resources do not cover it', () => {
    const engine = new GameEngine(createTestWorld({
      resources: { wood: 499, stone: 500 },
    }));

    expect(engine.addBuilding('caravanserai')).toBe(false);
    expect(engine.getState().buildings['caravanserai-0']).toBeUndefined();
  });

  it('grants no job slots of its own', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      resources: { wood: 5000, stone: 5000 },
    }));

    const before = Object.entries(engine.getState().jobs)
      .map(([jobId, job]) => [jobId, job.capacity] as const);

    engine.addBuilding('caravanserai');
    engine.runTicks(20);

    const after = Object.entries(engine.getState().jobs)
      .map(([jobId, job]) => [jobId, job.capacity] as const);

    expect(engine.getState().buildingCounts['caravanserai']).toBe(1);
    expect(after).toEqual(before);
  });

  it('raises the trade capacity once it is finished', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { merchant: 2 },
      buildings: ['market'],
      resources: { wood: 500, stone: 500 },
    }));

    expect(engine.getTradeCapacity()).toBe(2);

    engine.addBuilding('caravanserai');
    engine.runTicks(20);

    expect(engine.getCaravanseraiCount()).toBe(1);
    expect(engine.getTradeCapacity()).toBe(4);
  });
});
