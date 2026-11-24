import { createInitialState } from '../types/worldState.js';
import type { WorldState, Resource } from '../types/worldState.js';
import { getBuildingType, getScaledCost, getScaledBuildTime } from '../data/buildings.js';
import { BUILDING_JOB_MAP } from '../data/jobs.js';
import MarketSystem from './marketSystem.js';

class GameEngine {
  private state: WorldState;
  private intervalId: number | null = null;
  private tickRate: number = 200; // 5 ticks per second
  private marketSystem: MarketSystem;
  private previousResources: Resource;
  private listeners = new Set<() => void>();
  private buildingInstanceCounter: Record<string, number> = {};

  constructor() {
    this.state = createInitialState();
    this.marketSystem = new MarketSystem(this.state);
    this.previousResources = { ...this.state.resources };

    // Recalculate job capacities from existing completed buildings
    this.recalculateJobCapacities();
  }

  // Recalculate job capacities from completed building counts
  private recalculateJobCapacities(): void {
    for (const [buildingTypeId, count] of Object.entries(this.state.buildingCounts)) {
      const jobId = BUILDING_JOB_MAP[buildingTypeId];
      if (jobId && this.state.jobs[jobId]) {
        this.state.jobs[jobId].capacity = count;
      }
    }

    // Rebuild instance counter from existing buildings
    for (const instanceKey of Object.keys(this.state.buildings)) {
      const parts = instanceKey.split('-');
      const buildingTypeId = parts.slice(0, -1).join('-');
      const lastPart = parts[parts.length - 1];
      if (!lastPart || !buildingTypeId) {continue;}
      const idx = parseInt(lastPart, 10);
      if (!Number.isNaN(idx)) {
        this.buildingInstanceCounter[buildingTypeId] = Math.max(
          this.buildingInstanceCounter[buildingTypeId] ?? 0,
          idx + 1
        );
      }
    }
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
    const jobs = this.state.jobs;

    // Production and consumption from each job
    for (const job of Object.values(jobs)) {
      if (job.workers <= 0) {continue;}

      this.state.resources.wood += job.production.wood * job.workers;
      this.state.resources.stone += job.production.stone * job.workers;
      this.state.resources.food += job.production.food * job.workers;
      this.state.resources.gold += job.production.gold * job.workers;

      // Consumption per worker
      this.state.resources.wood -= job.consumption.wood * job.workers;
      this.state.resources.stone -= job.consumption.stone * job.workers;
      this.state.resources.food -= job.consumption.food * job.workers;
      this.state.resources.gold -= job.consumption.gold * job.workers;
    }
  }

  // Process building construction
  private processBuildingConstruction(): void {
    for (const [_instanceKey, building] of Object.entries(this.state.buildings)) {
      if (!building.built && building.constructionProgress < 100) {
        // Buildings take time to construct
        building.constructionProgress += 10; // 10% per tick for quick testing

        if (building.constructionProgress >= 100) {
          building.constructionProgress = 100;
          building.built = true;

          // Increment count for this building type (use the building's type id, not the instance key)
          const buildingTypeId = building.id;
          this.state.buildingCounts[buildingTypeId]
            = (this.state.buildingCounts[buildingTypeId] ?? 0) + 1;

          // Apply building effects when completed
          this.applyBuildingEffects(buildingTypeId);
        }
      }
    }
  }

  // Apply building effects when completed
  private applyBuildingEffects(buildingId: string): void {
    console.info(`Building ${buildingId} completed!`);

    // Each building adds +1 capacity to its associated job
    const jobId = BUILDING_JOB_MAP[buildingId];
    if (jobId && this.state.jobs[jobId]) {
      this.state.jobs[jobId].capacity += 1;
    }
  }

  // Add a building to construction queue
  addBuilding(buildingId: string, cost?: Resource): boolean {
    const buildingType = getBuildingType(buildingId);
    if (!buildingType) {
      return false; // Unknown building type
    }

    const count = this.state.buildingCounts[buildingId] ?? 0;

    // Use provided cost or calculate scaled cost
    const buildingCost = cost ?? getScaledCost(buildingType.cost, count);
    const buildTime = getScaledBuildTime(buildingType.buildTime, count);

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

    // Generate a unique instance key for this building
    const instanceIndex = this.buildingInstanceCounter[buildingId] ?? 0;
    this.buildingInstanceCounter[buildingId] = instanceIndex + 1;
    const instanceKey = `${buildingId}-${instanceIndex}`;

    // Add building to state
    this.state.buildings[instanceKey] = {
      id: buildingId,
      name: buildingType.name,
      description: buildingType.description,
      cost: buildingCost,
      buildTime,
      built: false,
      constructionProgress: 0
    };

    this.notify();

    return true;
  }

  // Assign workers to a job
  assignWorkers(jobId: string, count: number): boolean {
    const job = this.state.jobs[jobId];
    if (!job) {return false;}

    const totalAssigned = Object.values(this.state.jobs)
      .reduce((sum, j) => sum + j.workers, 0);
    const available = Math.max(0, this.state.population - totalAssigned);

    if (count > 0) {
      // Determine how many workers can be moved
      let canMove = available;

      // If capacity-constrained, cap the room
      if (job.capacity > 0) {
        const roomInJob = Math.max(0, job.capacity - job.workers);
        canMove = Math.min(canMove, roomInJob);
      }

      // If no available population, try to pull from the default job
      if (canMove <= 0) {
        const defaultJob = this.state.jobs[this.state.defaultJob];
        if (defaultJob) {
          canMove = Math.min(defaultJob.workers, count);
        }
      } else {
        canMove = Math.min(canMove, count);
      }

      // If still no available workers, nothing to do
      if (canMove <= 0) {return true;}

      // Pull from default job first if needed
      if (canMove > available) {
        const fromDefault = canMove - available;
        const defaultJob = this.state.jobs[this.state.defaultJob];
        if (defaultJob) {
          defaultJob.workers = Math.max(0, defaultJob.workers - fromDefault);
        }
        job.workers += available;
        job.workers += fromDefault;
      } else {
        job.workers += canMove;
      }
    } else {
      // When removing: can't go below 0
      job.workers = Math.max(0, job.workers + count);
    }

    this.notify();

    return true;
  }

  // Set the default job (where new workers go)
  setDefaultJob(jobId: string): boolean {
    const job = this.state.jobs[jobId];
    if (!job || !job.canDefault) {return false;}

    this.state.defaultJob = jobId;
    this.notify();

    return true;
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
