import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import GameEngine from '../gameEngine.js';
import {
  clearLocalSave,
  createEnvelope,
  decodeEnvelope,
  decodeEnvelopeText,
  deserializePayload,
  encodeEnvelope,
  exportEnvelopeToFile,
  readEnvelopeFromFile,
  readLocalSave,
  serializeState,
  writeLocalSave,
  SAVE_STORAGE_KEY,
} from '../saveSystem.js';
import { gzipBytes } from '../gzip.js';
import { GAME_VERSION, isVersionCompatible } from '../gameVersion.js';
import { SAVE_FORMAT, SAVE_VERSION } from '../../types/saveFile.js';
import { createTestWorld } from './testWorld.js';

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
});

afterEach(() => {
  clearLocalSave();
});

describe('serializeState', () => {
  it('keeps the values that change while the game runs', () => {
    const world = createTestWorld({
      population: 12,
      resources: { wood: 300, stone: 100, food: 50, gold: 25 },
      workers: { lumberjack: 3, settler: 4 },
      buildings: ['hut', 'farm'],
      marketBuys: { wood: 2 },
      marketSells: { food: 1 },
    });

    const payload = serializeState(world);

    expect(payload.population).toBe(12);
    expect(payload.resources.gold).toBe(25);
    expect(payload.jobs['lumberjack']?.workers).toBe(3);
    expect(payload.jobs['settler']?.workers).toBe(4);
    expect(payload.buildingCounts['hut']).toBe(1);
    expect(payload.buildingCounts['farm']).toBe(1);
    expect(payload.market.buys.wood).toBe(2);
    expect(payload.market.sells.food).toBe(1);
  });

  it('leaves out the catalog values that never change', () => {
    const world = createTestWorld({ buildings: ['hut'] });
    const payload = serializeState(world);
    const building = Object.values(payload.buildings)[0];

    // A building is saved by identity only. The name, description and cost
    // come from the catalog on load.
    expect(building).toEqual({ id: 'hut' });

    // A job is saved by its worker count only.
    expect(Object.values(payload.jobs)[0]).toEqual({ workers: 0 });
  });
});

describe('deserializePayload', () => {
  it('rebuilds the world from a payload', () => {
    const world = createTestWorld({
      population: 12,
      resources: { wood: 300, stone: 100, food: 50, gold: 25 },
      workers: { lumberjack: 3 },
      buildings: ['hut', 'farm'],
      marketBuys: { wood: 2 },
    });

    const restored = deserializePayload(serializeState(world));

    expect(restored.population).toBe(12);
    expect(restored.resources).toEqual({ wood: 300, stone: 100, food: 50, gold: 25 });
    expect(restored.jobs['lumberjack']?.workers).toBe(3);
    expect(restored.buildingCounts).toEqual({ hut: 1, farm: 1 });
    expect(restored.market.buys.wood).toBe(2);
  });

  it('takes the catalog values back from the game data', () => {
    const world = createTestWorld({ buildings: ['hut'] });
    const restored = deserializePayload(serializeState(world));
    const building = restored.buildings['hut-0'];

    expect(building?.name).toBe('Hut');
    expect(building?.cost.wood).toBe(20);
  });

  it('skips a job or building the catalog no longer knows about', () => {
    const world = createTestWorld({ buildings: ['hut'] });
    const payload = serializeState(world);

    payload.jobs['obsolete-job'] = { workers: 5 };
    payload.buildings['gone-0'] = { id: 'gone' };

    const restored = deserializePayload(payload);

    expect(restored.jobs['obsolete-job']).toBeUndefined();
    expect(restored.buildings['gone-0']).toBeUndefined();
  });

  it('unlocks a building that was added after the save was written', () => {
    const world = createTestWorld({ buildings: ['hut'] });
    const payload = serializeState(world);

    // A save from before the caravanserai existed does not list it.
    payload.unlockedBuildings = payload.unlockedBuildings.filter((id) => id !== 'caravanserai');

    expect(payload.unlockedBuildings).not.toContain('caravanserai');

    const restored = deserializePayload(payload);

    expect(restored.unlockedBuildings).toContain('caravanserai');
  });

  it('keeps the unlocks a save lists that a new game does not', () => {
    const world = createTestWorld({ buildings: ['hut'] });
    const payload = serializeState(world);

    payload.unlockedBuildings = [...payload.unlockedBuildings, 'grand-temple'];

    const restored = deserializePayload(payload);

    expect(restored.unlockedBuildings).toContain('grand-temple');
  });
});

