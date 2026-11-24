import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import {
  DEFAULT_TOOLTIP_DELAY,
  MAX_TOOLTIP_DELAY,
  MIN_TOOLTIP_DELAY,
  useSettings,
} from '../../hooks/useSettings.js';

const SettingsPanel: Component = () => {
  const { settings, setTooltipDelay, resetSettings } = useSettings();

  // The draft holds what the user typed, so a partially typed value (e.g. "2")
  // does not fight the user while they are still editing it. It stays
  // undefined until they type, which lets the input fall back to the stored
  // setting.
  const [draft, setDraft] = createSignal<string | undefined>(undefined);
  const [error, setError] = createSignal('');

  // Read inside JSX, which is a tracking scope. Reading it in the component
  // body would trip Solid's STRICT_READ_UNTRACKED diagnostic.
  const storedDelay = (): number => settings().tooltipDelay;

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
    </div>
  );
};

export default SettingsPanel;
