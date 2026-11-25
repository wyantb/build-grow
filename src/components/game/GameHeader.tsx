import { createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useTheme } from '../../hooks/useTheme.js';
import { formatCalendarDate } from '../../systems/calendar.js';
import { GAME_VERSION } from '../../systems/gameVersion.js';
import Tooltip from '../ui/Tooltip.js';

const ThemeToggle: Component = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip
      content={`Switch to ${theme() === 'light' ? 'dark' : 'light'} mode.`}
      placement="bottom"
      >
      <button
        class="theme-toggle"
        id="theme-toggle"
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme() === 'light' ? 'dark' : 'light'} mode`}
      >
        <span class="theme-icon">{theme() === 'light' ? '🌙' : '☀️'}</span>
      </button>
    </Tooltip>
  );
};

const GameHeader: Component = () => {
  const gameState = getGameState();
  const { isPaused, togglePaused } = useSettings();

  const date = createMemo(() => formatCalendarDate(gameState.getGameTime()));

  return (
    <>
      <div class="header-left">
        <h1>Fantasy Civilization Builder</h1>

        <ThemeToggle />
      </div>

      <div class="header-center">
        <span class="header-date">{date()}</span>

        <Tooltip content={isPaused() ? 'Resume the game.' : 'Pause the game.'} placement="bottom">
          <button
            class="pause-toggle"
            id="pause-toggle"
            type="button"
            onClick={togglePaused}
            aria-label={isPaused() ? 'Resume the game' : 'Pause the game'}
            aria-pressed={isPaused() ? 'true' : 'false'}
          >
            <span class="pause-icon">{isPaused() ? '▶' : '❚❚'}</span>
          </button>
        </Tooltip>
      </div>

      <div class="header-right">
        <span class="header-version">v{GAME_VERSION}</span>
      </div>
    </>
  );
};

export default GameHeader;
