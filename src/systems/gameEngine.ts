import { createInitialState } from '../types/worldState.js';
import type { WorldState, Resource } from '../types/worldState.js';
import { getBuildingType } from '../data/buildings.js';
import MarketSystem from './marketSystem.js';

class GameEngine {
  private state: WorldState;
  private intervalId: number | null = null;
  private tickRate: number = 200; // 5 ticks per second
  private marketSystem: MarketSystem;
  private previousResources: Resource;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = createInitialState();
    this.marketSystem = new MarketSystem(this.state);
    this.previousResources = { ...this.state.resources };
  }

  // Subscribe to state changes so the UI can mirror the engine reactively
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Get current game state
  getState(): WorldState {
    return { ...this.state };
  }

  // Start the game loop
  start(): void {
    if (this.intervalId !== null) {return;}

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

    // Store previous resource amounts
    this.previousResources = { ...this.state.resources };

    // Process resource generation
    this.processResourceGeneration();

    // Process building construction
    this.processBuildingConstruction();

    // Process market trades
    this.marketSystem.processTrades();

    this.notify();
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
    Object.values(this.state.buildings).forEach((building) => {
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
    console.info(`Building ${buildingId} completed!`);

    // Add jobs based on building type
    if (buildingId === 'market') {
      // Add merchant job when market is built
      this.state.jobs['merchant'] = {
        id: 'merchant',
        name: 'Merchant',
        description: 'Trades resources at the market',
        workers: 0,
        productivity: 1.0
      };

      // Add merchant to unlocked jobs
      if (!this.state.unlockedJobs.includes('merchant')) {
        this.state.unlockedJobs.push('merchant');
      }
    }
  }

  // Add a building to construction queue
  addBuilding(buildingId: string, cost?: Resource): boolean {
    const buildingType = getBuildingType(buildingId);
    if (!buildingType) {
      return false; // Unknown building type
    }

    const buildingCost = cost ?? buildingType.cost;

    // Check if player has enough resources
    if (this.state.resources.wood < buildingCost.wood
        || this.state.resources.stone < buildingCost.stone
        || this.state.resources.food < buildingCost.food
        || this.state.resources.gold < buildingCost.gold) {
      return false; // Not enough resources
    }

    // Deduct resources
    this.state.resources.wood -= buildingCost.wood;
    this.state.resources.stone -= buildingCost.stone;
    this.state.resources.food -= buildingCost.food;
    this.state.resources.gold -= buildingCost.gold;

    // Add building to state
    this.state.buildings[buildingId] = {
      id: buildingId,
      name: buildingType.name,
      description: buildingType.description,
      cost: buildingCost,
      buildTime: buildingType.buildTime,
      built: false,
      constructionProgress: 0
    };

    this.notify();

    return true;
  }

  // Assign workers to jobs
  assignWorkers(jobId: string, count: number): boolean {
    // For simplicity, we'll just adjust the settler job for now
    if (this.state.jobs[jobId]) {
      // Handle relative assignments (positive or negative)
      const currentWorkers = this.state.jobs[jobId].workers;
      const newWorkers = Math.max(0, Math.min(this.state.population, currentWorkers + count));

      this.state.jobs[jobId].workers = newWorkers;
      this.notify();

      return true;
    }

    return false;
  }

  // Get merchant count from market system
  getMerchantCount(): number {
    return this.marketSystem.getMerchantCount();
  }

  // Get resource production rates (per second)
  getResourceRates(): Resource {
    // Calculate the difference between current and previous resource amounts
    // Adjust for the actual tick rate (200ms = 0.2 seconds per tick)
    const ticksPerSecond = 1000 / this.tickRate; // 5 ticks per second

    return {
      wood: (this.state.resources.wood - this.previousResources.wood) * ticksPerSecond,
      stone: (this.state.resources.stone - this.previousResources.stone) * ticksPerSecond,
      food: (this.state.resources.food - this.previousResources.food) * ticksPerSecond,
      gold: (this.state.resources.gold - this.previousResources.gold) * ticksPerSecond
    };
  }

  // Update method for external control
  update(_deltaTime: number): void {
    // For now, we'll just call tick directly
    // In a more sophisticated implementation, we might interpolate between ticks
    this.tick();
  }
}

export default GameEngine;