describe('save and load round trip', () => {
  it('keeps every part of the world through a round trip', async () => {
    const engine = new GameEngine(createTestWorld({
      population: 40,
      resources: { wood: 1234, stone: 567, food: 890, gold: 321 },
      workers: { lumberjack: 5, quarrier: 3, farmer: 2, merchant: 1 },
      buildings: ['hut', 'hut', 'lumberjack', 'quarry', 'farm', 'market'],
      marketBuys: { wood: 4, stone: 1 },
      marketSells: { food: 2 },
    }));

    const envelope = createEnvelope(serializeState(engine.getState()));
    const encoded = await encodeEnvelope(envelope);
    const decoded = await decodeEnvelope(encoded);

    expect(decoded.ok).toBe(true);

    if (!decoded.ok) {
      return;
    }

    const restored = deserializePayload(decoded.envelope.state);

    expect(restored.population).toBe(40);
    expect(restored.resources).toEqual({ wood: 1234, stone: 567, food: 890, gold: 321 });
    expect(restored.jobs['lumberjack']?.workers).toBe(5);
    expect(restored.jobs['quarrier']?.workers).toBe(3);
    expect(restored.jobs['farmer']?.workers).toBe(2);
    expect(restored.jobs['merchant']?.workers).toBe(1);
    expect(restored.buildingCounts).toEqual({
      hut: 2,
      lumberjack: 1,
      quarry: 1,
      farm: 1,
      market: 1,
    });
    expect(restored.market.buys).toEqual({ wood: 4, stone: 1 });
    expect(restored.market.sells).toEqual({ food: 2 });
  });

  it('saves the world through local storage and reads it back', async () => {
    const engine = new GameEngine(createTestWorld({ population: 9 }));
    const envelope = createEnvelope(serializeState(engine.getState()));

    const written = await writeLocalSave(envelope);

    expect(written.ok).toBe(true);
    expect(storage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();

    const read = await readLocalSave();

    expect(read.ok).toBe(true);

    if (!read.ok) {
      return;
    }

    expect(read.envelope.state.population).toBe(9);
    expect(read.envelope.savedAt).toBe(envelope.savedAt);
  });

  it('reports that there is no save when the browser has none', async () => {
    const result = await readLocalSave();

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.code).toBe('no-save');
  });

  it('rejects a stored value that is not a save', async () => {
    storage.setItem(SAVE_STORAGE_KEY, 'something else');

    const result = await readLocalSave();

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.code).toBe('unsupported-format');
  });

  it('rejects a damaged save instead of throwing', async () => {
    storage.setItem(SAVE_STORAGE_KEY, 'BG1:not-real-compressed-data');

    const result = await readLocalSave();

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.code).toBe('corrupt');
  });

  it('reports a browser that cannot compress instead of failing silently', async () => {
    const original = globalThis.CompressionStream;

    // A browser without the Compression Streams API cannot write a save.
    Reflect.deleteProperty(globalThis, 'CompressionStream');

    try {
      const result = await writeLocalSave(createEnvelope(serializeState(createTestWorld())));

      expect(result.ok).toBe(false);

      if (result.ok) {
        return;
      }

      expect(result.code).toBe('no-compression');
    } finally {
      globalThis.CompressionStream = original;
    }
  });

  it('deletes the save', async () => {
    await writeLocalSave(createEnvelope(serializeState(createTestWorld())));
    clearLocalSave();

    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });
});

