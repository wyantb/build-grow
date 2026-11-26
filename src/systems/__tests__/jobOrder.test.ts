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

describe('the priority order of the jobs', () => {
  it('starts with the order the catalog holds', () => {
    const engine = new GameEngine();

    expect(engine.getState().jobOrder).toEqual(DEFAULT_JOB_ORDER);
  });

  it('holds every job exactly once', () => {
    const engine = new GameEngine();

    expect([...engine.getState().jobOrder].sort()).toEqual(
      [...DEFAULT_JOB_ORDER].sort(),
    );
  });

  it('moves a job up when asked', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    engine.moveJob('settler', -1);

    expect(engine.getState().jobOrder.slice(0, 2)).toEqual(['settler', 'unemployed']);
  });

  it('moves a job down when asked', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    engine.moveJob('unemployed', 1);

    expect(engine.getState().jobOrder.slice(0, 2)).toEqual(['settler', 'unemployed']);
  });

  it('keeps every job in the order after a move', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    engine.moveJob('settler', -1);

    expect([...engine.getState().jobOrder].sort()).toEqual(
      [...DEFAULT_JOB_ORDER].sort(),
    );
  });

  it('does not move the first job up', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.moveJob('unemployed', -1)).toBe(false);
    expect(engine.getState().jobOrder[0]).toBe('unemployed');
  });

  it('does not move the last job down', () => {
    const engine = new GameEngine(createTestWorld({
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.moveJob('lumberjack', 1)).toBe(false);
  });

  it('does not move a job the world does not have', () => {
    const engine = new GameEngine();

    expect(engine.moveJob('dragon', -1)).toBe(false);
  });

  it('moves a job past one that is not on screen', () => {
    // The lumberjack is not available, so it is not on screen. The farmer
    // moves past the unemployed to the top of what the player can see.
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm'],
      jobOrder: ['unemployed', 'lumberjack', 'settler', 'farmer'],
    }));

    expect(visibleJobs(engine)).toEqual(['unemployed', 'settler', 'farmer']);

    engine.moveJob('farmer', -1);

    expect(visibleJobs(engine)).toEqual(['unemployed', 'farmer', 'settler']);
  });

  it('tells the player when a job cannot move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm'],
      jobOrder: ['unemployed', 'lumberjack', 'settler', 'farmer'],
    }));

    // The unemployed is the first job on screen, so it cannot move up.
    expect(engine.moveJob('unemployed', -1)).toBe(false);

    // The farmer is the last one on screen, so it cannot move down.
    expect(engine.moveJob('farmer', 1)).toBe(false);
  });
});

describe('moving a job to a place', () => {
  it('moves a job down to the place it is dropped on', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.reorderJob('unemployed', 1)).toBe(true);

    expect(visibleJobs(engine)).toEqual(['settler', 'unemployed', 'lumberjack']);
  });

  it('moves a job up to the place it is dropped on', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.reorderJob('lumberjack', 0)).toBe(true);

    expect(visibleJobs(engine)).toEqual(['lumberjack', 'unemployed', 'settler']);
  });

  it('moves a job to the end of what the player sees', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.reorderJob('unemployed', 2)).toBe(true);

    expect(visibleJobs(engine)).toEqual(['settler', 'lumberjack', 'unemployed']);
  });

  it('keeps every job in the order after a move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    engine.reorderJob('unemployed', 2);

    expect([...engine.getState().jobOrder].sort()).toEqual(
      [...DEFAULT_JOB_ORDER].sort(),
    );
  });

  it('does not move a job to the place it already has', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.reorderJob('settler', 1)).toBe(false);
    expect(visibleJobs(engine)).toEqual(['unemployed', 'settler', 'lumberjack']);
  });

  it('does not move a job to a place that is not there', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack'],
      jobOrder: ['unemployed', 'settler', 'lumberjack'],
    }));

    expect(engine.reorderJob('unemployed', 3)).toBe(false);
    expect(engine.reorderJob('unemployed', -1)).toBe(false);
    expect(visibleJobs(engine)).toEqual(['unemployed', 'settler', 'lumberjack']);
  });

  it('does not move a job the world does not have', () => {
    const engine = new GameEngine();

    expect(engine.reorderJob('dragon', 0)).toBe(false);
  });

  it('counts the places among the jobs on screen', () => {
    // The lumberjack is not available, so it is not on screen. The farmer
    // moves to the place of the settler, the second job on screen.
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm'],
      jobOrder: ['unemployed', 'lumberjack', 'settler', 'farmer'],
    }));

    expect(visibleJobs(engine)).toEqual(['unemployed', 'settler', 'farmer']);

    engine.reorderJob('farmer', 1);

    expect(visibleJobs(engine)).toEqual(['unemployed', 'farmer', 'settler']);
  });

  it('leaves a job that is not on screen where it was', () => {
    // The lumberjack is not on screen, so the move does not change its place
    // in the full order.
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm'],
      jobOrder: ['unemployed', 'lumberjack', 'settler', 'farmer'],
    }));

    engine.reorderJob('farmer', 0);

    expect(engine.getState().jobOrder.slice(0, 4)).toEqual([
      'farmer',
      'lumberjack',
      'unemployed',
      'settler',
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
      jobOrder: ['farmer', 'unemployed', 'lumberjack', 'settler'],
    }));

    expect(visibleJobs(engine)).toEqual(['farmer', 'unemployed', 'lumberjack', 'settler']);
  });
});

describe('the priority order through a save', () => {
  it('keeps the order through a round trip', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'unemployed', 'lumberjack', 'settler'],
    }));

    const payload = serializeState(engine.getState());
    const loaded = deserializePayload(payload);

    // The jobs the test did not name are at the end, in the starting order.
    expect(loaded.jobOrder).toEqual([
      'farmer',
      'unemployed',
      'lumberjack',
      'settler',
      'quarrier',
      'merchant',
    ]);
  });

  it('keeps the order after a move', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'unemployed', 'lumberjack', 'settler'],
    }));

    engine.moveJob('farmer', 1);

    const loaded = deserializePayload(serializeState(engine.getState()));

    expect(loaded.jobOrder[0]).toBe('unemployed');
    expect(loaded.jobOrder[1]).toBe('farmer');
  });

  it('keeps the order after a drag', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['lumberjack', 'farm'],
      jobOrder: ['farmer', 'unemployed', 'lumberjack', 'settler'],
    }));

    engine.reorderJob('farmer', 2);

    const loaded = deserializePayload(serializeState(engine.getState()));

    expect(loaded.jobOrder.slice(0, 4)).toEqual([
      'unemployed',
      'lumberjack',
      'farmer',
      'settler',
    ]);
  });

  it('uses the starting order for a save that has none', () => {
    const engine = new GameEngine();
    const payload = serializeState(engine.getState());

    delete payload.jobOrder;

    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder).toEqual(DEFAULT_JOB_ORDER);
  });

  it('drops a job the game does not know about', () => {
    const engine = new GameEngine();
    const payload = serializeState(engine.getState());

    payload.jobOrder = ['dragon', 'settler', 'unemployed'];

    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder).not.toContain('dragon');
    expect([...loaded.jobOrder].sort()).toEqual([...DEFAULT_JOB_ORDER].sort());
  });

  it('puts a job the save forgot back at the end', () => {
    const engine = new GameEngine();
    const payload = serializeState(engine.getState());

    payload.jobOrder = ['settler'];

    const loaded = deserializePayload(payload);

    expect(loaded.jobOrder[0]).toBe('settler');
    expect([...loaded.jobOrder].sort()).toEqual([...DEFAULT_JOB_ORDER].sort());
  });
});
