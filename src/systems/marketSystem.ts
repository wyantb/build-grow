import type { Resource, WorldState } from '../types/worldState.js';
import {
  MARKET_RESOURCES,
  UNITS_PER_TRADE_PER_TICK,
  getBuyPrice,
  getSellPrice,
  getTradeCapacity,
} from '../data/market.js';
import type { MarketResource } from '../data/market.js';

/**
 * Per-tick market orders.
 *
 * Gold is the medium of exchange and is never traded, so neither map holds
 * a gold entry. Each map holds one entry per tradable resource; the value is
 * the number of units bought or sold per tick.
 */
export interface MarketOrders {
  buys: Partial<Record<MarketResource, number>>;
  sells: Partial<Record<MarketResource, number>>;
}

/** A single market action the player can allocate. */
export type MarketAction = 'buy' | 'sell';

/** The state key that holds the allocations for `action`. */
const ALLOCATION_KEY: Record<MarketAction, 'buys' | 'sells'> = {
  buy: 'buys',
  sell: 'sells',
};

/** What the market will trade on the next tick. */
export interface TradePlan {
  /** Units taken from the player, per resource. */
  sold: Partial<Record<MarketResource, number>>;
  /** Units handed to the player, per resource. */
  bought: Partial<Record<MarketResource, number>>;
  /** Net change in gold. */
  goldChange: number;
}

/**
 * The market's flow, split by direction.
 *
 * The quantities are what actually settles, so a buy that cannot be paid
 * for is left out and a sale with nothing to sell is left out.
 */
export interface MarketFlow {
  /** Units bought per second, per resource. */
  bought: Partial<Record<MarketResource, number>>;
  /** Units sold per second, per resource. */
  sold: Partial<Record<MarketResource, number>>;
}

class MarketSystem {
  private state: WorldState;

  constructor(state: WorldState) {
    this.state = state;
  }

  /**
   * Number of merchants available to trade.
   *
   * A merchant only trades once a market has been built, so the count is
   * zero until then.
   */
  getMerchantCount(): number {
    const marketCount = this.state.buildingCounts['market'] ?? 0;
    if (marketCount <= 0) {return 0;}

    const merchantJob = this.state.jobs['merchant'];

    return merchantJob ? merchantJob.workers : 0;
  }

  /** True once a market has been built. */
  isMarketBuilt(): boolean {
    return (this.state.buildingCounts['market'] ?? 0) > 0;
  }

  /**
   * Caravanserai that are completed.
   *
   * Each one gives every merchant an extra trade position.
   */
  getCaravanseraiCount(): number {
    return this.state.buildingCounts['caravanserai'] ?? 0;
  }

  /** The price the player pays to buy one unit of `resource`. */
  getBuyPrice(resource: MarketResource): number {
    return getBuyPrice(resource);
  }

  /** The price the player receives for selling one unit of `resource`. */
  getSellPrice(resource: MarketResource): number {
    return getSellPrice(resource);
  }

  /**
   * Trades in use for `action`.
   *
   * A merchant offers `TRADES_PER_MERCHANT` trades per tick in each
   * direction, plus one more for each caravanserai, and every unit of an
   * order consumes one of them, so the total quantity may never exceed the
   * capacity the merchants provide.
   */
  getUsedTrades(action: MarketAction): number {
    const allocations = this.state.market[ALLOCATION_KEY[action]];

    return MARKET_RESOURCES.reduce(
      (sum, resource) => sum + (allocations[resource] ?? 0),
      0,
    );
  }

  /** Total trades per tick the merchants can carry, in each direction. */
  getTradeCapacity(): number {
    return getTradeCapacity(this.getMerchantCount(), this.getCaravanseraiCount());
  }

  /** Trades still free for `action`. */
  getFreeTrades(action: MarketAction): number {
    return Math.max(0, this.getTradeCapacity() - this.getUsedTrades(action));
  }

  /** The current per-tick orders. */
  getOrders(): MarketOrders {
    return {
      buys: { ...this.state.market.buys },
      sells: { ...this.state.market.sells },
    };
  }

  /**
   * Allocate `count` units of `resource` to be bought or sold per tick.
   *
   * Every unit of an order occupies one trade, so the total quantity for an
   * action may never exceed the capacity the merchants provide. Raising the
   * quantity of an existing order therefore needs a free trade just as
   * opening a new one does. When no trade is available the allocation is
   * refused rather than silently trimmed, so the UI can tell the player why
   * nothing happened.
   *
   * The capacity the merchants provide grows with the caravanserai, so an
   * order that was refused can become acceptable once one is finished.
   *
   * A resource is bought or sold per tick, never both, so an allocation in
   * one direction releases the order in the other.
   */
  setAllocation(action: MarketAction, resource: MarketResource, count: number): boolean {
    if (!MARKET_RESOURCES.includes(resource)) {return false;}
    if (!Number.isFinite(count) || count < 0) {return false;}

    const allocations = this.state.market[ALLOCATION_KEY[action]];
    const current = allocations[resource] ?? 0;

    // Releasing an order always frees its trades.
    if (count === 0) {
      delete allocations[resource];

      return true;
    }

    // The allocation needs `count - current` more trades than it holds now.
    const extra = count - current;
    if (extra > this.getFreeTrades(action)) {return false;}

    allocations[resource] = count;

    this.releaseOppositeAllocation(action, resource);

    return true;
  }

  /**
   * Release the buy and the sell order for `resource`.
   *
   * The resource stops being traded and the trades both orders held are
   * freed.
   */
  clearAllocations(resource: MarketResource): boolean {
    if (!MARKET_RESOURCES.includes(resource)) {return false;}

    delete this.state.market.buys[resource];
    delete this.state.market.sells[resource];

    return true;
  }

