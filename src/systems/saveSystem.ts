import { createInitialState } from '../types/worldState.js';
import type { WorldState } from '../types/worldState.js';
import {
  SAVE_FORMAT,
  SAVE_VERSION,
  SaveEnvelopeSchema,
} from '../types/saveFile.js';
import type { SaveEnvelope, SavePayload } from '../types/saveFile.js';
import { JOBS, normalizeJobOrder } from '../data/jobs.js';
import { getBuildingType } from '../data/buildings.js';
import { getSpecies } from '../data/species.js';
import { GAME_VERSION, isVersionCompatible } from './gameVersion.js';
import {
  compressToBase64,
  compressText,
  decompressFromBase64,
  decompressText,
  isCompressionSupported,
} from './compression.js';

/**
 * The localStorage key that holds the autosave.
 */
export const SAVE_STORAGE_KEY = 'build-grow:save';

/**
 * Marks a stored value as a gzipped save.
 *
 * It tells the loader that the value belongs to this game, and it gives the
 * encoding a name that can change if the format does.
 */
const STORAGE_PREFIX = 'BG1:';

/** Why a save could not be read. */
export type SaveErrorCode =
  | 'corrupt'
  | 'unsupported-format'
  | 'newer-format'
  | 'older-format'
  | 'incompatible-version'
  | 'storage-unavailable'
  | 'no-compression'
  | 'no-save';

/** The outcome of reading a save. */
export type LoadResult =
  | {
    ok: true;
    envelope: SaveEnvelope;
    /** Set when the save came from a different build of the game. */
    warning?: string | undefined;
  }
  | {
    ok: false;
    code: SaveErrorCode;
    error: string;
  };

/** The outcome of writing a save. */
export type SaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; code: SaveErrorCode; error: string };

/**
 * A change to the save format.
 *
 * Migrations run in order, each one turning a payload of its own version
 * into the next one. The chain is empty today because the format has only
 * ever had one version.
 */
interface Migration {
  /** The version this migration reads. */
  from: number;
  /** The version this migration produces. */
  to: number;
  migrate: (payload: SavePayload) => SavePayload;
}

const MIGRATIONS: Migration[] = [];

/**
 * Reduce a payload to the current save format.
 *
 * Returns an error when no chain of migrations reaches the current version.
 */
const migratePayload = (
  payload: SavePayload,
  fromVersion: number,
): { payload: SavePayload } | { error: string } => {
  let current = payload;
  let version = fromVersion;

  while (version < SAVE_VERSION) {
    const step = MIGRATIONS.find((migration) => migration.from === version);

    if (!step) {
      return {
        error: `This save uses save format v${version}, which this version of the game cannot read.`,
      };
    }

    current = step.migrate(current);
    version = step.to;
  }

  return { payload: current };
};

/**
 * Reduce a world state to the part of it that changes while the game runs.
 *
 * Job rates, building costs and every other value that comes from the game
 * data is left out, so a balance change applies to an old save instead of
 * being frozen inside it.
 */
export const serializeState = (state: WorldState): SavePayload => {
  const jobs: SavePayload['jobs'] = {};

  for (const [jobId, job] of Object.entries(state.jobs)) {
    jobs[jobId] = { workers: job.workers, species: { ...job.species } };
  }

  // The stats of the species in the world are saved, because they decide
  // what the population produces. The names come from the catalog.
  const species: SavePayload['species'] = {};

  for (const [speciesId, entry] of Object.entries(state.species)) {
    species[speciesId] = { stats: { ...entry.stats }, count: entry.count };
  }

  const buildings: SavePayload['buildings'] = {};

  for (const [instanceKey, building] of Object.entries(state.buildings)) {
    buildings[instanceKey] = { id: building.id };
  }

  return {
    version: state.version,
    tick: state.tick,
    gameTime: state.gameTime,
    population: state.population,
    resources: { ...state.resources },
    defaultJob: state.defaultJob,
    jobs,
    jobOrder: [...state.jobOrder],
    species,
    buildings,
    buildingCounts: { ...state.buildingCounts },
    unlockedBuildings: [...state.unlockedBuildings],
    unlockedJobs: [...state.unlockedJobs],
    market: {
      buys: { ...state.market.buys },
      sells: { ...state.market.sells },
    },
  };
};

/**
 * Rebuild a world state from a saved payload.
 *
 * The catalog supplies everything that does not change; the payload supplies
 * everything that does. A job or building the catalog no longer knows about
 * is dropped, because there is no way to reconstruct it.
 */
