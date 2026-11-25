import { createSignal, onSettled } from 'solid-js';
import { getGameState } from './useGameState.js';
import {
  clearLocalSave,
  createEnvelope,
  deserializePayload,
  exportEnvelopeToFile,
  readEnvelopeFromFile,
  readLocalSave,
  serializeState,
  writeLocalSave,
} from '../systems/saveSystem.js';
import type { LoadResult, SaveResult } from '../systems/saveSystem.js';

/** How often the game writes its autosave. */
export const AUTOSAVE_INTERVAL_MS = 60_000;

/** The kind of message shown under the data controls. */
export type SaveStatusKind = 'info' | 'error' | 'warning';

export interface SaveStatus {
  kind: SaveStatusKind;
  text: string;
}

// The signals live at module scope so the settings panel and the game loop
// share one source of truth, the same way `useSettings` does.
const [lastSavedAt, setLastSavedAt] = createSignal<string | undefined>(undefined);
const [saveStatus, setSaveStatus] = createSignal<SaveStatus | undefined>(undefined);

/**
 * True while the autosave is held off.
 *
 * A hard reset empties the world but keeps the saved game, so the player can
 * load their old world back. The autosave stays off until they save or load
 * by hand, because otherwise the next autosave would overwrite the save they
// kept with the empty world.
 */
const [autosaveSuspended, setAutosaveSuspended] = createSignal(false);

/**
 * True while a save or a load is running.
 *
 * The controls that would start one are disabled while this is true, so a
 * player cannot start a load in the middle of a save.
 */
const [busy, setBusy] = createSignal(false);

/**
 * The tail of the queue of save operations.
 *
 * Every operation waits for the one before it, so a save and a load can never
 * overlap. Two overlapping operations would race: the save would write the
 * world it captured while the load put a different world in place, and the
 * save would win.
 */
let queue: Promise<unknown> = Promise.resolve();

/**
 * How many operations are queued or running.
 *
 * The count is what the busy flag reports. A count rather than a flag,
 * because a queued operation is already on its way, and the controls should
 * stay disabled until the last one is done.
 */
let pending = 0;

/**
 * Run an operation once every earlier operation has finished.
 */
const runExclusive = <T>(operation: () => Promise<T>): Promise<T> => {
  pending++;
  setBusy(true);

  const result = queue.then(operation, operation);

  queue = result.then(
    () => undefined,
    () => undefined,
  );

  return result.finally(() => {
    pending--;

    if (pending === 0) {
      setBusy(false);
    }
  });
};

/**
 * Restore the game from the autosave, if there is one.
 *
 * A missing save is not an error; it just means the game is new. A damaged
 * one is reported, and the game starts fresh rather than refusing to run.
 */
const restoreOnBoot = async (): Promise<void> => {
  const gameState = getGameState();
  const result = await readLocalSave();

  if (!result.ok) {
    if (result.code !== 'no-save') {
      setSaveStatus({ kind: 'error', text: result.error });
    }

    return;
  }

  gameState.loadState(deserializePayload(result.envelope.state));
  setLastSavedAt(result.envelope.savedAt);

  if (result.warning) {
    setSaveStatus({ kind: 'warning', text: result.warning });
  }
};

/**
 * Save the current game to local storage.
 *
 * The write is not instant: the payload is compressed before it reaches
 * local storage. Operations are queued, so a load that is asked for while a
 * save is running waits for it instead of racing it.
 */
const saveNow = async (): Promise<SaveResult> =>
  runExclusive(async () => {
    const gameState = getGameState();
    const envelope = createEnvelope(serializeState(gameState.gameEngine.getState()));

    const result = await writeLocalSave(envelope);

    if (result.ok) {
      setLastSavedAt(result.savedAt);
      setAutosaveSuspended(false);
      setSaveStatus({ kind: 'info', text: 'Game saved.' });
    } else {
      setSaveStatus({ kind: 'error', text: result.error });
    }

    return result;
  });

/**
 * Load the autosave from local storage.
 */
