import { Component } from 'solid-js'
import type { WorldState } from './types/worldState'
import GameEngine from './systems/gameEngine'

const App: Component = () => {
  // Initialize the game engine
  const gameEngine = new GameEngine()
  
  // For debugging purposes
  ;(window as any).gameEngine = gameEngine

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
          <div id="resources-display"></div>
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
              <div id="buildings-list"></div>
            </div>
            
            <div id="jobs-tab" class="tab-pane">
              <h2>Jobs</h2>
              <div id="jobs-list"></div>
            </div>
            
            <div id="market-tab" class="tab-pane">
              <h2>Market</h2>
              <div id="market-content"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App