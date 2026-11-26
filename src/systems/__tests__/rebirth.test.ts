import { describe, expect, it } from 'vitest';
import GameEngine, { REBIRTH_GOLD_COST } from '../gameEngine.js';
import {
  getBestStatIncrease,
  getRebirthStats,
  rollStatIncrease,
  ONE_POINT_CHANCE,
  THREE_POINT_CHANCE,
  TWO_POINT_CHANCE,
} from '../rebirth.js';
import { DEFAULT_SPECIES_ID, NEUTRAL_STATS } from '../../data/species.js';
import { deserializePayload, serializeState } from '../saveSystem.js';
import type { Stats } from '../../types/worldState.js';

/**
 * A random number generator that walks a fixed list of rolls.
 *
 * Each call takes the next number in the list, and the last number is used
 * again once the list runs out, so a test can say exactly what the roll
 * should be.
 */
const fixedRandom = (rolls: number[]): (() => number) => {
  let index = 0;

  return () => rolls[Math.min(index++, rolls.length - 1)] ?? 0;
};

/**
 * A random number generator that always gives the same number.
 */
const constantRandom = (value: number): (() => number) => () => value;

/**
 * A world with a given amount of gold.
 */
const worldWithGold = (gold: number): GameEngine => {
  const engine = new GameEngine();
  engine.getState().resources.gold = gold;

  return engine;
};

/**
 * The stats of the default species in a world.
 */
const defaultStats = (engine: GameEngine): Stats =>
  engine.getState().species[DEFAULT_SPECIES_ID]?.stats ?? NEUTRAL_STATS;

describe('a stat roll', () => {
  it('gives the biggest improvement for the smallest roll', () => {
    expect(rollStatIncrease(constantRandom(0))).toBe(3);
  });

  it('gives no improvement for a roll past the last chance', () => {
    expect(rollStatIncrease(constantRandom(0.999999))).toBe(0);
  });

  it('reads the chances in order, from the rarest to the commonest', () => {
    // Just inside the three point chance.
    expect(rollStatIncrease(constantRandom(THREE_POINT_CHANCE - 0.0001))).toBe(3);

    // Just past the three point chance, inside the two point chance.
    expect(rollStatIncrease(constantRandom(THREE_POINT_CHANCE + 0.0001))).toBe(2);

    // Just past the two point chance, inside the one point chance.
    expect(rollStatIncrease(constantRandom(THREE_POINT_CHANCE + TWO_POINT_CHANCE + 0.0001))).toBe(1);

    // Just past the one point chance.
    expect(rollStatIncrease(constantRandom(THREE_POINT_CHANCE + TWO_POINT_CHANCE + ONE_POINT_CHANCE + 0.0001))).toBe(0);
  });
});

describe('the improvement a population passes on', () => {
  it('takes the best roll, not the last one', () => {
    // A three point roll first, then nothing. The best of the two is three.
    const increase = getBestStatIncrease(2, fixedRandom([0, 0.99]));

    expect(increase).toBe(3);
  });

  it('is nothing when nobody passes on anything', () => {
    expect(getBestStatIncrease(20, constantRandom(0.99))).toBe(0);
  });

  it('is nothing for a population of no one', () => {
    expect(getBestStatIncrease(0, constantRandom(0))).toBe(0);
  });

  it('grows with the size of the population', () => {
    // A three point roll in every population, but fewer people means fewer
    // chances to get it.
    const one = getBestStatIncrease(1, fixedRandom([0.99, 0]));
    const many = getBestStatIncrease(20, fixedRandom([0.99, 0]));

    expect(one).toBe(0);
    expect(many).toBe(3);
  });
});

