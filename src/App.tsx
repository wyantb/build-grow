import { createSignal } from 'solid-js'
import type { Component } from 'solid-js'
import { useGameLoop } from './hooks/useGameLoop.js'
import ResourcePanel from './components/game/ResourcePanel.js'
import BuildingGrid from './components/game/BuildingGrid.js'
import JobPanel from './components/game/JobPanel.js'
import MarketPanel from './components/game/MarketPanel.js'

const App: Component = () => {
  // Initialize game state and loop
  const { gameEngine, gameState } = useGameLoop()
  
  // Tab management
  const [activeTab, setActiveTab] = createSignal<'buildings' | 'jobs' | 'market'>('buildings')
  
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default App