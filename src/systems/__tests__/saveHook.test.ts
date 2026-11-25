import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGameState, resetGameState } from '../../hooks/useGameState.js';
import { useSaveActions } from '../../hooks/useSaveSystem.js';
import { clearLocalSave, decodeEnvelope, SAVE_STORAGE_KEY } from '../saveSystem.js';

/**
 * The tests run in Node, which has no DOM. The save code only touches the
 * DOM for the file download, so the pieces that need a DOM are stubbed here.
 */
const localStorageStub = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  } as Storage;
};

let storage: Storage;

beforeEach(() => {
  storage = localStorageStub();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
  clearLocalSave();
  resetGameState();
});

afterEach(() => {
  clearLocalSave();
  resetGameState();
});

/**
 * The save actions are the same ones the settings panel drives.
 */
describe('saving and loading through the game', () => {
  it('puts the world back to where the save was taken', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    const saved = await saveNow();

    expect(saved.ok).toBe(true);

    const savedCount = gameState.getBuildingCounts()['hut'] ?? 0;

    expect(savedCount).toBeGreaterThan(0);

    // The world moves on: another hut is built.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    expect(gameState.getBuildingCounts()['hut']).toBe(savedCount + 1);

    const loaded = await loadNow();

    expect(loaded.ok).toBe(true);
    expect(gameState.getBuildingCounts()['hut']).toBe(savedCount);
  });

  it('reports that it saved and that it loaded', async () => {
    const gameState = getGameState();
    const { saveStatus, saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    expect(saveStatus()?.text).toBe('Game saved.');

    await loadNow();

    expect(saveStatus()?.text).toBe('Game loaded.');
  });

  it('keeps a building that is still under construction', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');

    // Three ticks is 30% of the construction done.
    gameState.gameEngine.runTicks(3);
    gameState.mirrorEngineState();

    await saveNow();

    gameState.gameEngine.runTicks(4);
    gameState.mirrorEngineState();

    // The building moved on while the game kept running.
    expect(gameState.getBuildings()['hut-0']?.constructionProgress).toBe(70);

    await loadNow();

    // The load puts the construction back to the saved point.
    expect(gameState.getBuildings()['hut-0']?.constructionProgress).toBe(30);
    expect(gameState.getBuildings()['hut-0']?.built).toBe(false);
  });

  it('drops a building that the saved world does not have', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    const savedHuts = Object.values(gameState.getBuildings())
      .filter((building) => building.id === 'hut').length;

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    expect(Object.values(gameState.getBuildings())
      .filter((building) => building.id === 'hut')).toHaveLength(savedHuts + 1);

    await loadNow();

    expect(Object.values(gameState.getBuildings())
      .filter((building) => building.id === 'hut')).toHaveLength(savedHuts);
  });

  it('writes the loaded world on the next autosave', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    // The world moves on with a second hut.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    expect(gameState.getBuildingCounts()['hut']).toBe(2);

    // The load puts the world back to one hut.
    await loadNow();

    expect(gameState.getBuildingCounts()['hut']).toBe(1);

    // The next autosave must write the loaded world, not the world that was
    // loaded over. A stale save here would undo the load on the next reload.
    await saveNow();

    const stored = storage.getItem(SAVE_STORAGE_KEY);

    expect(stored).not.toBeNull();

    const decoded = await decodeEnvelope(stored?.replace('BG1:', '') ?? '');

    expect(decoded.ok).toBe(true);

    if (!decoded.ok) {
      return;
    }

    expect(decoded.envelope.state.buildingCounts['hut']).toBe(1);
    expect(Object.keys(decoded.envelope.state.buildings)).toEqual(['hut-0']);
  });

  it('leaves the engine, the store and the saved file agreeing', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    // The world moves on: a second hut and a market.
    gameState.buildBuilding('hut');
    gameState.buildBuilding('market');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await loadNow();

    const engineState = gameState.gameEngine.getState();
    const stored = storage.getItem(SAVE_STORAGE_KEY);
    const decoded = await decodeEnvelope(stored?.replace('BG1:', '') ?? '');

    expect(decoded.ok).toBe(true);

    if (!decoded.ok) {
      return;
    }

    const payload = decoded.envelope.state;

    // The engine, the store and the saved payload must all hold the same
    // world. A disagreement here is what makes a load look like it worked
    // while the next save undoes it.
    expect(engineState.buildingCounts).toEqual(payload.buildingCounts);
    expect(gameState.getBuildingCounts()).toEqual(payload.buildingCounts);
    expect(Object.keys(engineState.buildings).sort())
      .toEqual(Object.keys(payload.buildings).sort());
    expect(Object.keys(gameState.getBuildings()).sort())
      .toEqual(Object.keys(payload.buildings).sort());
  });

  it('runs a save and a load one after the other, never both at once', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    // The world moves on with a second hut.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    // A save starts against the two-hut world, but the write is not instant.
    const inFlight = saveNow();

    // The load is asked for while that save is still being compressed. It
    // waits its turn rather than racing it, so it reads the file the save
    // just wrote.
    const load = loadNow();

    await Promise.all([inFlight, load]);

    const stored = storage.getItem(SAVE_STORAGE_KEY);
    const decoded = await decodeEnvelope(stored?.replace('BG1:', '') ?? '');

    expect(decoded.ok).toBe(true);

    if (!decoded.ok) {
      return;
    }

    // The load ran last and read what the save wrote, so the world and the
    // file agree.
    expect(gameState.getBuildingCounts()['hut']).toBe(2);
    expect(decoded.envelope.state.buildingCounts['hut']).toBe(2);
  });

  it('runs a load that was asked for first before the save behind it', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    // The world moves on with a second hut.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    // The load is asked for first, so it runs first and reads the one-hut
    // file. The save behind it picks up the world the load restored.
    const load = loadNow();
    const save = saveNow();

    await Promise.all([load, save]);

    expect(gameState.getBuildingCounts()['hut']).toBe(1);

    const stored = storage.getItem(SAVE_STORAGE_KEY);
    const decoded = await decodeEnvelope(stored?.replace('BG1:', '') ?? '');

    expect(decoded.ok).toBe(true);

    if (!decoded.ok) {
      return;
    }

    expect(decoded.envelope.state.buildingCounts['hut']).toBe(1);
  });

  it('reports that it is busy while a save or a load runs', async () => {
    const { busy, saveNow } = useSaveActions();

    expect(busy()).toBe(false);

    const saving = saveNow();

    expect(busy()).toBe(true);

    await saving;

    expect(busy()).toBe(false);
  });

  it('throws the world away on a hard reset', async () => {
    const gameState = getGameState();
    const { saveNow, hardReset } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    expect(gameState.getBuildingCounts()['hut']).toBe(1);

    hardReset();

    // The world is empty again: no buildings, and the starting resources of
    // a brand new world.
    expect(gameState.getBuildingCounts()['hut']).toBeUndefined();
    expect(gameState.getBuildings()).toEqual({});
    expect(gameState.getResources().wood).toBe(250);
    expect(gameState.getPopulation()).toBe(5);
  });

  it('keeps the saved game through a hard reset, so it can be loaded back', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow, hardReset } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    hardReset();

    expect(gameState.getBuildingCounts()['hut']).toBeUndefined();

    // The old world comes back.
    await loadNow();

    expect(gameState.getBuildingCounts()['hut']).toBe(1);
    expect(gameState.getPopulation()).toBe(5);
  });

  it('holds the autosave off after a hard reset', async () => {
    const gameState = getGameState();
    const { saveNow, hardReset, autosaveSuspended } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    hardReset();

    expect(autosaveSuspended()).toBe(true);

    // Saving by hand ends the hold, because the player has now chosen what
    // the saved game should be.
    await saveNow();

    expect(autosaveSuspended()).toBe(false);
  });

  it('saves, resets and loads back a world with a building still going up', async () => {
    const gameState = getGameState();
    const { saveNow, loadNow, hardReset } = useSaveActions();

    // A hut that is three ticks into its construction, so nothing is
    // finished and the world has no buildings to count.
    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(3);
    gameState.mirrorEngineState();

    expect(gameState.getBuildingCounts()['hut']).toBeUndefined();

    await saveNow();

    hardReset();

    expect(gameState.getBuildings()).toEqual({});

    await loadNow();

    // The building is back, still under construction, at the same progress.
    expect(gameState.getBuildings()['hut-0']?.built).toBe(false);
    expect(gameState.getBuildings()['hut-0']?.constructionProgress).toBe(30);
    expect(gameState.getBuildingCounts()['hut']).toBeUndefined();
  });

  it('writes the save to the browser', async () => {
    const gameState = getGameState();
    const { saveNow } = useSaveActions();

    gameState.buildBuilding('hut');
    gameState.gameEngine.runTicks(20);
    gameState.mirrorEngineState();

    await saveNow();

    const stored = storage.getItem(SAVE_STORAGE_KEY);

    expect(stored).not.toBeNull();
    expect(stored?.startsWith('BG1:')).toBe(true);
  });

  it('reports an error when there is no save to load', async () => {
    const { saveStatus, loadNow } = useSaveActions();

    const result = await loadNow();

    expect(result.ok).toBe(false);
    expect(saveStatus()?.kind).toBe('error');
  });
});