export const deserializePayload = (payload: SavePayload): WorldState => {
  const state = createInitialState();

  // The initial state puts the starting population in the default job. A
  // save carries the real numbers, so the defaults are cleared first.
  for (const job of Object.values(state.jobs)) {
    job.workers = 0;
  }

  state.tick = payload.tick;
  state.gameTime = payload.gameTime;
  state.population = payload.population;
  state.resources = { ...payload.resources };
  state.defaultJob = payload.defaultJob;
  state.jobOrder = normalizeJobOrder(payload.jobOrder);

  // A new game starts with a hut, but a save holds the whole set of
  // buildings. The saved ones replace the starting ones, so a world that
  // had no hut does not inherit one.
  state.buildings = {};
  state.buildingCounts = { ...payload.buildingCounts };

  // A save written before a building existed does not list it, so the saved
  // unlocks are merged with the ones a new game starts with. A building that
  // has to be unlocked during play is not in the starting set, so the merge
  // never hands one out early.
  state.unlockedBuildings = [...new Set([
    ...payload.unlockedBuildings,
    ...state.unlockedBuildings,
  ])];
  state.unlockedJobs = [...payload.unlockedJobs];
  state.market = {
    buys: { ...payload.market.buys },
    sells: { ...payload.market.sells },
  };

  for (const [jobId, saved] of Object.entries(payload.jobs)) {
    const catalogJob = JOBS[jobId];

    if (!catalogJob) {
      console.warn(`Save contains unknown job "${jobId}"; it was skipped.`);

      continue;
    }

    state.jobs[jobId] = {
      ...catalogJob,
      workers: saved.workers,
      production: { ...catalogJob.production },
      consumption: { ...catalogJob.consumption },
      species: { ...saved.species },
    };
  }

  // The species roster comes from the save, because the stats decide what
  // the population produces. A save written before the roster existed keeps
  // the stats a new game starts with.
  for (const [speciesId, savedSpecies] of Object.entries(payload.species ?? {})) {
    const catalogSpecies = getSpecies(speciesId);

    if (!catalogSpecies) {
      console.warn(`Save contains unknown species "${speciesId}"; it was skipped.`);

      continue;
    }

    state.species[speciesId] = {
      id: catalogSpecies.id,
      name: catalogSpecies.name,
      description: catalogSpecies.description,
      stats: { ...savedSpecies.stats },
      count: savedSpecies.count ?? 0,
    };
  }

  for (const [instanceKey, saved] of Object.entries(payload.buildings)) {
    const catalogBuilding = getBuildingType(saved.id);

    if (!catalogBuilding) {
      console.warn(`Save contains unknown building "${saved.id}"; it was skipped.`);

      continue;
    }

    state.buildings[instanceKey] = {
      id: catalogBuilding.id,
      name: catalogBuilding.name,
      description: catalogBuilding.description,
      cost: { ...catalogBuilding.cost },
    };
  }

  return state;
};

/**
 * Wrap a payload in a save envelope.
 */
export const createEnvelope = (payload: SavePayload): SaveEnvelope => ({
  format: SAVE_FORMAT,
  saveVersion: SAVE_VERSION,
  gameVersion: GAME_VERSION,
  savedAt: new Date().toISOString(),
  state: payload,
});

/**
 * Encode an envelope as a base64 gzipped string.
 *
 * This is the form stored in localStorage, which holds strings only.
 */
export const encodeEnvelope = async (envelope: SaveEnvelope): Promise<string> =>
  compressToBase64(JSON.stringify(envelope));

/**
 * Decode a base64 gzipped string into an envelope.
 */
export const decodeEnvelope = async (text: string): Promise<LoadResult> => {
  if (!isCompressionSupported()) {
    return {
      ok: false,
      code: 'no-compression',
      error: 'This browser cannot unzip saves. Try a current version of Chrome, Edge or Firefox.',
    };
  }

  let json: string;

  try {
    json = await decompressFromBase64(text);
  } catch {
    return {
      ok: false,
      code: 'corrupt',
      error: 'This save is damaged and cannot be read.',
    };
  }

  return decodeEnvelopeText(json);
};

/**
 * Validate and version-check a decoded envelope.
 *
 * Every failure comes back as a result rather than an exception, so a
 * damaged save shows a message instead of breaking the game.
 */
