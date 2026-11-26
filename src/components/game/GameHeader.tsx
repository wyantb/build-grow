import { createMemo, createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { useSettings } from '../../hooks/useSettings.js';
import { useTheme } from '../../hooks/useTheme.js';
import { formatCalendarDate } from '../../systems/calendar.js';
import { GAME_VERSION } from '../../systems/gameVersion.js';
import Tooltip from '../ui/Tooltip.js';
import { DEBUG, nextGameSpeed } from '../../utils/debug.js';

const DEBUG_RESOURCE_AMOUNT = 2000;

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

const GameSpeedToggle: Component = () => {
  const gameState = getGameState();
  const [speed, setSpeed] = createSignal(1);

  const cycleSpeed = () => {
    const next = nextGameSpeed(speed());
    setSpeed(next);
    gameState.gameEngine.setTickMultiplier(next);
  };

  return (
    <Tooltip content={`Game speed: ${speed()}x`} placement="bottom">
      <button
        class="game-speed-toggle"
        id="game-speed-toggle"
        type="button"
        onClick={cycleSpeed}
        aria-label={`Game speed: ${speed()}x`}
      >
        <span class="speed-icon">⏱</span>
        <span class="speed-label">{speed()}x</span>
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

        {DEBUG && <GameSpeedToggle />}

        {DEBUG && (
          <Tooltip content="Debug: add 2k of each resource." placement="bottom">
            <button
              class="debug-resources"
              id="debug-resources"
              type="button"
              onClick={() => gameState.gameEngine.debugAddResources(DEBUG_RESOURCE_AMOUNT)}
              aria-label="Debug: add 2k of each resource"
            >
              <span class="debug-icon">(R)</span>
            </button>
          </Tooltip>
        )}

        {DEBUG && (
          <Tooltip content="Debug: print world state." placement="bottom">
            <button
              class="debug-print"
              id="debug-print"
              type="button"
              onClick={() => console.info(gameState.gameEngine.getState())}
              aria-label="Debug: print world state"
            >
              <span class="debug-icon">(P)</span>
            </button>
          </Tooltip>
        )}
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
