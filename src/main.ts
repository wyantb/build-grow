import GameEngine from './systems/gameEngine.ts';
import GameUI from './ui/GameUI.ts';

// Initialize the game
const gameEngine = new GameEngine();
const gameUI = new GameUI(gameEngine);

// For debugging purposes
(window as any).gameEngine = gameEngine;
(window as any).gameUI = gameUI;

console.log('Fantasy Civilization Builder initialized!');