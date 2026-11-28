import { describe, it, expect } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';
import { TECHNOLOGIES } from '../../data/technologies.js';

describe('farm_houses technology', () => {
  it('the tech exists with the expected cost', () => {
    const tech = TECHNOLOGIES.farm_houses;
    expect(tech).toBeDefined();
    expect(tech.researchCost).toBe(300);
    expect(tech.prereqs).toContain('bronze_alloy');
  });

  it('adds housing for each farm once researched', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm'],
      researchedTechs: ['bronze_alloy'],
      resources: { research: 300 },
    }));

    const baseCapacity = engine.getPopulationCapacity();

    // Research the tech
    const ok = engine.researchTechnology('farm_houses');
    expect(ok).toBe(true);

    const techCapacity = engine.getPopulationCapacity();

    // Each farm adds 5 housing after researching farm_houses
    expect(techCapacity).toBe(baseCapacity + 5);
  });

  it('adds housing for multiple farms', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm', 'farm', 'farm'],
      researchedTechs: ['bronze_alloy'],
      resources: { research: 300 },
    }));

    engine.researchTechnology('farm_houses');

    // 3 farms × 5 housing each = 15 extra
    const extra = engine.getPopulationCapacity() - 5; // subtract base city center housing
    expect(extra).toBe(15);
  });

  it('housing does not apply before the tech is researched', () => {
    const engine = new GameEngine(createTestWorld({
      buildings: ['farm', 'farm'],
    }));

    // No tech means no housing bonus, even with farms built
    const capacity = engine.getPopulationCapacity();
    expect(capacity).toBe(5); // city center only, no huts, no farm houses
  });

  it('newly built farms get housing immediately when tech is already researched', () => {
    const engine = new GameEngine(createTestWorld({
      researchedTechs: ['bronze_alloy', 'farm_houses'],
    }));

    const before = engine.getPopulationCapacity();

    engine.addBuilding('farm');

    const after = engine.getPopulationCapacity();
    expect(after).toBe(before + 5);
  });
});
