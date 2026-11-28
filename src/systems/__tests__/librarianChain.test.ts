import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';

describe('the librarian knowledge chain', () => {
  it('a paper maker produces paper from wood', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['paper_mill'],
      unlockedBuildings: ['paper_mill'],
      researchedTechs: ['paper_making'],
      workers: { paper_maker: 1 },
      resources: { wood: 100, paper: 0 },
    }));

    engine.runTicks(10);

    // paper_maker: 0.1 paper/tick, consumes 0.3 wood/tick
    expect(engine.getState().resources.paper).toBeCloseTo(1.0, 5);
    expect(engine.getState().resources.wood).toBeCloseTo(97.0, 5);
  });

  it('a librarian consumes paper but does not produce knowledge directly', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['library'],
      unlockedBuildings: ['library'],
      researchedTechs: ['writing'],
      workers: { librarian: 1 },
      resources: { paper: 10 },
    }));

    engine.runTicks(10);

    // librarian consumes 0.2 paper/tick but has no production
    expect(engine.getState().resources.paper).toBeCloseTo(8.0, 5);
  });

  it('librarians boost the research rate multiplicatively', () => {
    // A world with one human (population 1) and no workers produces base research.
    const engine = new GameEngine(createTestWorld({
      population: 1,
      buildings: ['library'],
      unlockedBuildings: ['library'],
      researchedTechs: ['writing'],
      workers: { librarian: 1 },
      resources: { paper: 100 },
    }));

    // With 1 human producing baseResearch (0.02/tick) and 1 librarian (+5% multiplier)
    // research = baseResearch * population * (1 + librarianCount * 0.05)
    // = 0.02 * 1 * 1.05 = 0.021/tick
    const rates = engine.getTickRates();
    expect(rates.research).toBeCloseTo(0.021, 5);
  });

  it('two librarians give a 10% research boost', () => {
    const engine = new GameEngine(createTestWorld({
      population: 2,
      buildings: ['library'],
      unlockedBuildings: ['library'],
      researchedTechs: ['writing'],
      workers: { librarian: 2 },
      resources: { paper: 100 },
    }));

    // 0.02 * 2 * (1 + 2 * 0.05) = 0.04 * 1.10 = 0.044/tick
    const rates = engine.getTickRates();
    expect(rates.research).toBeCloseTo(0.044, 5);
  });

  it('library increases knowledge storage capacity by 100', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['library'],
      unlockedBuildings: ['library'],
      researchedTechs: ['writing'],
    }));

    // Base storageKnowledge is 200, library adds +100
    const maxKnowledge = engine.getMaxStorage('knowledge');
    expect(maxKnowledge).toBe(300);
  });

  it('a librarian consumes paper even without a paper source', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['library'],
      unlockedBuildings: ['library'],
      researchedTechs: ['writing'],
      workers: { librarian: 1 },
      resources: { paper: 0 },
    }));

    engine.runTicks(10);

    // Paper goes negative (librarian consumes 0.2/tick, no source to offset it)
    expect(engine.getState().resources.paper).toBeCloseTo(-2.0, 5);
  });
});
