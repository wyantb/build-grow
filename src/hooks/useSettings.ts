import { createEffect, createRoot, createSignal, untrack } from 'solid-js';

/**
 * User preferences that are not part of the game simulation.
 *
 * These are persisted to localStorage and shared across the whole app through
 * a single module-level signal, so every consumer sees the same value and a
 * change in one place updates everywhere else.
 */

const STORAGE_KEY = 'build-grow:settings';

export const DEFAULT_TOOLTIP_DELAY = 250;
export const MIN_TOOLTIP_DELAY = 0;
export const MAX_TOOLTIP_DELAY = 2000;

export interface Settings {
  tooltipDelay: number;
  /**
   * True when the game clock is held still.
   *
   * This is a preference rather than part of the world: pausing does not
   * change the game, it only stops the clock, so it lives with the other
   * preferences instead of in a save.
   */
  paused: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  tooltipDelay: DEFAULT_TOOLTIP_DELAY,
  paused: false,
};

const clamp = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_TOOLTIP_DELAY;
  }

  return Math.min(MAX_TOOLTIP_DELAY, Math.max(MIN_TOOLTIP_DELAY, Math.round(value)));
};

const readStoredSettings = (): Partial<Settings> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return {};
    }

    const parsed: unknown = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    const { tooltipDelay, paused } = parsed as Partial<Settings>;
    const settings: Partial<Settings> = {};

    if (typeof tooltipDelay === 'number') {
      settings.tooltipDelay = clamp(tooltipDelay);
    }

    if (typeof paused === 'boolean') {
      settings.paused = paused;
    }

    return settings;
  } catch {
    return {};
  }
};

const [settings, setSettings] = createSignal<Settings>({
  ...DEFAULT_SETTINGS,
  ...readStoredSettings(),
});

// The persistence effect lives at module scope, so it needs a root to own it.
// Without one, Solid reports NO_OWNER_EFFECT and the effect can never be
// disposed.
createRoot(() => {
  createEffect(
    () => settings(),
    (current) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      } catch {
        // Storage can be unavailable (private mode, disabled cookies); the
        // setting still applies for this session.
      }
    },
  );
});

export const useSettings = () => {
  const tooltipDelay = (): number => settings().tooltipDelay;

  const setTooltipDelay = (milliseconds: number) => {
    setSettings((current) => ({ ...current, tooltipDelay: clamp(milliseconds) }));
  };

  const isPaused = (): boolean => settings().paused;

  const setPaused = (paused: boolean) => {
    setSettings((current) => ({ ...current, paused }));
  };

  const togglePaused = () => {
    setSettings((current) => ({ ...current, paused: !current.paused }));
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
  };

  return {
    settings,
    tooltipDelay,
    setTooltipDelay,
    isPaused,
    setPaused,
    togglePaused,
    resetSettings,
  };
};

/**
 * Reads the persisted tooltip delay without creating a reactive dependency.
 *
 * The tooltip layer needs the delay synchronously while positioning a
 * tooltip, which happens outside of any tracking scope.
 */
export const getTooltipDelay = (): number => untrack(() => settings().tooltipDelay);
