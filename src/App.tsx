import { createSignal, createMemo, createEffect, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useGameLoop } from './hooks/useGameLoop.js';
import { getGameState } from './hooks/useGameState.js';
import { useSaveSystem } from './hooks/useSaveSystem.js';
import GameHeader from './components/game/GameHeader.js';
import ResourcePanel from './components/game/ResourcePanel.js';
import BuildingGrid from './components/game/BuildingGrid.js';
import JobPanel from './components/game/JobPanel.js';
import MarketPanel from './components/game/MarketPanel.js';
import RebirthPanel from './components/game/RebirthPanel.js';
import RebirthView from './components/game/RebirthView.js';
import SettingsPanel from './components/game/SettingsPanel.js';
import type GameEngine from './systems/gameEngine.js';
import type { GameStateReturnType } from './hooks/useGameState.js';

declare global {
  interface Window {
    gameEngine: GameEngine;
    gameState: GameStateReturnType;
  }
}

/**
 * The tabs of the village.
 */
type VillageTab = 'buildings' | 'jobs' | 'market' | 'rebirth' | 'settings';

// A separate component so the theme signal is read inside JSX, which is a
// tracking scope. Reading it directly in a component body is a
// STRICT_READ_UNTRACKED diagnostic in Solid 2.
const App: Component = () => {
  // Initialize game state and loop
  const { gameEngine, gameState } = useGameLoop();

  // Start the autosave loop and restore the last save.
  useSaveSystem();

  // Tab management
  const [activeTab, setActiveTab] = createSignal<VillageTab>('buildings');

  // A pending rebirth takes the player out of the village. The view holds
  // no buildings, no jobs and no resources, so it replaces the whole game
  // content rather than sitting in one of its tabs.
  const rebirthing = createMemo(() => gameState.getPendingRebirth() !== null);

  // When a rebirth ends, the player lands back in the village. Reset the
  // active tab to Buildings so they do not land on the rebirth tab pane.
  let wasRebirthing = false;

  createEffect(
    () => rebirthing(),
    (now) => {
      if (wasRebirthing && !now) {
        setActiveTab('buildings');
      }

      wasRebirthing = now;
    },
  );

  // Exposed for debugging and for the browser verification suite.
  window.gameEngine = gameEngine;
  window.gameState = gameState;

  return (
    <div class="game-container">
      <header>
        <GameHeader />
      </header>

      <Show
        when={rebirthing()}
        fallback={<VillageView activeTab={activeTab} setActiveTab={setActiveTab} />}
      >
        <RebirthView />
      </Show>
    </div>
  );
};

/**
 * The village: the resources on the left and the tabs on the right.
 *
 * It is a separate component so the rebirth view can take the player's
 * place without either one having to know about the other.
 */
const VillageView: Component<{
  activeTab: () => VillageTab;
  setActiveTab: (tab: VillageTab) => void;
}> = (props) => {
  // The shared game state, not a second game loop: the loop belongs to the
  // app, and a second one would subscribe twice and stop the engine when
  // this component went away.
  const gameState = getGameState();

  // The market tab only appears once a market has been built.
  const marketBuilt = createMemo(() => (gameState.getBuildingCounts()['market'] ?? 0) > 0);

  // The rebirth tab only appears once the player has the gold for a rebirth.
  const rebirthReady = createMemo(() => gameState.canRebirth());

  return (
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
            class={`tab ${props.activeTab() === 'buildings' ? 'active' : ''}`}
            onClick={() => props.setActiveTab('buildings')}
          >
            Buildings
          </button>
          <button
            class={`tab ${props.activeTab() === 'jobs' ? 'active' : ''}`}
            onClick={() => props.setActiveTab('jobs')}
          >
            Jobs
          </button>
          <button
            class={`tab ${props.activeTab() === 'market' ? 'active' : ''}`}
            onClick={() => props.setActiveTab('market')}
            hidden={!marketBuilt()}
          >
            Market
          </button>
          <button
            class={`tab ${props.activeTab() === 'rebirth' ? 'active' : ''}`}
            onClick={() => props.setActiveTab('rebirth')}
            hidden={!rebirthReady()}
          >
            Rebirth
          </button>
          <button
            class={`tab ${props.activeTab() === 'settings' ? 'active' : ''}`}
            onClick={() => props.setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div class="tab-content">
          <div id="buildings-tab" class={`tab-pane ${props.activeTab() === 'buildings' ? 'active' : ''}`}>
            <h2>Buildings</h2>
            <div id="buildings-list">
              <BuildingGrid />
            </div>
          </div>

          <div id="jobs-tab" class={`tab-pane ${props.activeTab() === 'jobs' ? 'active' : ''}`}>
            <h2>Jobs</h2>
            <div id="jobs-list">
              <JobPanel />
            </div>
          </div>

          <div
            id="market-tab"
            class={`tab-pane ${props.activeTab() === 'market' ? 'active' : ''}`}
            hidden={!marketBuilt()}
          >
            <h2>Market</h2>
            <div id="market-content">
              <MarketPanel />
            </div>
          </div>

          <div
            id="rebirth-tab"
            class={`tab-pane ${props.activeTab() === 'rebirth' ? 'active' : ''}`}
            hidden={!rebirthReady()}
          >
            <div id="rebirth-content">
              <RebirthPanel />
            </div>
          </div>

          <div id="settings-tab" class={`tab-pane ${props.activeTab() === 'settings' ? 'active' : ''}`}>
            <h2>Settings</h2>
            <div id="settings-content">
              <SettingsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