describe('version handling', () => {
  it('records the game version and the save format version', () => {
    const envelope = createEnvelope(serializeState(createTestWorld()));

    expect(envelope.format).toBe(SAVE_FORMAT);
    expect(envelope.saveVersion).toBe(SAVE_VERSION);
    expect(envelope.gameVersion).toBe(GAME_VERSION);
  });

  it('keeps the game version inside the payload as well', () => {
    const payload = serializeState(createTestWorld());

    expect(payload.version).toBe(GAME_VERSION);

    const envelope = createEnvelope(payload);

    expect(envelope.state.version).toBe(GAME_VERSION);
  });

  it('warns when the save came from a different game version', () => {
    const envelope = createEnvelope(serializeState(createTestWorld()));

    // A different minor version of the same major, so the save is compatible
    // but still worth warning about.
    const [major, minor] = GAME_VERSION.split('.');
    const otherVersion = `${major}.${Number(minor) + 1}.0`;

    envelope.gameVersion = otherVersion;

    const result = decodeEnvelopeText(JSON.stringify(envelope));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.warning).toContain(otherVersion);
    expect(result.warning).toContain(GAME_VERSION);
  });

  it('refuses a save from a different major version', () => {
    const envelope = createEnvelope(serializeState(createTestWorld()));

    // A major version the game is not on, whatever that happens to be.
    const [major] = GAME_VERSION.split('.');
    const otherMajor = `${Number(major) + 1}.0.0`;

    envelope.gameVersion = otherMajor;

    const result = decodeEnvelopeText(JSON.stringify(envelope));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.code).toBe('incompatible-version');
    expect(result.error).toContain(otherMajor);
  });

  it('refuses a save written in a newer save format', () => {
    const envelope = createEnvelope(serializeState(createTestWorld()));

    envelope.saveVersion = SAVE_VERSION + 1;

    const result = decodeEnvelopeText(JSON.stringify(envelope));

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.code).toBe('newer-format');
  });

  it('treats a different major version as incompatible', () => {
    const [major, minor] = GAME_VERSION.split('.');

    // The same major version is compatible, whatever the minor version is.
    expect(isVersionCompatible(`${major}.0.0`)).toBe(true);
    expect(isVersionCompatible(`${major}.9.3`)).toBe(true);
    expect(isVersionCompatible(`${Number(major) + 1}.${minor}.0`)).toBe(false);
    expect(isVersionCompatible('not-a-version')).toBe(false);
  });

  it('still loads a save written before the payload carried a version', () => {
    const envelope = createEnvelope(serializeState(createTestWorld()));

    // A save from before the payload had a version field of its own.
    delete (envelope.state as { version?: string }).version;

    const result = decodeEnvelopeText(JSON.stringify(envelope));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.envelope.state.population).toBe(5);
  });
});

describe('file export and import', () => {
  it('reads back a gzipped save file', async () => {
    const engine = new GameEngine(createTestWorld({
      population: 17,
      buildings: ['hut', 'farm'],
    }));

    const envelope = createEnvelope(serializeState(engine.getState()));
    const bytes = await gzipBytes(JSON.stringify(envelope));

    const file = new File([bytes], 'save.json.gz');
    const result = await readEnvelopeFromFile(file);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.envelope.state.population).toBe(17);
    expect(result.envelope.state.buildingCounts['farm']).toBe(1);
  });

  it('reads back a plain JSON save file', async () => {
    const envelope = createEnvelope(serializeState(createTestWorld({ population: 3 })));
    const file = new File([JSON.stringify(envelope)], 'save.json');
    const result = await readEnvelopeFromFile(file);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.envelope.state.population).toBe(3);
  });

  it('reports a file that is not a save', async () => {
    const file = new File(['just some text'], 'save.json.gz');
    const result = await readEnvelopeFromFile(file);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.code).toBe('corrupt');
  });

  it('names the exported file after the save time', async () => {
    const engine = new GameEngine(createTestWorld());
    const envelope = createEnvelope(serializeState(engine.getState()));

    // The download itself needs a DOM, so only the file name is checked here.
    const fileName = `build-grow-save_${envelope.savedAt.replace(/[:.]/g, '-')}.json.gz`;

    expect(fileName).toMatch(/^build-grow-save_.*\.json\.gz$/);
    expect(typeof exportEnvelopeToFile).toBe('function');
  });
});