describe('the stats after a rebirth', () => {
  it('raises each core stat by the best roll of the population', () => {
    // Six stats, each rolled twice: once for nothing, once for three points.
    const rolls = [0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0];
    const next = getRebirthStats(NEUTRAL_STATS, 2, fixedRandom(rolls));

    expect(next.strength).toBe(103);
    expect(next.dexterity).toBe(103);
    expect(next.constitution).toBe(103);
    expect(next.intelligence).toBe(103);
    expect(next.wisdom).toBe(103);
    expect(next.charisma).toBe(103);
  });

  it('never raises mana sensitivity', () => {
    // Every roll gives three points, so every core stat goes up by three.
    const next = getRebirthStats(NEUTRAL_STATS, 5, constantRandom(0));

    expect(next.manaSensitivity).toBe(NEUTRAL_STATS.manaSensitivity);
    expect(next.strength).toBe(NEUTRAL_STATS.strength + 3);
  });

  it('never lowers a stat', () => {
    const next = getRebirthStats(NEUTRAL_STATS, 50, constantRandom(0.99));

    for (const name of Object.keys(NEUTRAL_STATS) as (keyof Stats)[]) {
      expect(next[name]).toBeGreaterThanOrEqual(NEUTRAL_STATS[name]);
    }
  });
});

describe('the gold a rebirth needs', () => {
  it('is not enough below a thousand gold', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST - 1);

    expect(engine.canRebirth()).toBe(false);
    expect(engine.beginRebirth()).toBe(false);
  });

  it('is enough at a thousand gold', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    expect(engine.canRebirth()).toBe(true);
    expect(engine.beginRebirth()).toBe(true);
  });
});

describe('starting a rebirth', () => {
  it('holds the stats before and the stats after', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const pending = engine.getPendingRebirth();

    expect(pending).not.toBeNull();
    expect(pending?.before[DEFAULT_SPECIES_ID]?.strength).toBe(80);
    expect(pending?.after[DEFAULT_SPECIES_ID]?.strength).toBeGreaterThanOrEqual(80);
  });

  it('does not roll again when it is already pending', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const first = engine.getPendingRebirth();

    expect(engine.beginRebirth()).toBe(false);
    expect(engine.getPendingRebirth()).toEqual(first);
  });

  it('leaves the world alone until it is confirmed', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const state = engine.getState();

    expect(engine.getPopulation()).toBe(5);
    expect(state.resources.gold).toBe(REBIRTH_GOLD_COST);
    expect(state.buildingCounts['hut']).toBe(1);
  });
});

describe('confirming a rebirth', () => {
  it('starts a new world with the same population and the same hut', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();
    engine.confirmRebirth();

    const state = engine.getState();

    expect(engine.getPopulation()).toBe(5);
    expect(state.buildingCounts['hut']).toBe(1);
    expect(state.resources.gold).toBe(0);
    expect(state.resources.wood).toBe(250);
  });

  it('gives the population the stats the rebirth promised', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const promised = engine.getPendingRebirth()?.after[DEFAULT_SPECIES_ID];

    engine.confirmRebirth();

    expect(defaultStats(engine).strength).toBe(promised?.strength);
    expect(defaultStats(engine).manaSensitivity).toBe(5);
  });

  it('leaves no pending rebirth behind', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();
    engine.confirmRebirth();

    expect(engine.getPendingRebirth()).toBeNull();
  });

  it('does nothing when no rebirth is pending', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    expect(engine.confirmRebirth()).toBe(false);
  });

  it('leaves the world with the raised stats when it is unlucky', () => {
    // Every roll gives nothing, so the population ends up where it started.
    const engine = new GameEngine(undefined, () => 0.999999);

    engine.getState().resources.gold = REBIRTH_GOLD_COST;

    engine.beginRebirth();
    engine.confirmRebirth();

    expect(defaultStats(engine).strength).toBe(80);
  });
});

describe('cancelling a rebirth', () => {
  it('leaves the world exactly as it was', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();
    engine.cancelRebirth();

    const state = engine.getState();

    expect(engine.getPendingRebirth()).toBeNull();
    expect(engine.getPopulation()).toBe(5);
    expect(state.resources.gold).toBe(REBIRTH_GOLD_COST);
  });

  it('does nothing when no rebirth is pending', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    expect(engine.cancelRebirth()).toBe(false);
  });
});