export const decodeEnvelopeText = (json: string): LoadResult => {
  let envelope: unknown;

  try {
    envelope = JSON.parse(json);
  } catch {
    return {
      ok: false,
      code: 'corrupt',
      error: 'This save is damaged and cannot be read.',
    };
  }

  const parsed = SaveEnvelopeSchema.safeParse(envelope);

  if (!parsed.success) {
    return {
      ok: false,
      code: 'corrupt',
      error: 'This save is damaged and cannot be read.',
    };
  }

  const envelopeData = parsed.data;

  if (envelopeData.saveVersion > SAVE_VERSION) {
    return {
      ok: false,
      code: 'newer-format',
      error: `This save uses save format v${envelopeData.saveVersion}, but this version of the game reads v${SAVE_VERSION}. Update the game to load it.`,
    };
  }

  if (envelopeData.saveVersion < SAVE_VERSION) {
    const migrated = migratePayload(envelopeData.state, envelopeData.saveVersion);

    if ('error' in migrated) {
      return {
        ok: false,
        code: 'older-format',
        error: migrated.error,
      };
    }

    envelopeData.state = migrated.payload;
    envelopeData.saveVersion = SAVE_VERSION;
  }

  if (!isVersionCompatible(envelopeData.gameVersion)) {
    return {
      ok: false,
      code: 'incompatible-version',
      error: `This save was made with version ${envelopeData.gameVersion}, and this game is version ${GAME_VERSION}. The rules changed too much to load it safely.`,
    };
  }

  const warning = envelopeData.gameVersion === GAME_VERSION
    ? undefined
    : `This save was made with version ${envelopeData.gameVersion}; this game is version ${GAME_VERSION}. Balance may differ.`;

  return { ok: true, envelope: envelopeData, warning };
};

/**
 * Write a save to localStorage.
 */
export const writeLocalSave = async (envelope: SaveEnvelope): Promise<SaveResult> => {
  if (!isCompressionSupported()) {
    return {
      ok: false,
      code: 'no-compression',
      error: 'This browser cannot compress saves. Try a current version of Chrome, Edge or Firefox.',
    };
  }

  try {
    const encoded = await encodeEnvelope(envelope);

    localStorage.setItem(SAVE_STORAGE_KEY, STORAGE_PREFIX + encoded);

    return { ok: true, savedAt: envelope.savedAt };
  } catch {
    return {
      ok: false,
      code: 'storage-unavailable',
      error: 'The browser would not let the game write to local storage. It may be full or disabled.',
    };
  }
};

/**
 * Read the autosave from localStorage.
 */
export const readLocalSave = async (): Promise<LoadResult> => {
  let stored: string | null;

  try {
    stored = localStorage.getItem(SAVE_STORAGE_KEY);
  } catch {
    return {
      ok: false,
      code: 'storage-unavailable',
      error: 'The browser would not let the game read from local storage.',
    };
  }

  if (!stored) {
    return {
      ok: false,
      code: 'no-save',
      error: 'There is no saved game in this browser yet.',
    };
  }

  if (!stored.startsWith(STORAGE_PREFIX)) {
    return {
      ok: false,
      code: 'unsupported-format',
      error: 'The stored save is in a format this version of the game cannot read.',
    };
  }

  return decodeEnvelope(stored.slice(STORAGE_PREFIX.length));
};

/**
 * Remove the autosave from localStorage.
 */
export const clearLocalSave = (): void => {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Storage being unavailable is not worth reporting: there is nothing to
    // delete either way.
  }
};

/**
 * The name of the file an exported save is written to.
 */
export const getSaveFileName = (savedAt: string): string => {
  const stamp = savedAt.replace(/[:.]/g, '-');

  return `build-grow-save_${stamp}.json.gz`;
};

/**
 * Write an envelope to a file the player downloads.
 *
 * The file holds the raw gzip bytes, so any tool can open it.
 */
export const exportEnvelopeToFile = async (envelope: SaveEnvelope): Promise<string> => {
  const bytes = await compressText(JSON.stringify(envelope));
  const blob = new Blob([bytes], { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const fileName = getSaveFileName(envelope.savedAt);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);

  return fileName;
};

/**
 * Read an envelope from a file the player picked.
 *
 * The file is normally gzip bytes. Plain JSON is accepted too, so a save
 * that was uncompressed by hand still loads.
 */
export const readEnvelopeFromFile = async (file: File): Promise<LoadResult> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // The gzip magic number. A file that starts with it is compressed.
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

  if (isGzip && !isCompressionSupported()) {
    return {
      ok: false,
      code: 'no-compression',
      error: 'This browser cannot unzip saves. Try a current version of Chrome, Edge or Firefox.',
    };
  }

  try {
    if (isGzip) {
      return decodeEnvelopeText(await decompressText(bytes));
    }

    return decodeEnvelopeText(new TextDecoder().decode(bytes));
  } catch {
    return {
      ok: false,
      code: 'corrupt',
      error: 'This file is not a readable Build & Grow save.',
    };
  }
};
