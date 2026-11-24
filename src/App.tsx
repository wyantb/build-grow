import { Component } from 'solid-js'
import { useGameLoop } from './hooks/useGameLoop'
import ResourcePanel from './components/game/ResourcePanel'
import BuildingGrid from './components/game/BuildingGrid'
import JobPanel from './components/game/JobPanel'

const App: Component = () => {
  // Initialize game state and loop
  const { gameEngine, gameState } = useGameLoop()
  
  // For debugging purposes
  ;(window as any).gameEngine = gameEngine
  ;(window as any).gameState = gameState

  return (
    <div class="game-container">
      <header>
        <h1>Fantasy Civilization Builder</h1>
        <div class="theme-toggle" id="theme-toggle">
          <span class="theme-icon">☀️</span>
        </div>
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
            <button class="tab active" data-tab="buildings">Buildings</button>
            <button class="tab" data-tab="jobs">Jobs</button>
            <button class="tab" data-tab="market" id="market-tab-button" style="display: none;">Market</button>
          </div>
          
          <div class="tab-content">
            <div id="buildings-tab" class="tab-pane active">
              <h2>Buildings</h2>
              <div id="buildings-list">
                <BuildingGrid />
              </div>
            </div>
            
            <div id="jobs-tab" class="tab-pane">
              <h2>Jobs</h2>
              <div id="jobs-list">
                <JobPanel />
              </div>
            </div>
            
            <div id="market-tab" class="tab-pane">
              <h2>Market</h2>
              <div id="market-content">
                {/* Market content will go here */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App