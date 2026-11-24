import { WorldState, Resource } from '../types/worldState';
declare class GameEngine {
    private state;
    private intervalId;
    private tickRate;
    constructor();
    getState(): WorldState;
    start(): void;
    stop(): void;
    private tick;
    private processResourceGeneration;
    private processBuildingConstruction;
    private applyBuildingEffects;
    addBuilding(buildingId: string, cost: Resource): boolean;
    private getBuildingName;
    private getBuildingDescription;
    private getBuildingTime;
    assignWorkers(jobId: string, count: number): boolean;
}
export default GameEngine;
//# sourceMappingURL=gameEngine.d.ts.map