  /**
   * Release the order that runs in the opposite direction for `resource`.
   *
   * A resource is either bought or sold per tick, never both, so an order in
   * one direction gives up the order in the other.
   */
  private releaseOppositeAllocation(action: MarketAction, resource: MarketResource): void {
    const oppositeKey = action === 'buy' ? 'sells' : 'buys';

    delete this.state.market[oppositeKey][resource];
  }

  /**
   * Free the trades held by merchants that are no longer assigned.
   *
   * Sales are trimmed first, then buys. Within a direction the trade comes
   * off the bottom-most resource that holds one, so the last resource in
   * `MARKET_RESOURCES` order goes first.
   */
  trimAllocationsToMerchants(): void {
    const capacity = this.getTradeCapacity();

    while (this.getUsedTrades('sell') > capacity) {
      this.removeBottomMostTrade('sell');
    }

    while (this.getUsedTrades('buy') > capacity) {
      this.removeBottomMostTrade('buy');
    }
  }

  /**
   * Take one trade off the bottom-most resource that holds one.
   *
   * The order is dropped entirely once its last trade is removed.
   */
  private removeBottomMostTrade(action: MarketAction): void {
    const allocations = this.state.market[ALLOCATION_KEY[action]];

    for (let i = MARKET_RESOURCES.length - 1; i >= 0; i--) {
      const resource = MARKET_RESOURCES[i];
      if (!resource) {continue;}

      const count = allocations[resource] ?? 0;
      if (count <= 0) {continue;}

      if (count === 1) {
        delete allocations[resource];
      } else {
        allocations[resource] = count - 1;
      }

      return;
    }
  }

  /**
   * Work out what the market trades on the next tick.
   *
   * The plan is computed from the current state and applied by
   * `processTrades`, so the rates the UI shows always match what settles.
   *
   * An order holds a number of trade positions, and each position carries
   * `UNITS_PER_TRADE_PER_TICK` units, so the quantity actually traded is
   * the number of positions times that.
   */
  planTrades(): TradePlan {
    const plan: TradePlan = { sold: {}, bought: {}, goldChange: 0 };
    if (!this.isMarketBuilt()) {return plan;}

    const { buys, sells } = this.state.market;

    // Sales settle first, so their revenue can fund the buys.
    let gold = this.state.resources.gold;

    for (const resource of MARKET_RESOURCES) {
      const sellCount = sells[resource] ?? 0;
      if (sellCount <= 0) {continue;}

      // A sale is limited by what the player actually has.
      const wanted = sellCount * UNITS_PER_TRADE_PER_TICK;
      const sold = Math.min(wanted, this.state.resources[resource]);
      if (sold <= 0) {continue;}

      const revenue = sold * getSellPrice(resource);
      plan.sold[resource] = sold;
      plan.goldChange += revenue;
      gold += revenue;
    }

    for (const resource of MARKET_RESOURCES) {
      const buyCount = buys[resource] ?? 0;
      if (buyCount <= 0) {continue;}

      const price = getBuyPrice(resource);
      const wanted = buyCount * UNITS_PER_TRADE_PER_TICK;
      const affordable = Math.min(wanted, gold / price);
      if (affordable <= 0) {continue;}

      const cost = affordable * price;
      plan.bought[resource] = affordable;
      plan.goldChange -= cost;
      gold -= cost;
    }

    return plan;
  }

  /**
   * Execute the per-tick orders.
   *
   * Sales settle first so that a sale can fund a buy in the same tick.
   * A buy that cannot be paid for in full is filled partially; the other
   * orders still settle.
   */
  processTrades(): void {
    if (!this.isMarketBuilt()) {return;}

    this.trimAllocationsToMerchants();

    const plan = this.planTrades();

    for (const resource of MARKET_RESOURCES) {
      const sold = plan.sold[resource] ?? 0;
      if (sold > 0) {
        this.state.resources[resource] -= sold;
      }

      const bought = plan.bought[resource] ?? 0;
      if (bought > 0) {
        this.state.resources[resource] += bought;
      }
    }

    this.state.resources.gold += plan.goldChange;
  }

  /**
   * The units bought and sold per second, split by direction.
   *
   * The quantities come from the plan for the next tick, so they are what
   * actually settles: a buy that cannot be paid for is left out.
   */
  getFlow(ticksPerSecond: number): MarketFlow {
    const plan = this.planTrades();
    const flow: MarketFlow = { bought: {}, sold: {} };

    for (const resource of MARKET_RESOURCES) {
      const bought = plan.bought[resource];
      if (bought !== undefined) {
        flow.bought[resource] = bought * ticksPerSecond;
      }

      const sold = plan.sold[resource];
      if (sold !== undefined) {
        flow.sold[resource] = sold * ticksPerSecond;
      }
    }

    return flow;
  }

  /**
   * Net resource change per tick caused by the market orders.
   *
   * The engine folds this into the resource rates so the displayed rate
   * reflects what the market actually does.
   */
  getTickRates(): Resource {
    const rates: Resource = { wood: 0, stone: 0, food: 0, gold: 0, research: 0, clay: 0 };

    const plan = this.planTrades();

    for (const resource of MARKET_RESOURCES) {
      rates[resource] += (plan.bought[resource] ?? 0) - (plan.sold[resource] ?? 0);
    }
    rates.gold += plan.goldChange;

    return rates;
  }
}

export default MarketSystem;
export type { MarketResource };
