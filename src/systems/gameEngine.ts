import { createInitialState } from '../types/worldState.js';
import type { WorldState, Resource } from '../types/worldState.js';
import MarketSystem from './marketSystem.js';

class GameEngine {
  private state: WorldState;
  private intervalId: number | null = null;
  private tickRate: number = 1000; // 1 second per tick
  private marketSystem: MarketSystem;

  constructor() {
    this.state = createInitialState();
    this.marketSystem = new MarketSystem(this.state);
  }

  // Get current game state
  getState(): WorldState {
    return { ...this.state };
  }

  // Start the game loop
  start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, this.tickRate);
  }

  // Stop the game loop
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Main game tick function
  private tick(): void {
    this.state.tick++;
    this.state.gameTime += this.tickRate / 1000; // Convert ms to seconds
    
    // Process resource generation
    this.processResourceGeneration();
    
    // Process building construction
    this.processBuildingConstruction();
    
    // Process market trades
    this.marketSystem.processTrades();
  }

  // Process resource generation from jobs
  private processResourceGeneration(): void {
    // Calculate resources from settlers (catch-all job)
    const settlerJob = this.state.jobs['settler'];
    if (settlerJob) {
      // Settlers produce small amounts of all basic resources
      // Production scales poorly compared to specialized jobs
      const baseProduction = 0.1; // Very low base production
      const settlerProduction = baseProduction * settlerJob.workers * settlerJob.productivity;
      
      this.state.resources.wood += settlerProduction;
      this.state.resources.stone += settlerProduction * 0.8; // Stone is slightly less common
      this.state.resources.food += settlerProduction * 1.2; // Food is slightly more common
    }

    // Process specialized jobs (when implemented)
    // For now, we only have settlers
  }

  // Process building construction
  private processBuildingConstruction(): void {
    Object.values(this.state.buildings).forEach((building: any) => {
      if (!building.built && building.constructionProgress < 100) {
        // Buildings take time to construct
        building.constructionProgress += 10; // 10% per tick for quick testing
        
        if (building.constructionProgress >= 100) {
          building.constructionProgress = 100;
          building.built = true;
          
          // Apply building effects when completed
          this.applyBuildingEffects(building.id);
        }
      }
    });
  }

  // Apply building effects when completed
  private applyBuildingEffects(buildingId: string): void {
    // For now, just placeholder logic
    console.log(`Building ${buildingId} completed!`);
  }

  // Add a building to construction queue
  addBuilding(buildingId: string, cost: Resource): boolean {
    // Check if player has enough resources
    if (this.state.resources.wood < cost.wood ||
        this.state.resources.stone < cost.stone ||
        this.state.resources.food < cost.food ||
        this.state.resources.gold < cost.gold) {
      return false; // Not enough resources
    }

    // Deduct resources
    this.state.resources.wood -= cost.wood;
    this.state.resources.stone -= cost.stone;
    this.state.resources.food -= cost.food;
    this.state.resources.gold -= cost.gold;

    // Add building to state
    this.state.buildings[buildingId] = {
      id: buildingId,
      name: this.getBuildingName(buildingId),
      description: this.getBuildingDescription(buildingId),
      cost: cost,
      buildTime: this.getBuildingTime(buildingId),
      built: false,
      constructionProgress: 0,
    };

    return true;
  }

  // Helper functions for building properties
  private getBuildingName(id: string): string {
    const names: Record<string, string> = {
      'hut': 'Hut',
      'market': 'Market',
      'lumberjack': 'Lumberjack Post',
      'quarry': 'Quarry',
      'builder': 'Builder Workshop'
    };
    return names[id] || id;
  }

  private getBuildingDescription(id: string): string {
    const descriptions: Record<string, string> = {
      'hut': 'Provides shelter for your people',
      'market': 'Allows trading of resources for gold',
      'lumberjack': 'Increases wood production',
      'quarry': 'Increases stone production',
      'builder': 'Allows construction of more advanced buildings'
    };
    return descriptions[id] || 'A basic building';
  }

  private getBuildingTime(id: string): number {
    const times: Record<string, number> = {
      'hut': 5,
      'market': 10,
      'lumberjack': 8,
      'quarry': 8,
      'builder': 15
    };
    return times[id] || 10;
  }

  // Assign workers to jobs
  assignWorkers(jobId: string, count: number): boolean {
    // For simplicity, we'll just adjust the settler job for now
    if (jobId === 'settler' && this.state.jobs[jobId]) {
      // Handle relative assignments (positive or negative)
      const currentWorkers = this.state.jobs[jobId].workers;
      const newWorkers = Math.max(0, Math.min(this.state.population, currentWorkers + count));
      
      this.state.jobs[jobId].workers = newWorkers;
      return true;
    }
    return false;
  }
}

export default GameEngine;