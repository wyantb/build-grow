import { describe, expect, it } from 'vitest';
import GameEngine from '../gameEngine.js';
import { createTestWorld } from './testWorld.js';
import {
  MARKET_RESOURCES,
  getBuyPrice,
  getSellPrice,
} from '../../data/market.js';

const TICKS_PER_SECOND = 5;

/** A world with a market and one merchant, ready to trade. */
const marketWorld = (overrides: Parameters<typeof createTestWorld>[0] = {}) => createTestWorld({
  population: 4,
  workers: { merchant: 1 },
  buildings: ['market'],
  ...overrides,
});

describe('Market availability', () => {
  it('has no market and no merchants before a market is built', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { merchant: 1 },
    }));

    expect(engine.isMarketBuilt()).toBe(false);
    expect(engine.getMerchantCount()).toBe(0);
  });

  it('becomes available once a market is built', () => {
    const engine = new GameEngine(marketWorld());

    expect(engine.isMarketBuilt()).toBe(true);
    expect(engine.getMerchantCount()).toBe(1);
  });

  it('reports no merchants when a market exists but none are assigned', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { unemployed: 4 },
      buildings: ['market'],
    }));

    expect(engine.isMarketBuilt()).toBe(true);
    expect(engine.getMerchantCount()).toBe(0);
  });

  it('does not trade while no market is built', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { merchant: 1 },
      resources: { wood: 100, gold: 100 },
      marketSells: { wood: 1 },
    }));

    engine.runTicks(10);

    // Without a market the sell order is inert.
    expect(engine.getState().resources.wood).toBe(100);
    expect(engine.getState().resources.gold).toBe(100);
  });
});

describe('Market allocation', () => {
  it('refuses a new order when every merchant trade is taken', () => {
    const engine = new GameEngine(marketWorld());

    expect(engine.setMarketAllocation('buy', 'wood', 1)).toBe(true);
    expect(engine.setMarketAllocation('buy', 'stone', 1)).toBe(false);
    expect(engine.getMarketOrders().buys['stone']).toBeUndefined();
  });

  it('accepts a new order up to the merchant count', () => {
    const engine = new GameEngine(marketWorld());

    expect(engine.setMarketAllocation('buy', 'wood', 1)).toBe(true);
    expect(engine.getMarketOrders().buys['wood']).toBe(1);
  });

  it('needs an extra merchant to raise the quantity of an existing order', () => {
    const engine = new GameEngine(marketWorld());

    // One merchant carries one trade, so a single unit is all it can offer.
    expect(engine.setMarketAllocation('buy', 'wood', 2)).toBe(false);
    expect(engine.getMarketOrders().buys['wood']).toBeUndefined();
    expect(engine.getFreeMarketTrades('buy')).toBe(1);
  });

  it('raises the quantity of an existing order when a trade is free', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
    }));

    expect(engine.setMarketAllocation('buy', 'wood', 1)).toBe(true);
    expect(engine.setMarketAllocation('buy', 'wood', 2)).toBe(true);
    expect(engine.getMarketOrders().buys['wood']).toBe(2);
    expect(engine.getFreeMarketTrades('buy')).toBe(0);
  });

  it('counts buy and sell trades separately', () => {
    const engine = new GameEngine(marketWorld());

    // One buy trade and one sell trade, both within the single merchant.
    expect(engine.setMarketAllocation('buy', 'wood', 1)).toBe(true);
    expect(engine.setMarketAllocation('sell', 'stone', 1)).toBe(true);
    expect(engine.getFreeMarketTrades('buy')).toBe(0);
    expect(engine.getFreeMarketTrades('sell')).toBe(0);
  });

  it('releases an order when the quantity drops to zero', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
    }));

    expect(engine.setMarketAllocation('buy', 'wood', 2)).toBe(true);
    expect(engine.setMarketAllocation('buy', 'wood', 0)).toBe(true);
    expect(engine.getMarketOrders().buys['wood']).toBeUndefined();
    expect(engine.getFreeMarketTrades('buy')).toBe(2);
  });

  it('refuses a negative or non-finite allocation', () => {
    const engine = new GameEngine(marketWorld());

    expect(engine.setMarketAllocation('buy', 'wood', -1)).toBe(false);
    expect(engine.setMarketAllocation('buy', 'wood', Number.NaN)).toBe(false);
    expect(engine.setMarketAllocation('buy', 'wood', Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects gold as a tradable resource', () => {
    const engine = new GameEngine(marketWorld());

    expect(engine.setMarketAllocation('buy', 'gold' as never, 1)).toBe(false);
    expect(engine.getMarketOrders().buys['gold' as never]).toBeUndefined();
    expect(MARKET_RESOURCES).not.toContain('gold');
  });

  it('drops a sale from the bottom-most resource when a merchant is removed', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
    }));
    engine.setMarketAllocation('sell', 'wood', 1);
    engine.setMarketAllocation('sell', 'food', 1);

    engine.assignWorkers('merchant', -1);

    // Food is the bottom-most resource, so it loses its sale first.
    expect(engine.getMarketOrders().sells['food']).toBeUndefined();
    expect(engine.getMarketOrders().sells['wood']).toBe(1);
  });

  it('takes one trade off a sale when a merchant is removed', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 3 },
    }));
    engine.setMarketAllocation('sell', 'wood', 3);

    engine.assignWorkers('merchant', -1);

    // The order keeps the trades the remaining merchants can carry.
    expect(engine.getMarketOrders().sells['wood']).toBe(2);
  });

  it('drops a buy when a merchant is removed and no sales remain', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
    }));
    engine.setMarketAllocation('buy', 'wood', 1);
    engine.setMarketAllocation('buy', 'stone', 1);

    engine.assignWorkers('merchant', -1);

    // Stone is the bottom-most resource among the remaining tradables.
    expect(engine.getMarketOrders().buys['stone']).toBeUndefined();
    expect(engine.getMarketOrders().buys['wood']).toBe(1);
  });
});

