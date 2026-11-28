import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { DEFAULT_JOB_ORDER, getAvailableJobIds, isJobAvailable } from '../../data/jobs.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import { createTestWorld } from './testWorld.js';

/**
 * The jobs the player can see, in the order the world holds them.
 */
const visibleJobs = (engine: GameEngine): string[] =>
  getAvailableJobIds(
    engine.getState().buildingCounts,
    engine.getState().jobOrder,
  );

// After normalization, defaultable jobs (settler, unemployed) are at the end.
const normalizedDefaultOrder = ['lumberjack', 'quarrier', 'farmer', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'];

describe('the priority order of the jobs', () => {
  it('starts with the normalized catalog order', () => {
    const engine = new GameEngine();

    expect(engine.getState().jobOrder).toEqual(normalizedDefaultOrder);
  });

  it('holds every job exactly once', () => {
    const engine = new GameEngine();

    expect([...engine.getState().jobOrder].sort()).toEqual(
      [...DEFAULT_JOB_ORDER].sort(),
    );
  });

  it('moves a job up when asked', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    engine.moveJob('quarrier', -1);

    expect(engine.getState().jobOrder.slice(0, 2)).toEqual(['quarrier', 'lumberjack']);
  });

  it('moves a job down when asked', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    engine.moveJob('lumberjack', 1);

    expect(engine.getState().jobOrder.slice(0, 2)).toEqual(['quarrier', 'lumberjack']);
  });

  it('keeps every job in the order after a move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    engine.moveJob('quarrier', -1);

    expect([...engine.getState().jobOrder].sort()).toEqual(
      [...DEFAULT_JOB_ORDER].sort(),
    );
  });

  it('does not move a defaultable job up', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.moveJob('settler', -1)).toBe(false);
  });

  it('does not move a job past a defaultable job down', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['market'],
      jobOrder: normalizedDefaultOrder,
    }));

    // merchant is right above settler; moving it down would swap with settler
    expect(engine.moveJob('merchant', 1)).toBe(false);
  });

  it('does not move the first job up', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.moveJob('lumberjack', -1)).toBe(false);
    expect(engine.getState().jobOrder[0]).toBe('lumberjack');
  });

  it('does not move the last job down', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.moveJob('unemployed', 1)).toBe(false);
  });

  it('does not move a job the world does not have', () => {
    const engine = new GameEngine();

    expect(engine.moveJob('dragon', -1)).toBe(false);
  });

  it('moves a job past one that is not on screen', () => {
    // The lumberjack is not available, so it is not on screen. The farmer
    // moves past the quarrier to the top of what the player can see.
    const engine = new GameEngine(createTestWorld({
      buildings: ['quarry', 'farm'],
      jobOrder: ['lumberjack', 'quarrier', 'farmer', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    expect(visibleJobs(engine)).toEqual(['quarrier', 'farmer', 'settler', 'unemployed']);

    engine.moveJob('farmer', -1);

    expect(visibleJobs(engine)).toEqual(['farmer', 'quarrier', 'settler', 'unemployed']);
  });

  it('tells the player when a job cannot move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['quarry', 'farm'],
      jobOrder: ['lumberjack', 'quarrier', 'farmer', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    // The quarrier is the first job on screen, so it cannot move up.
    expect(engine.moveJob('quarrier', -1)).toBe(false);

    // The farmer cannot move down past quarrier when quarrier is the only other visible non-defaultable
    expect(engine.moveJob('farmer', 1)).toBe(false);
  });
});

describe('moving a job to a place', () => {
  it('moves a job down to the place it is dropped on', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.reorderJob('lumberjack', 1)).toBe(true);

    expect(visibleJobs(engine)).toEqual(['quarrier', 'lumberjack', 'settler', 'unemployed']);
  });

  it('moves a job up to the place it is dropped on', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.reorderJob('quarrier', 0)).toBe(true);

    expect(visibleJobs(engine)).toEqual(['quarrier', 'lumberjack', 'settler', 'unemployed']);
  });

  it('moves a job to the end of what the player sees', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.reorderJob('lumberjack', 2)).toBe(true);

    expect(visibleJobs(engine)).toEqual(['quarrier', 'settler', 'lumberjack', 'unemployed']);
  });

  it('keeps every job in the order after a move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    engine.reorderJob('lumberjack', 2);

    expect([...engine.getState().jobOrder].sort()).toEqual(
      [...DEFAULT_JOB_ORDER].sort(),
    );
  });

  it('does not move a job to the place it already has', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.reorderJob('quarrier', 1)).toBe(false);
    expect(visibleJobs(engine)).toEqual(['lumberjack', 'quarrier', 'settler', 'unemployed']);
  });

  it('does not move a job to a place that is not there', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'quarry'],
      jobOrder: normalizedDefaultOrder,
    }));

    expect(engine.reorderJob('lumberjack', 4)).toBe(false);
    expect(engine.reorderJob('lumberjack', -1)).toBe(false);
    expect(visibleJobs(engine)).toEqual(['lumberjack', 'quarrier', 'settler', 'unemployed']);
  });

  it('does not move a job the world does not have', () => {
    const engine = new GameEngine();

    expect(engine.reorderJob('dragon', 0)).toBe(false);
  });

  it('counts the places among the jobs on screen', () => {
    // The lumberjack is not available, so it is not on screen. The farmer
    // moves to the place of the quarrier, the first job on screen.
    const engine = new GameEngine(createTestWorld({
      buildings: ['quarry', 'farm'],
      jobOrder: ['lumberjack', 'quarrier', 'farmer', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    expect(visibleJobs(engine)).toEqual(['quarrier', 'farmer', 'settler', 'unemployed']);

    engine.reorderJob('farmer', 0);

    expect(visibleJobs(engine)).toEqual(['farmer', 'quarrier', 'settler', 'unemployed']);
  });

  it('leaves a job that is not on screen where it was', () => {
    // The lumberjack is not on screen, so the move does not change its place
    // in the full order.
    const engine = new GameEngine(createTestWorld({
      buildings: ['quarry', 'farm'],
      jobOrder: ['lumberjack', 'quarrier', 'farmer', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    engine.reorderJob('farmer', 0);

    expect(engine.getState().jobOrder.slice(0, 4)).toEqual([
      'lumberjack',
      'farmer',
      'quarrier',
      'merchant',
    ]);
  });
});

describe('which jobs the player sees', () => {
  it('hides a job whose building has not been built', () => {
    expect(isJobAvailable('lumberjack', {})).toBe(false);
    expect(isJobAvailable('lumberjack', { lumberjack: 1 })).toBe(true);
  });

  it('always shows a job that has no building', () => {
    expect(isJobAvailable('unemployed', {})).toBe(true);
    expect(isJobAvailable('settler', {})).toBe(true);
  });

  it('shows the available jobs in the priority order', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'lumberjack', 'quarrier', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    expect(visibleJobs(engine)).toEqual(['farmer', 'lumberjack', 'settler', 'unemployed']);
  });
});

describe('the priority order through a save', () => {
  it('keeps the order through a round trip', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'lumberjack', 'quarrier', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    const payload = serializeState(engine.getState());
    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder).toEqual([
      'farmer',
      'lumberjack',
      'quarrier',
      'merchant',
      'ceramist',
      'chief',
      'copper_miner',
      'tin_miner',
      'bronze_caster',
      'settler',
      'unemployed',
    ]);
  });

  it('keeps the order after a move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'lumberjack', 'quarrier', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    engine.moveJob('farmer', 1);

    const loaded = deserializePayload(serializeState(engine.getState()));

    expect(loaded.jobOrder[0]).toBe('lumberjack');
    expect(loaded.jobOrder[1]).toBe('farmer');
  });

  it('keeps the order after a drag', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'lumberjack', 'quarrier', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'],
    }));

    engine.reorderJob('farmer', 1);

    const loaded = deserializePayload(serializeState(engine.getState()));

    expect(loaded.jobOrder.slice(0, 4)).toEqual([
      'lumberjack',
      'farmer',
      'quarrier',
      'merchant',
    ]);
  });

  it('uses the starting order for a save that has none', () => {
    const engine = new GameEngine();
    const payload = serializeState(engine.getState());

    delete payload.jobOrder;

    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder).toEqual(normalizedDefaultOrder);
  });

  it('drops a job the game does not know about', () => {
    const engine = new GameEngine();
    const payload = serializeState(engine.getState());

    payload.jobOrder = ['dragon', 'lumberjack', 'quarrier', 'farmer', 'merchant', 'ceramist', 'chief', 'copper_miner', 'tin_miner', 'bronze_caster', 'settler', 'unemployed'];

    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder).not.toContain('dragon');
    expect([...loaded.jobOrder].sort()).toEqual([...DEFAULT_JOB_ORDER].sort());
  });

  it('puts a job the save forgot back at the end', () => {
    const engine = new GameEngine();
    const payload = serializeState(engine.getState());

    payload.jobOrder = ['lumberjack'];

    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder[0]).toBe('lumberjack');
    expect([...loaded.jobOrder].sort()).toEqual([...DEFAULT_JOB_ORDER].sort());
  });
});
