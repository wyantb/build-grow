import type { Resource, WorldState } from '../types/worldState.js';
import {
  MARKET_RESOURCES,
  getBuyPrice,
  getSellPrice,
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
interface TradePlan {
  /** Units taken from the player, per resource. */
  sold: Partial<Record<MarketResource, number>>;
  /** Units handed to the player, per resource. */
  bought: Partial<Record<MarketResource, number>>;
  /** Net change in gold. */
  goldChange: number;
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

  /** The price the player pays to buy one unit of `resource`. */
  getBuyPrice(resource: MarketResource): number {
    return getBuyPrice(resource);
  }

  /** The price the player receives for selling one unit of `resource`. */
  getSellPrice(resource: MarketResource): number {
    return getSellPrice(resource);
  }

  /**
   * Number of orders in use for `action`.
   *
   * Each merchant carries one buy order and one sell order, so the count of
   * orders may never exceed the merchant count. An order is a resource and
   * a per-tick quantity; its quantity does not consume extra slots.
   */
  getUsedSlots(action: MarketAction): number {
    const allocations = this.state.market[ALLOCATION_KEY[action]];

    return MARKET_RESOURCES.reduce(
      (sum, resource) => sum + (allocations[resource] ? 1 : 0),
      0,
    );
  }

  /** Slots still free for `action`. */
  getFreeSlots(action: MarketAction): number {
    return Math.max(0, this.getMerchantCount() - this.getUsedSlots(action));
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
   * Starting a new order needs a free slot; raising the quantity of an
   * existing order does not. When no slot is available the allocation is
   * refused rather than silently trimmed, so the UI can tell the player
   * why nothing happened.
   */
  setAllocation(action: MarketAction, resource: MarketResource, count: number): boolean {
    if (!MARKET_RESOURCES.includes(resource)) {return false;}
    if (!Number.isFinite(count) || count < 0) {return false;}

    const allocations = this.state.market[ALLOCATION_KEY[action]];
    const current = allocations[resource] ?? 0;
    if (count === current) {return true;}

    // Releasing an order never needs a slot.
    if (count === 0) {
      delete allocations[resource];

      return true;
    }

    // Opening an order needs a free slot.
    if (current === 0 && this.getFreeSlots(action) <= 0) {return false;}

    allocations[resource] = count;

    return true;
  }

  /**
   * Free the slots held by merchants that are no longer assigned.
   *
   * Removing a merchant drops one sale order first, taken from the
   * bottom-most resource that holds one. If there are no sales left, a buy
   * order is dropped from the bottom-most resource instead.
   */
  trimAllocationsToMerchants(): void {
    const merchants = this.getMerchantCount();

    while (this.getUsedSlots('sell') > merchants) {
      this.removeBottomMostOrder('sell');
    }

    while (this.getUsedSlots('buy') > merchants) {
      this.removeBottomMostOrder('buy');
    }
  }

  /**
   * Drop the order held by the bottom-most resource that has one.
   */
  private removeBottomMostOrder(action: MarketAction): void {
    const allocations = this.state.market[ALLOCATION_KEY[action]];

    for (let i = MARKET_RESOURCES.length - 1; i >= 0; i--) {
      const resource = MARKET_RESOURCES[i];
      if (!resource) {continue;}

      if (allocations[resource]) {
        delete allocations[resource];

        return;
      }
    }
  }

  /**
   * Work out what the market trades on the next tick.
   *
   * The plan is computed from the current state and applied by
   * `processTrades`, so the rates the UI shows always match what settles.
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
      const sold = Math.min(sellCount, this.state.resources[resource]);
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
      const affordable = Math.min(buyCount, Math.floor(gold / price));
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
   * Net resource change per tick caused by the market orders.
   *
   * The engine folds this into the resource rates so the displayed rate
   * reflects what the market actually does.
   */
  getTickRates(): Resource {
    const rates: Resource = { wood: 0, stone: 0, food: 0, gold: 0 };

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