describe('Market settlement', () => {
  it('sells resources for gold every tick', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
      resources: { wood: 100 },
      marketSells: { wood: 2 },
    }));

    engine.runTicks(10);

    // 10 ticks at 2 wood per tick, sold at 0.375 gold each.
    expect(engine.getState().resources.wood).toBeCloseTo(100 - 10 * 2, 10);
    expect(engine.getState().resources.gold).toBeCloseTo(10 * 2 * getSellPrice('wood'), 10);
  });

  it('buys resources with gold every tick', () => {
    const engine = new GameEngine(marketWorld({
      resources: { gold: 100 },
      marketBuys: { stone: 1 },
    }));

    engine.runTicks(10);

    expect(engine.getState().resources.stone).toBeCloseTo(250 + 10, 10);
    expect(engine.getState().resources.gold).toBeCloseTo(100 - 10 * getBuyPrice('stone'), 10);
  });

  it('settles sales before buys so a sale can fund a buy', () => {
    const engine = new GameEngine(marketWorld({
      resources: { wood: 100, gold: 0 },
      marketSells: { wood: 1 },
      marketBuys: { stone: 1 },
    }));

    engine.runTicks(1);

    // The sale paid 0.375 gold, which is not enough for a 1.125 gold stone.
    expect(engine.getState().resources.stone).toBe(250);
    expect(engine.getState().resources.gold).toBeCloseTo(getSellPrice('wood'), 10);
  });

  it('skips a buy when there is not enough gold', () => {
    const engine = new GameEngine(marketWorld({
      resources: { gold: 0 },
      marketBuys: { stone: 1 },
    }));

    engine.runTicks(10);

    expect(engine.getState().resources.stone).toBe(250);
    expect(engine.getState().resources.gold).toBe(0);
  });

  it('sells only what is available', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 5 },
      resources: { wood: 1 },
      marketSells: { wood: 5 },
    }));

    engine.runTicks(1);

    expect(engine.getState().resources.wood).toBe(0);
    expect(engine.getState().resources.gold).toBeCloseTo(getSellPrice('wood'), 10);
  });
});

describe('Market rates', () => {
  it('includes a buy order in the resource and gold rates', () => {
    const engine = new GameEngine(marketWorld({
      resources: { gold: 100 },
      marketBuys: { wood: 1 },
    }));

    expect(engine.getTickRates().wood).toBeCloseTo(1, 10);
    expect(engine.getTickRates().gold).toBeCloseTo(-getBuyPrice('wood'), 10);
    expect(engine.getResourceRates().wood).toBeCloseTo(TICKS_PER_SECOND, 10);
    expect(engine.getResourceRates().gold).toBeCloseTo(-getBuyPrice('wood') * TICKS_PER_SECOND, 10);
  });

  it('includes a sell order in the resource and gold rates', () => {
    const engine = new GameEngine(marketWorld({
      resources: { wood: 100 },
      marketSells: { wood: 1 },
    }));

    expect(engine.getTickRates().wood).toBeCloseTo(-1, 10);
    expect(engine.getTickRates().gold).toBeCloseTo(getSellPrice('wood'), 10);
    expect(engine.getResourceRates().wood).toBeCloseTo(-TICKS_PER_SECOND, 10);
    expect(engine.getResourceRates().gold).toBeCloseTo(getSellPrice('wood') * TICKS_PER_SECOND, 10);
  });

  it('omits a buy order that cannot be paid for', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
      resources: { gold: 0 },
      marketBuys: { wood: 2 },
    }));

    expect(engine.getTickRates().wood).toBe(0);
    expect(engine.getTickRates().gold).toBe(0);
    expect(engine.getMarketTickRates().wood).toBe(0);
    expect(engine.getMarketTickRates().gold).toBe(0);
  });

  it('counts only the part of a buy order that the gold covers', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 2 },
      resources: { gold: getBuyPrice('wood') },
      marketBuys: { wood: 2 },
    }));

    expect(engine.getTickRates().wood).toBeCloseTo(1, 10);
    expect(engine.getTickRates().gold).toBeCloseTo(-getBuyPrice('wood'), 10);
  });

  it('omits a sell order that has nothing to sell', () => {
    const engine = new GameEngine(marketWorld({
      workers: { merchant: 3 },
      resources: { wood: 0 },
      marketSells: { wood: 3 },
    }));

    expect(engine.getTickRates().wood).toBe(0);
    expect(engine.getTickRates().gold).toBe(0);
  });

  it('reports no market flow without a market', () => {
    const engine = new GameEngine(createTestWorld({
      population: 4,
      workers: { merchant: 1 },
      marketBuys: { wood: 1 },
    }));

    expect(engine.getTickRates().wood).toBe(0);
    expect(engine.getTickRates().gold).toBe(0);
  });
});
