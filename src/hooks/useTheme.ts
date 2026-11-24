import { createSignal, createEffect, untrack } from 'solid-js';

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'build-grow:theme';
const DEFAULT_THEME: Theme = 'light';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

const readStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
};

// Module-level so every caller shares one source of truth.
const [theme, setTheme] = createSignal<Theme>(readStoredTheme() ?? DEFAULT_THEME);

// Theme is applied by toggling the `light-mode` class on <body>, which is what
// the stylesheet keys its light-theme overrides off.
const applyTheme = (next: Theme) => {
  document.body.classList.toggle('light-mode', next === 'light');
};

export const useTheme = () => {
  // The first paint must already use the right theme, so apply it up front.
  // `untrack` marks this as a deliberate one-time snapshot: the effect below
  // keeps the class in sync with every later change.
  untrack(() => applyTheme(theme()));

  createEffect(
    () => theme(),
    (current) => {
      applyTheme(current);
      try {
        localStorage.setItem(STORAGE_KEY, current);
      } catch {
        // Storage can be unavailable (private mode, disabled cookies); the theme
        // still applies for this session.
      }
    }
  );

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return { theme, toggleTheme };
};
