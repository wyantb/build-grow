import GameEngine from './systems/gameEngine.js';
import GameUI from './ui/GameUI.js';

// Initialize the game
const gameEngine = new GameEngine();
const gameUI = new GameUI(gameEngine);

// For debugging purposes
(window as any).gameEngine = gameEngine;
(window as any).gameUI = gameUI;

console.log('Fantasy Civilization Builder initialized!');