const loadNow = async (): Promise<LoadResult> =>
  runExclusive(async () => {
    const gameState = getGameState();

    const result = await readLocalSave();

    if (!result.ok) {
      setSaveStatus({ kind: 'error', text: result.error });

      return result;
    }

    gameState.loadState(deserializePayload(result.envelope.state));
    setLastSavedAt(result.envelope.savedAt);
    setAutosaveSuspended(false);
    setSaveStatus({
      kind: result.warning ? 'warning' : 'info',
      text: result.warning ?? 'Game loaded.',
    });

    return result;
  });

/**
 * Write the current game to a file the player can keep.
 */
const exportToFile = async (): Promise<void> =>
  runExclusive(async () => {
    const gameState = getGameState();
    const envelope = createEnvelope(serializeState(gameState.gameEngine.getState()));

    try {
      const fileName = await exportEnvelopeToFile(envelope);

      setSaveStatus({ kind: 'info', text: `Saved to ${fileName}.` });
    } catch {
      setSaveStatus({ kind: 'error', text: 'The game could not write the save file.' });
    }
  });

/**
 * Load a game from a file the player picked.
 */
const importFromFile = async (file: File): Promise<LoadResult> =>
  runExclusive(async () => {
    const gameState = getGameState();

    const result = await readEnvelopeFromFile(file);

    if (!result.ok) {
      setSaveStatus({ kind: 'error', text: result.error });

      return result;
    }

    gameState.loadState(deserializePayload(result.envelope.state));
    setLastSavedAt(result.envelope.savedAt);
    setAutosaveSuspended(false);
    setSaveStatus({
      kind: result.warning ? 'warning' : 'info',
      text: result.warning ?? 'Game imported.',
    });

    return result;
  });

/**
 * Delete the autosave from this browser.
 */
const deleteSave = (): void => {
  clearLocalSave();
  setLastSavedAt(undefined);
  setAutosaveSuspended(false);
  setSaveStatus({ kind: 'info', text: 'Saved game deleted from this browser.' });
};

/**
 * Throw the world away and start a new one.
 *
 * The saved game stays where it is, so the old world can still be loaded back.
 * The autosave is held off until the player saves or loads by hand, because
 * otherwise it would overwrite the kept save with the empty world.
 */
const hardReset = (): void => {
  const gameState = getGameState();

  gameState.resetState();
  setAutosaveSuspended(true);
  setSaveStatus({
    kind: 'warning',
    text: 'The world was reset. The saved game is still here, so you can load it back.',
  });
};

/**
 * The save controls and the status they report.
 *
 * The actions live at module scope, so every caller drives the same save.
 */
export const useSaveActions = () => ({
  lastSavedAt,
  saveStatus,
  autosaveSuspended,
  busy,
  saveNow,
  loadNow,
  exportToFile,
  importFromFile,
  deleteSave,
  hardReset,
});

/**
 * Start the autosave loop and restore the last save.
 *
 * The game also saves when the tab is hidden or closed, so a session that
 * ends between two autosaves does not lose more than a moment of progress.
 *
 * Call this once, from the component that owns the game loop. Components
 * that only need the controls use `useSaveActions` instead, so the autosave
 * timer is never started twice.
 */
export const useSaveSystem = () => {
  // `onSettled` is the Solid 2 replacement for `onMount`: it runs once after
  // the first render, and it takes the cleanup as its return value.
  onSettled(() => {
    void restoreOnBoot();

    const autosaveId = window.setInterval(() => {
      if (autosaveSuspended()) {
        return;
      }

      void saveNow();
    }, AUTOSAVE_INTERVAL_MS);

    const flushSave = () => {
      if (autosaveSuspended()) {
        return;
      }

      void saveNow();
    };

    // Only the hidden transition is worth a save; coming back to the tab
    // does not change the world.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSave();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushSave);

    return () => {
      window.clearInterval(autosaveId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushSave);
    };
  });

  return useSaveActions();
};