describe('saving a pending rebirth', () => {
  it('keeps the stats the player was shown', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const pending = engine.getPendingRebirth();

    const loaded = deserializePayload(serializeState(engine.getState()));

    expect(loaded.pendingRebirth?.after[DEFAULT_SPECIES_ID]?.strength)
      .toBe(pending?.after[DEFAULT_SPECIES_ID]?.strength);
    expect(loaded.pendingRebirth?.before[DEFAULT_SPECIES_ID]?.strength).toBe(80);
  });

  it('has no pending rebirth in a world that was not reborn', () => {
    const engine = new GameEngine();

    const loaded = deserializePayload(serializeState(engine.getState()));

    expect(loaded.pendingRebirth).toBeUndefined();
  });
});

describe('a pending rebirth that crosses a reload', () => {
  it('gives the player the same numbers after a reload', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const shown = engine.getPendingRebirth();

    // The world is saved and loaded again, the way a reload does it.
    const loaded = deserializePayload(serializeState(engine.getState()));
    const reloaded = new GameEngine(loaded);

    expect(reloaded.getPendingRebirth()?.after[DEFAULT_SPECIES_ID]?.strength)
      .toBe(shown?.after[DEFAULT_SPECIES_ID]?.strength);

    reloaded.confirmRebirth();

    expect(reloaded.getState().species[DEFAULT_SPECIES_ID]?.stats.strength)
      .toBe(shown?.after[DEFAULT_SPECIES_ID]?.strength);
  });

  it('drops a species the catalog does not know about', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.beginRebirth();

    const payload = serializeState(engine.getState());

    payload.pendingRebirth!.after['dragon'] = { ...payload.pendingRebirth!.after[DEFAULT_SPECIES_ID]! };
    payload.pendingRebirth!.before['dragon'] = { ...payload.pendingRebirth!.before[DEFAULT_SPECIES_ID]! };

    const loaded = deserializePayload(payload);

    expect(loaded.pendingRebirth?.after['dragon']).toBeUndefined();
    expect(loaded.pendingRebirth?.after[DEFAULT_SPECIES_ID]).toBeDefined();
  });
});

