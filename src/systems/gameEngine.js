import { WorldState, createInitialState, Resource } from '../types/worldState';
class GameEngine {
    state;
    intervalId = null;
    tickRate = 1000; // 1 second per tick
    constructor() {
        this.state = createInitialState();
    }
    // Get current game state
    getState() {
        return { ...this.state };
    }
    // Start the game loop
    start() {
        if (this.intervalId !== null)
            return;
        this.intervalId = window.setInterval(() => {
            this.tick();
        }, this.tickRate);
    }
    // Stop the game loop
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    // Main game tick function
    tick() {
        this.state.tick++;
        this.state.gameTime += this.tickRate / 1000; // Convert ms to seconds
        // Process resource generation
        this.processResourceGeneration();
        // Process building construction
        this.processBuildingConstruction();
    }
    // Process resource generation from jobs
    processResourceGeneration() {
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
    processBuildingConstruction() {
        Object.values(this.state.buildings).forEach(building => {
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
    applyBuildingEffects(buildingId) {
        // For now, just placeholder logic
        console.log(`Building ${buildingId} completed!`);
    }
    // Add a building to construction queue
    addBuilding(buildingId, cost) {
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
    getBuildingName(id) {
        const names = {
            'hut': 'Hut',
            'market': 'Market',
            'lumberjack': 'Lumberjack Post',
            'quarry': 'Quarry',
            'builder': 'Builder Workshop'
        };
        return names[id] || id;
    }
    getBuildingDescription(id) {
        const descriptions = {
            'hut': 'Provides shelter for your people',
            'market': 'Allows trading of resources for gold',
            'lumberjack': 'Increases wood production',
            'quarry': 'Increases stone production',
            'builder': 'Allows construction of more advanced buildings'
        };
        return descriptions[id] || 'A basic building';
    }
    getBuildingTime(id) {
        const times = {
            'hut': 5,
            'market': 10,
            'lumberjack': 8,
            'quarry': 8,
            'builder': 15
        };
        return times[id] || 10;
    }
    // Assign workers to jobs
    assignWorkers(jobId, count) {
        // For simplicity, we'll just adjust the settler job for now
        if (jobId === 'settler' && count <= this.state.population) {
            this.state.jobs[jobId].workers = count;
            return true;
        }
        return false;
    }
}
export default GameEngine;
//# sourceMappingURL=gameEngine.js.map