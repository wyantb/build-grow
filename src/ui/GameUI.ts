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
    
    // Update market display
    this.updateMarket(state);
    
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
      buildingsHTML += '<div class="building-section"><h3 class="section-header">Residential Block</h3><div class="building-grid">';
      buildingTypes.filter(b => b.type === 'housing').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingTile(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div></div>';
      
      // Resource section
      buildingsHTML += '<div class="building-section"><h3 class="section-header">Outskirts</h3><div class="building-grid">';
      buildingTypes.filter(b => b.type === 'resource').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingTile(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div></div>';
      
      // Commercial section
      buildingsHTML += '<div class="building-section"><h3 class="section-header">Commercial District</h3><div class="building-grid">';
      buildingTypes.filter(b => b.type === 'commercial').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingTile(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div></div>';
      
      // Science section
      buildingsHTML += '<div class="building-section"><h3 class="section-header">Science Sector</h3><div class="building-grid">';
      buildingTypes.filter(b => b.type === 'science').forEach(buildingType => {
        const existingBuilding = existingBuildings.find((b: any) => b.id === buildingType.id);
        buildingsHTML += this.createBuildingTile(buildingType, existingBuilding, state.resources);
      });
      buildingsHTML += '</div></div>';
      
      buildingsList.innerHTML = buildingsHTML;
      
      // Add event listeners to build buttons
      this.setupBuildingButtons();
    }
  }
  
  private createBuildingTile(buildingType: any, existingBuilding: any, resources: any): string {
    const canAfford = resources.wood >= buildingType.cost.wood && 
                      resources.stone >= buildingType.cost.stone && 
                      resources.food >= buildingType.cost.food && 
                      resources.gold >= buildingType.cost.gold;
    
    // Create tooltip content
    let tooltipContent = `${buildingType.description}`;
    if (buildingType.cost.wood > 0 || buildingType.cost.stone > 0 || buildingType.cost.food > 0 || buildingType.cost.gold > 0) {
      tooltipContent += `\n\nCost:`;
      if (buildingType.cost.wood > 0) tooltipContent += `\nWood: ${buildingType.cost.wood}`;
      if (buildingType.cost.stone > 0) tooltipContent += `\nStone: ${buildingType.cost.stone}`;
      if (buildingType.cost.food > 0) tooltipContent += `\nFood: ${buildingType.cost.food}`;
      if (buildingType.cost.gold > 0) tooltipContent += `\nGold: ${buildingType.cost.gold}`;
    }
    
    // Add building-specific effects
    if (buildingType.id === 'market') {
      tooltipContent += `\n\nEffect:\n- Provides 1 merchant job\n- Enables resource trading`;
    } else if (buildingType.id === 'hut') {
      tooltipContent += `\n\nEffect:\n- Provides housing for citizens`;
    } else if (buildingType.id === 'lumberjack') {
      tooltipContent += `\n\nEffect:\n- Provides work for lumberjacks\n- Increases wood production`;
    } else if (buildingType.id === 'quarry') {
      tooltipContent += `\n\nEffect:\n- Provides work for quarry workers\n- Increases stone production`;
    } else if (buildingType.id === 'builder') {
      tooltipContent += `\n\nEffect:\n- Allows construction of advanced buildings`;
    }
    
    // Count how many of this building type exist
    const buildingCount = existingBuilding && existingBuilding.built ? 1 : 0;
    
    // If building is already built, show a disabled button with "Built" text
    if (existingBuilding && existingBuilding.built) {
      return `
        <div class="building-tile" title="${tooltipContent}">
          <button class="build-button built" disabled id="build-${buildingType.id}">
            <span class="building-name">${buildingType.name}</span>
            ${buildingCount > 0 ? `<span class="building-count">${buildingCount}</span>` : ''}
          </button>
        </div>
      `;
    }
    
    // If building is under construction, show progress in the button
    if (existingBuilding && !existingBuilding.built) {
      const progressPercent = existingBuilding.constructionProgress;
      return `
        <div class="building-tile" title="${tooltipContent}">
          <button class="build-button constructing" disabled id="build-${buildingType.id}">
            <span class="building-name">${buildingType.name}</span>
            ${buildingCount > 0 ? `<span class="building-count">${buildingCount}</span>` : ''}
            <div class="building-progress-container">
              <div class="building-progress-bar">
                <div class="building-progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <div class="building-progress-text">${progressPercent.toFixed(0)}%</div>
            </div>
          </button>
        </div>
      `;
    }
    
    // Otherwise, show a build button
    return `
      <div class="building-tile" title="${tooltipContent}">
        <button class="build-button ${!canAfford ? 'cannot-afford' : ''}" id="build-${buildingType.id}" ${!canAfford ? 'disabled' : ''}>
          <span class="building-name">${buildingType.name}</span>
        </button>
      </div>
    `;
  }

  private updateJobs(state: WorldState): void {
    const jobsList = document.getElementById('jobs-list');
    if (jobsList) {
      let jobsHTML = '';
      
      Object.values(state.jobs).forEach((job: any) => {
        jobsHTML += `
          <div class="job-row">
            <span class="job-name">${job.name}</span>
            <div class="job-controls">
              <button class="job-btn job-decrease-large" data-job="${job.id}" data-amount="-5"><<</button>
              <button class="job-btn job-decrease" data-job="${job.id}" data-amount="-1"><</button>
              <span class="job-worker-count">${job.workers}</span>
              <button class="job-btn job-increase" data-job="${job.id}" data-amount="1">></button>
              <button class="job-btn job-increase-large" data-job="${job.id}" data-amount="5">>></button>
            </div>
          </div>
        `;
      });
      
      jobsList.innerHTML = jobsHTML;
      
      // Add event listeners to job buttons
      this.setupJobButtons();
    }
  }
  
  private setupJobButtons(): void {
    const jobButtons = document.querySelectorAll('.job-btn');
    jobButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const jobId = target.getAttribute('data-job');
        const amount = parseInt(target.getAttribute('data-amount') || '0');
        
        if (jobId) {
          this.engine.assignWorkers(jobId, amount);
        }
      });
    });
  }

  private updateMarket(state: WorldState): void {
    // Check if market building is built
    const marketBuilding = state.buildings['market'];
    const marketTabButton = document.getElementById('market-tab-button');
    const marketContent = document.getElementById('market-content');
    
    if (marketTabButton && marketContent) {
      if (marketBuilding && marketBuilding.built) {
        // Show market tab
        marketTabButton.style.display = 'block';
        
        // Get merchant count from market system
        const merchantCount = this.engine.getMerchantCount();
        
        // Update market content
        marketContent.innerHTML = `
          <div class="market-info">
            <p>You have ${merchantCount} merchant(s) available for trading.</p>
            <p>Trades are processed once per second.</p>
          </div>
          <div class="market-rates">
            <h3>Current Market Rates</h3>
            <div class="rate-item">
              <span class="resource-name">Wood</span>
              <span class="rate-values">Buy: 1 Gold | Sell: 0.5 Gold</span>
            </div>
            <div class="rate-item">
              <span class="resource-name">Stone</span>
              <span class="rate-values">Buy: 1.2 Gold | Sell: 0.6 Gold</span>
            </div>
            <div class="rate-item">
              <span class="resource-name">Food</span>
              <span class="rate-values">Buy: 0.8 Gold | Sell: 0.4 Gold</span>
            </div>
          </div>
          <div class="market-trading">
            <h3>Trade Resources</h3>
            <div class="trade-controls">
              <div class="trade-row">
                <span class="resource-name">Wood</span>
                <div class="trade-buttons">
                  <button class="trade-btn buy-btn" data-resource="wood" data-action="buy">Buy</button>
                  <button class="trade-btn sell-btn" data-resource="wood" data-action="sell">Sell</button>
                  <input type="number" class="trade-amount" id="wood-amount" value="1" min="1">
                </div>
              </div>
              <div class="trade-row">
                <span class="resource-name">Stone</span>
                <div class="trade-buttons">
                  <button class="trade-btn buy-btn" data-resource="stone" data-action="buy">Buy</button>
                  <button class="trade-btn sell-btn" data-resource="stone" data-action="sell">Sell</button>
                  <input type="number" class="trade-amount" id="stone-amount" value="1" min="1">
                </div>
              </div>
              <div class="trade-row">
                <span class="resource-name">Food</span>
                <div class="trade-buttons">
                  <button class="trade-btn buy-btn" data-resource="food" data-action="buy">Buy</button>
                  <button class="trade-btn sell-btn" data-resource="food" data-action="sell">Sell</button>
                  <input type="number" class="trade-amount" id="food-amount" value="1" min="1">
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add event listeners for trade buttons
        this.setupTradeButtons();
      } else {
        // Hide market tab
        marketTabButton.style.display = 'none';
        
        // If market tab was active, switch to buildings tab
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'market') {
          this.switchTab('buildings');
        }
      }
    }
  }
  
  private setupTradeButtons(): void {
    const tradeButtons = document.querySelectorAll('.trade-btn');
    tradeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const resource = target.getAttribute('data-resource') as keyof Resource;
        const action = target.getAttribute('data-action');
        const amountInput = document.getElementById(`${resource}-amount`) as HTMLInputElement;
        
        if (resource && action && amountInput) {
          const amount = parseInt(amountInput.value) || 1;
          
          // For now, we'll just log the trade action
          console.log(`Attempting to ${action} ${amount} ${resource}`);
          
          // In a real implementation, this would call the market system
          // this.engine.tradeResource(resource, amount, action);
        }
      });
    });
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