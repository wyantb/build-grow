import GameEngine from '../systems/gameEngine';
declare class GameUI {
    private engine;
    private appElement;
    constructor(engine: GameEngine);
    private initializeUI;
    private setupEventListeners;
    private updateLoop;
    private updateUI;
    private updateResources;
    private updateBuildings;
    private updateJobs;
    private updateAvailableActions;
    private setupActionButtons;
}
export default GameUI;
//# sourceMappingURL=GameUI.d.ts.map