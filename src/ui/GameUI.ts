import GameEngine from '../systems/gameEngine.js';
import type { WorldState } from '../types/worldState.js';

class GameUI {
  private engine: GameEngine;
  private appElement: HTMLElement;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.appElement = document.getElementById('app')!;
    
    // Initialize UI
    this.initializeUI();
    
    // Start the game engine
    this.engine.start();
    
    // Start UI update loop
    this.updateLoop();
  }

  private initializeUI(): void {
    this.appElement.innerHTML = `
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
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.setupEventListeners();
    this.setupTabNavigation();
    this.setupThemeToggle();
  }

  private setupEventListeners(): void {
    // We'll add event listeners for UI interactions here
  }

  private setupTabNavigation(): void {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });
  }

  private setupThemeToggle(): void {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const themeIcon = themeToggle.querySelector('.theme-icon');
        if (themeIcon) {
          themeIcon.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
        }
      });
    }
  }

  private switchTab(tabName: string | null): void {
    if (!tabName) return;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
  }

  private updateLoop(): void {
    setInterval(() => {
      this.updateUI();
    }, 1000); // Update UI every second
  }

  private updateUI(): void {
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

  private updateResources(state: WorldState): void {
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

  private updateBuildings(state: WorldState): void {
    const buildingsList = document.getElementById('buildings-list');
    if (buildingsList) {
      // Group buildings by type
      const housingBuildings = [];
      const resourceBuildings = [];
      const commercialBuildings = [];
      const scienceBuildings = [];
      
      // Collect existing buildings
      const existingBuildings = Object.values(state.buildings);
      
      // Define available building types with their costs and descriptions
      const buildingTypes = [
        { 
          id: 'hut', 
          name: 'Hut', 
          type: 'housing',
          description: 'Basic housing for your population',
          cost: { wood: 20, stone: 10, food: 0, gold: 0 },
          buildTime: 30
        },
        { 
          id: 'market', 
          name: 'Market', 
          type: 'commercial',
          description: 'Sells resources for money',
          cost: { wood: 30, stone: 30, food: 15, gold: 0 },
          buildTime: 60
        },
        { 
          id: 'lumberjack', 
          name: 'Lumberjack', 
          type: 'resource',
          description: 'Produces wood resources',
          cost: { wood: 25, stone: 15, food: 0, gold: 0 },
          buildTime: 45
        },
        { 
          id: 'quarry', 
          name: 'Quarry', 
          type: 'resource',
          description: 'Produces stone resources',
          cost: { wood: 20, stone: 25, food: 0, gold: 0 },
          buildTime: 45
        },
        { 
          id: 'builder', 
          name: 'Builder Workshop', 
          type: 'science',
          description: 'Allows construction of advanced buildings',
          cost: { wood: 50, stone: 30, food: 20, gold: 0 },
          buildTime: 120
        }
      ];
      
      // Create building sections
      let buildingsHTML = '';
      
      // Housing section
      buildingsHTML += '<div class="building-section"><h3>Housing</h3>';
      buildingTypes.filter(b => b.type === 'housing').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingCard(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div>';
      
      // Resource section
      buildingsHTML += '<div class="building-section"><h3>Resource Production</h3>';
      buildingTypes.filter(b => b.type === 'resource').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingCard(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div>';
      
      // Commercial section
      buildingsHTML += '<div class="building-section"><h3>Commercial</h3>';
      buildingTypes.filter(b => b.type === 'commercial').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingCard(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div>';
      
      // Science section
      buildingsHTML += '<div class="building-section"><h3>Science</h3>';
      buildingTypes.filter(b => b.type === 'science').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingCard(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div>';
      
      buildingsList.innerHTML = buildingsHTML;
      
      // Add event listeners to build buttons
      this.setupBuildingButtons();
    }
  }
  
  private createBuildingCard(buildingType: any, existingBuilding: any, resources: any): string {
    const canAfford = resources.wood >= buildingType.cost.wood && 
                      resources.stone >= buildingType.cost.stone && 
                      resources.food >= buildingType.cost.food && 
                      resources.gold >= buildingType.cost.gold;
    
    let cardHTML = `
      <div class="building-card">
        <div class="building-header">
          <span class="building-name">${buildingType.name}</span>
        </div>
        <div class="building-description">${buildingType.description}</div>
        <div class="building-cost">
          Cost: ${buildingType.cost.wood > 0 ? `Wood: ${buildingType.cost.wood} ` : ''}
                ${buildingType.cost.stone > 0 ? `Stone: ${buildingType.cost.stone} ` : ''}
                ${buildingType.cost.food > 0 ? `Food: ${buildingType.cost.food} ` : ''}
                ${buildingType.cost.gold > 0 ? `Gold: ${buildingType.cost.gold} ` : ''}
        </div>
    `;
    
    if (existingBuilding) {
      if (existingBuilding.built) {
        cardHTML += `<button class="build-button completed" disabled>Built</button>`;
      } else {
        const progressPercent = existingBuilding.constructionProgress;
        cardHTML += `
          <button class="build-button constructing" disabled style="position: relative;">
            Building... ${progressPercent.toFixed(0)}%
            <div class="progress-overlay" style="position: absolute; top: 0; left: 0; height: 100%; background: rgba(0, 122, 204, 0.3); width: ${progressPercent}%;"></div>
          </button>
        `;
      }
    } else {
      cardHTML += `<button class="build-button" id="build-${buildingType.id}" ${!canAfford ? 'disabled' : ''}>Build</button>`;
    }
    
    cardHTML += `</div>`;
    return cardHTML;
  }

  private updateJobs(state: WorldState): void {
    const jobsList = document.getElementById('jobs-list');
    if (jobsList) {
      let jobsHTML = '';
      
      Object.values(state.jobs).forEach((job: any) => {
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

  private updateAvailableActions(_state: WorldState): void {
    // Actions are now integrated into the buildings tab, so this is no longer needed
  }

  private setupBuildingButtons(): void {
    const buildingButtons = document.querySelectorAll('[id^="build-"]');
    buildingButtons.forEach(button => {
      const buildingId = button.id.replace('build-', '');
      button.addEventListener('click', () => {
        // Get the cost for this building type
        const buildingCosts: Record<string, any> = {
          'hut': { wood: 20, stone: 10, food: 0, gold: 0 },
          'market': { wood: 30, stone: 30, food: 15, gold: 0 },
          'lumberjack': { wood: 25, stone: 15, food: 0, gold: 0 },
          'quarry': { wood: 20, stone: 25, food: 0, gold: 0 },
          'builder': { wood: 50, stone: 30, food: 20, gold: 0 }
        };
        
        const cost = buildingCosts[buildingId];
        if (cost) {
          this.engine.addBuilding(buildingId, cost);
        }
      });
    });
  }
}

export default GameUI;