describe('a multi-race rebirth', () => {
  it('grants the chosen species even when they are not in createInitialState', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    // Seed the pool and add an elf to the species roster so beginRebirth
    // will roll stats for it.
    engine.getState().rebirthPool = { human: 5, elf: 1 };
    engine.getState().species['elf'] = {
      id: 'elf',
      name: 'Elf',
      description: 'Long-lived and quick to learn.',
      stats: { strength: 95, dexterity: 120, constitution: 105, intelligence: 120, wisdom: 120, charisma: 120, manaSensitivity: 100 },
      count: 0,
    };

    engine.beginRebirth();

    // Player chooses 3 humans and 2 elves.
    engine.setComposition({ human: 3, elf: 2 });
    engine.confirmRebirth();

    const state = engine.getState();

    // Both species exist in the new world.
    expect(state.species['human']).toBeDefined();
    expect(state.species['elf']).toBeDefined();
    expect(state.species['human']?.count).toBe(3);
    expect(state.species['elf']?.count).toBe(2);
    expect(engine.getPopulation()).toBe(5);
  });

  it('carries the improved stats to a species added from the composition', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    // Seed the pool so the elf is available.
    engine.getState().rebirthPool = { human: 5, elf: 1 };
    engine.getState().species['elf'] = {
      id: 'elf',
      name: 'Elf',
      description: 'Long-lived and quick to learn.',
      stats: { strength: 95, dexterity: 120, constitution: 105, intelligence: 120, wisdom: 120, charisma: 120, manaSensitivity: 100 },
      count: 1,
    };

    engine.beginRebirth();

    const promisedElfStats = engine.getPendingRebirth()?.after['elf'];

    expect(promisedElfStats).toBeDefined();

    engine.setComposition({ human: 2, elf: 3 });
    engine.confirmRebirth();

    // The elf in the new world has the improved stats.
    const elfEntry = engine.getState().species['elf'];

    expect(elfEntry).toBeDefined();
    expect(elfEntry?.stats.strength).toBe(promisedElfStats!.strength);
  });

  it('survives a save / reload so the elf is available on the next rebirth', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    // First rebirth: confirm it and verify the pool grows.
    engine.beginRebirth();
    engine.setComposition({ human: 5 });
    engine.confirmRebirth();

    // The new world should have one elf in the pool.
    expect(engine.getRebirthPool()).toEqual({ human: 5, elf: 1 });

    // Simulate a page reload: serialize the world, deserialize it, create a
    // new engine from the loaded state.
    const payload = serializeState(engine.getState());
    expect(payload.rebirthPool).toEqual({ human: 5, elf: 1 });

    const loaded = deserializePayload(payload);
    expect(loaded.rebirthPool).toEqual({ human: 5, elf: 1 });

    const reloaded = new GameEngine(loaded);

    // The loaded engine sees the same pool.
    expect(reloaded.getRebirthPool()).toEqual({ human: 5, elf: 1 });

    // After reaching the gold threshold again, beginRebirth should show the
    // elf in the pending stats, which is what the UI's availableRaces memo
    // checks.
    reloaded.getState().resources.gold = REBIRTH_GOLD_COST;
    reloaded.beginRebirth();

    const pending = reloaded.getPendingRebirth();

    expect(pending?.before['elf']).toBeDefined();
    expect(pending?.after['elf']).toBeDefined();
  });

  it('populates the species roster so the population is the sum of species', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.getState().rebirthPool = { human: 4, elf: 1 };
    engine.getState().species['elf'] = {
      id: 'elf',
      name: 'Elf',
      description: 'Long-lived and quick to learn.',
      stats: { strength: 95, dexterity: 120, constitution: 105, intelligence: 120, wisdom: 120, charisma: 120, manaSensitivity: 100 },
      count: 0,
    };

    engine.beginRebirth();
    engine.setComposition({ human: 4, elf: 1 });
    engine.confirmRebirth();

    const state = engine.getState();

    // The population equals the sum of species counts.
    const speciesSum = Object.values(state.species)
      .reduce((s: number, e) => s + e.count, 0);
    expect(engine.getPopulation()).toBe(speciesSum);
    expect(engine.getPopulation()).toBe(5);

    // The elf is in the species roster.
    expect(state.species['elf']?.count).toBe(1);
    expect(state.species['human']?.count).toBe(4);

    // All people are accounted for in jobs.
    const jobTotal = Object.values(state.jobs)
      .reduce((s: number, j) => s + j.workers, 0);
    expect(jobTotal).toBe(5);
  });

  it('derives population from species after a save and reload', () => {
    const engine = worldWithGold(REBIRTH_GOLD_COST);

    engine.getState().rebirthPool = { human: 3, elf: 2 };
    engine.getState().species['elf'] = {
      id: 'elf',
      name: 'Elf',
      description: 'Long-lived and quick to learn.',
      stats: { strength: 95, dexterity: 120, constitution: 105, intelligence: 120, wisdom: 120, charisma: 120, manaSensitivity: 100 },
      count: 0,
    };

    engine.beginRebirth();
    engine.setComposition({ human: 3, elf: 2 });
    engine.confirmRebirth();

    expect(engine.getPopulation()).toBe(5);

    // Save and reload the world.
    const payload = serializeState(engine.getState());
    const loaded = deserializePayload(payload);
    const reloaded = new GameEngine(loaded);

    // Population is still the sum of species counts after reload.
    const speciesSum = Object.values(reloaded.getState().species)
      .reduce((s: number, e) => s + e.count, 0);
    expect(reloaded.getPopulation()).toBe(speciesSum);
    expect(reloaded.getPopulation()).toBe(5);
  });
});
