import { createSignal, createEffect } from 'solid-js'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'build-grow:theme'
const DEFAULT_THEME: Theme = 'light'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

const readStoredTheme = (): Theme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

/**
 * Theme is applied by toggling the `light-mode` class on <body>, which is what
 * the stylesheet keys its light-theme overrides off.
 */
export const useTheme = () => {
  const [theme, setTheme] = createSignal<Theme>(readStoredTheme() ?? DEFAULT_THEME)

  const applyTheme = (next: Theme) => {
    document.body.classList.toggle('light-mode', next === 'light')
  }

  // Applied synchronously so the first paint already uses the right theme.
  applyTheme(theme())

  createEffect(() => {
    const current = theme()
    applyTheme(current)
    try {
      localStorage.setItem(STORAGE_KEY, current)
    } catch {
      // Storage can be unavailable (private mode, disabled cookies); the theme
      // still applies for this session.
    }
  })

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme }
}
