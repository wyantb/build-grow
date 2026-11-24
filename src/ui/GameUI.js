import GameEngine from '../systems/gameEngine';
import { WorldState } from '../types/worldState';
class GameUI {
    engine;
    appElement;
    constructor(engine) {
        this.engine = engine;
        this.appElement = document.getElementById('app');
        // Initialize UI
        this.initializeUI();
        // Start the game engine
        this.engine.start();
        // Start UI update loop
        this.updateLoop();
    }
    initializeUI() {
        this.appElement.innerHTML = `
      <div class="game-container">
        <header>
          <h1>Fantasy Civilization Builder</h1>
          <p class="subtitle">A new universe awaits</p>
        </header>
        
        <div class="game-content">
          <div class="panel resources-panel">
            <h2>Resources</h2>
            <div id="resources-display"></div>
          </div>
          
          <div class="panel buildings-panel">
            <h2>Buildings</h2>
            <div id="buildings-list"></div>
            <div id="construction-queue"></div>
          </div>
          
          <div class="panel jobs-panel">
            <h2>Jobs</h2>
            <div id="jobs-list"></div>
          </div>
          
          <div class="panel actions-panel">
            <h2>Actions</h2>
            <div id="available-buildings"></div>
          </div>
        </div>
      </div>
    `;
        this.setupEventListeners();
    }
    setupEventListeners() {
        // We'll add event listeners for UI interactions here
    }
    updateLoop() {
        setInterval(() => {
            this.updateUI();
        }, 1000); // Update UI every second
    }
    updateUI() {
        const state = this.engine.getState();
        // Update resources display
        this.updateResources(state);
        // Update buildings display
        this.updateBuildings(state);
        // Update jobs display
        this.updateJobs(state);
        // Update available actions
        this.updateAvailableActions(state);
    }
    updateResources(state) {
        const resourcesDisplay = document.getElementById('resources-display');
        if (resourcesDisplay) {
            resourcesDisplay.innerHTML = `
        <div class="resource-item">
          <span class="resource-name">Wood:</span>
          <span class="resource-value">${state.resources.wood.toFixed(1)}</span>
        </div>
        <div class="resource-item">
          <span class="resource-name">Stone:</span>
          <span class="resource-value">${state.resources.stone.toFixed(1)}</span>
        </div>
        <div class="resource-item">
          <span class="resource-name">Food:</span>
          <span class="resource-value">${state.resources.food.toFixed(1)}</span>
        </div>
        <div class="resource-item">
          <span class="resource-name">Gold:</span>
          <span class="resource-value">${state.resources.gold.toFixed(1)}</span>
        </div>
        <div class="resource-item">
          <span class="resource-name">Population:</span>
          <span class="resource-value">${state.population}</span>
        </div>
        <div class="resource-item">
          <span class="resource-name">Time:</span>
          <span class="resource-value">${state.gameTime.toFixed(0)}s</span>
        </div>
      `;
        }
    }
    updateBuildings(state) {
        const buildingsList = document.getElementById('buildings-list');
        if (buildingsList) {
            let buildingsHTML = '';
            Object.values(state.buildings).forEach(building => {
                buildingsHTML += `
          <div class="building-item ${building.built ? 'completed' : 'constructing'}">
            <div class="building-header">
              <span class="building-name">${building.name}</span>
              ${!building.built ? `<span class="building-progress">${building.constructionProgress.toFixed(0)}%</span>` : ''}
            </div>
            <div class="building-description">${building.description}</div>
            ${!building.built ? `
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${building.constructionProgress}%"></div>
              </div>
            ` : ''}
          </div>
        `;
            });
            buildingsList.innerHTML = buildingsHTML || '<p>No buildings constructed yet.</p>';
        }
    }
    updateJobs(state) {
        const jobsList = document.getElementById('jobs-list');
        if (jobsList) {
            let jobsHTML = '';
            Object.values(state.jobs).forEach(job => {
                jobsHTML += `
          <div class="job-item">
            <div class="job-header">
              <span class="job-name">${job.name}</span>
              <span class="job-workers">Workers: ${job.workers}</span>
            </div>
            <div class="job-description">${job.description}</div>
          </div>
        `;
            });
            jobsList.innerHTML = jobsHTML;
        }
    }
    updateAvailableActions(state) {
        const actionsContainer = document.getElementById('available-buildings');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
        <div class="action-buttons">
          <button id="build-hut" class="action-button">Build Hut (20 Wood, 10 Stone)</button>
          <button id="build-market" class="action-button">Build Market (30 Wood, 30 Stone, 15 Food)</button>
          <button id="build-lumberjack" class="action-button">Build Lumberjack (25 Wood, 15 Stone)</button>
          <button id="build-quarry" class="action-button">Build Quarry (20 Wood, 25 Stone)</button>
          <button id="build-builder" class="action-button">Build Builder Workshop (50 Wood, 30 Stone, 20 Food)</button>
        </div>
      `;
            // Add event listeners to buttons
            this.setupActionButtons();
        }
    }
    setupActionButtons() {
        const buildHutBtn = document.getElementById('build-hut');
        const buildMarketBtn = document.getElementById('build-market');
        const buildLumberjackBtn = document.getElementById('build-lumberjack');
        const buildQuarryBtn = document.getElementById('build-quarry');
        const buildBuilderBtn = document.getElementById('build-builder');
        if (buildHutBtn) {
            buildHutBtn.addEventListener('click', () => {
                this.engine.addBuilding('hut', { wood: 20, stone: 10, food: 0, gold: 0 });
            });
        }
        if (buildMarketBtn) {
            buildMarketBtn.addEventListener('click', () => {
                this.engine.addBuilding('market', { wood: 30, stone: 30, food: 15, gold: 0 });
            });
        }
        if (buildLumberjackBtn) {
            buildLumberjackBtn.addEventListener('click', () => {
                this.engine.addBuilding('lumberjack', { wood: 25, stone: 15, food: 0, gold: 0 });
            });
        }
        if (buildQuarryBtn) {
            buildQuarryBtn.addEventListener('click', () => {
                this.engine.addBuilding('quarry', { wood: 20, stone: 25, food: 0, gold: 0 });
            });
        }
        if (buildBuilderBtn) {
            buildBuilderBtn.addEventListener('click', () => {
                this.engine.addBuilding('builder', { wood: 50, stone: 30, food: 20, gold: 0 });
            });
        }
    }
}
export default GameUI;
//# sourceMappingURL=GameUI.js.map