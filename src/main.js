import GameEngine from './systems/gameEngine';
import GameUI from './ui/GameUI';
// Initialize the game
const gameEngine = new GameEngine();
const gameUI = new GameUI(gameEngine);
// For debugging purposes
window.gameEngine = gameEngine;
window.gameUI = gameUI;
console.log('Fantasy Civilization Builder initialized!');
//# sourceMappingURL=main.js.map