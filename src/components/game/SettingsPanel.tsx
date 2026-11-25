import { createMemo, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import {
  DEFAULT_TOOLTIP_DELAY,
  MAX_TOOLTIP_DELAY,
  MIN_TOOLTIP_DELAY,
  useSettings,
} from '../../hooks/useSettings.js';
import { AUTOSAVE_INTERVAL_MS, useSaveActions } from '../../hooks/useSaveSystem.js';
import { formatDateTime } from '../../utils/formatDateTime.js';

const SettingsPanel: Component = () => {
  const { settings, setTooltipDelay, resetSettings } = useSettings();
  const {
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
  } = useSaveActions();

  // The draft holds what the user typed, so a partially typed value (e.g. "2")
  // does not fight the user while they are still editing it. It stays
  // undefined until they type, which lets the input fall back to the stored
  // setting.
  const [draft, setDraft] = createSignal<string | undefined>(undefined);
  const [error, setError] = createSignal('');

  // The hard reset takes two clicks, so a stray click cannot throw the world
  // away. The first click arms it; the second one does it.
  const [resetArmed, setResetArmed] = createSignal(false);

  // Read inside JSX, which is a tracking scope. Reading it in the component
  // body would trip Solid's STRICT_READ_UNTRACKED diagnostic.
  const storedDelay = (): number => settings().tooltipDelay;

  // The save time is shown in the player's own timezone, with the UTC
  // offset, so the reading says which zone it belongs to.
  const lastSavedLabel = createMemo(() => {
    const savedAt = lastSavedAt();

    return savedAt ? formatDateTime(savedAt) : 'Not saved yet';
  });

  const commit = (raw: string) => {
    setDraft(raw);

    const trimmed = raw.trim();

    if (trimmed === '') {
      setError('Enter a delay in milliseconds.');

      return;
    }

    const parsed = Number(trimmed);

    if (!Number.isFinite(parsed)) {
      setError('Enter a number of milliseconds.');

      return;
    }

    if (parsed < MIN_TOOLTIP_DELAY || parsed > MAX_TOOLTIP_DELAY) {
      setError(`Use a value between ${MIN_TOOLTIP_DELAY} and ${MAX_TOOLTIP_DELAY} ms.`);

      return;
    }

    setError('');
    setTooltipDelay(parsed);
  };

  const reset = () => {
    resetSettings();
    setDraft(undefined);
    setError('');
  };

  const armReset = () => {
    setResetArmed(true);
  };

  const confirmReset = () => {
    hardReset();
    setResetArmed(false);
  };

  return (
    <div class="settings-panel">
      <h2>Settings</h2>
      <p class="settings-intro">
        Preferences are saved to this browser and apply immediately.
      </p>

      <div class="settings-section">
        <h3>Tooltips</h3>

        <div class="settings-row">
          <label class="settings-label" for="tooltip-delay">
            Tooltip delay
          </label>

          <div class="settings-input-group">
            <input
              id="tooltip-delay"
              class="settings-input"
              type="number"
              inputmode="numeric"
              min={MIN_TOOLTIP_DELAY}
              max={MAX_TOOLTIP_DELAY}
              step="10"
              value={draft() ?? storedDelay()}
              onInput={(event) => commit(event.currentTarget.value)}
              aria-describedby="tooltip-delay-help"
            />
            <span class="settings-unit">ms</span>
          </div>
        </div>

        <p id="tooltip-delay-help" class="settings-help">
          How long to wait before a tooltip appears when hovering or focusing.
          The default is {DEFAULT_TOOLTIP_DELAY} ms. Set it to 0 to show tooltips immediately.
        </p>

        <Show when={error()}>
          <p class="settings-error" role="alert">{error()}</p>
        </Show>

        <div class="settings-actions">
          <button class="settings-button" type="button" onClick={reset}>
            Reset to default
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Data</h3>

        <p class="settings-intro">
          The game saves itself to this browser every {AUTOSAVE_INTERVAL_MS / 1000} seconds.
          You can also save by hand, move a game between browsers with a file, or start over.
        </p>

        <div class="settings-row">
          <span class="settings-label">Last saved</span>
          <span class="settings-value">{lastSavedLabel()}</span>
        </div>

        <div class="settings-actions">
          <button
            class="settings-button"
            type="button"
            disabled={busy()}
            onClick={() => void saveNow()}
          >
            Save now
          </button>

          <button
            class="settings-button"
            type="button"
            disabled={busy()}
            onClick={() => void loadNow()}
          >
            Load saved game
          </button>

          <button
            class="settings-button"
            type="button"
            disabled={busy()}
            onClick={() => void exportToFile()}
          >
            Export to file
          </button>

          <label class={{ 'settings-button': true, 'settings-file-button': true, 'settings-button-disabled': busy() }}>
            Import from file
            <input
              id="save-file-input"
              class="settings-file-input"
              type="file"
              accept=".gz,.json,application/gzip,application/json"
              disabled={busy()}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];

                if (file) {
                  void importFromFile(file);
                }

                event.currentTarget.value = '';
              }}
            />
          </label>

          <button class="settings-button settings-button-danger" type="button" onClick={deleteSave}>
            Delete saved game
          </button>
        </div>

        <Show when={saveStatus()}>
          {(status) => (
            <p
              class={`settings-status settings-status-${status().kind}`}
              role="status"
            >
              {status().text}
            </p>
          )}
        </Show>

        <p class="settings-help">
          Loading a saved game replaces the world you are playing now. Exporting writes a
          compressed file you can keep or move to another browser; importing reads it back.
        </p>
      </div>

      <div class="settings-section">
        <h3>Hard reset</h3>

        <p class="settings-intro">
          Start the world over from nothing. The saved game is kept, so you can load it back
          if you change your mind.
        </p>

        <Show
          when={resetArmed()}
          fallback={
            <div class="settings-actions">
              <button
                class="settings-button settings-button-danger"
                type="button"
                onClick={armReset}
              >
                Hard reset
              </button>
            </div>
          }
        >
          <div class="settings-actions">
            <button
              class="settings-button settings-button-danger"
              type="button"
              onClick={confirmReset}
            >
              Really hard reset?
            </button>

            <button
              class="settings-button"
              type="button"
              onClick={() => setResetArmed(false)}
            >
              Cancel
            </button>
          </div>

          <p class="settings-help">
            This empties the world you are playing. The saved game stays in this browser
            until you save over it.
          </p>
        </Show>

        <Show when={autosaveSuspended()}>
          <p class="settings-status settings-status-warning" role="status">
            The autosave is on hold until you save or load by hand.
          </p>
        </Show>
      </div>
    </div>
  );
};

export default SettingsPanel;
