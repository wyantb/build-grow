import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { useGameLoop } from './hooks/useGameLoop.js';
import { useTheme } from './hooks/useTheme.js';
import ResourcePanel from './components/game/ResourcePanel.js';
import BuildingGrid from './components/game/BuildingGrid.js';
import JobPanel from './components/game/JobPanel.js';
import MarketPanel from './components/game/MarketPanel.js';
import SettingsPanel from './components/game/SettingsPanel.js';
import Tooltip from './components/ui/Tooltip.js';
import type GameEngine from './systems/gameEngine.js';
import type { GameStateReturnType } from './hooks/useGameState.js';

declare global {
  interface Window {
    gameEngine: GameEngine;
    gameState: GameStateReturnType;
  }
}

// A separate component so the theme signal is read inside JSX, which is a
// tracking scope. Reading it directly in a component body is a
// STRICT_READ_UNTRACKED diagnostic in Solid 2.
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

const App: Component = () => {
  // Initialize game state and loop
  const { gameEngine, gameState } = useGameLoop();

  // Tab management
  const [activeTab, setActiveTab] = createSignal<'buildings' | 'jobs' | 'market' | 'settings'>('buildings');

  // Exposed for debugging and for the browser verification suite.
  window.gameEngine = gameEngine;
  window.gameState = gameState;

  return (
    <div class="game-container">
      <header>
        <h1>Fantasy Civilization Builder</h1>
        <ThemeToggle />
      </header>

      <div class="game-content">
        <div class="panel resources-panel">
          <h2>Resources</h2>
          <div id="resources-display">
            <ResourcePanel />
          </div>
        </div>

        <div class="panel main-panel">
          <div class="tabs">
            <button
              class={`tab ${activeTab() === 'buildings' ? 'active' : ''}`}
              onClick={() => setActiveTab('buildings')}
            >
              Buildings
            </button>
            <button
              class={`tab ${activeTab() === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              Jobs
            </button>
            <button
              class={`tab ${activeTab() === 'market' ? 'active' : ''}`}
              onClick={() => setActiveTab('market')}
            >
              Market
            </button>
            <button
              class={`tab ${activeTab() === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>

          <div class="tab-content">
            <div id="buildings-tab" class={`tab-pane ${activeTab() === 'buildings' ? 'active' : ''}`}>
              <h2>Buildings</h2>
              <div id="buildings-list">
                <BuildingGrid />
              </div>
            </div>

            <div id="jobs-tab" class={`tab-pane ${activeTab() === 'jobs' ? 'active' : ''}`}>
              <h2>Jobs</h2>
              <div id="jobs-list">
                <JobPanel />
              </div>
            </div>

            <div id="market-tab" class={`tab-pane ${activeTab() === 'market' ? 'active' : ''}`}>
              <h2>Market</h2>
              <div id="market-content">
                <MarketPanel />
              </div>
            </div>

            <div id="settings-tab" class={`tab-pane ${activeTab() === 'settings' ? 'active' : ''}`}>
              <h2>Settings</h2>
              <div id="settings-content">
                <SettingsPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
