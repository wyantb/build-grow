/**
 * Resources that can be traded at the market.
 *
 * Gold is deliberately absent: it is the medium of exchange, not a commodity.
 * Every tradable resource has a base factor, so a resource added later only
 * needs a factor to become tradable.
 */
export const MARKET_RESOURCES = ['wood', 'stone', 'food'] as const;

export type MarketResource = (typeof MARKET_RESOURCES)[number];

/**
 * Base value of one unit, in gold.
 *
 * The market pays `BUY_PRICE_MULTIPLIER` times this to sell to the player,
 * and takes `SELL_PRICE_MULTIPLIER` times this to buy from the player.
 */
export const RESOURCE_BASE_FACTORS: Record<MarketResource, number> = {
  wood: 0.5,
  stone: 0.75,
  food: 0.4,
};

/** Price the player pays to buy one unit, as a multiple of the base factor. */
export const BUY_PRICE_MULTIPLIER = 1.5;

/** Price the player receives for selling one unit, as a multiple of the base factor. */
export const SELL_PRICE_MULTIPLIER = 0.75;

/** Display metadata for the market rows. */
export const MARKET_RESOURCE_INFO: Record<MarketResource, { label: string; description: string }> = {
  wood: {
    label: 'Wood',
    description: 'The basic building material. Traded for gold and bought back for construction.',
  },
  stone: {
    label: 'Stone',
    description: 'Mined for sturdy buildings and fortifications.',
  },
  food: {
    label: 'Food',
    description: 'Keeps your population fed. A shortage stalls growth.',
  },
};

/** Price the player pays to buy one unit of `resource`. */
export const getBuyPrice = (resource: MarketResource): number =>
  RESOURCE_BASE_FACTORS[resource] * BUY_PRICE_MULTIPLIER;

/** Price the player receives for selling one unit of `resource`. */
export const getSellPrice = (resource: MarketResource): number =>
  RESOURCE_BASE_FACTORS[resource] * SELL_PRICE_MULTIPLIER;

/**
 * Gold the player spends per tick on the given buy allocation.
 *
 * Gold is not a tradable resource, so it never appears in an allocation map.
 */
export const getBuyCost = (allocations: Partial<Record<MarketResource, number>>): number => {
  let cost = 0;

  for (const resource of MARKET_RESOURCES) {
    cost += (allocations[resource] ?? 0) * getBuyPrice(resource);
  }

  return cost;
};

/**
 * Gold the player earns per tick from the given sell allocation.
 */
export const getSaleRevenue = (allocations: Partial<Record<MarketResource, number>>): number => {
  let revenue = 0;

  for (const resource of MARKET_RESOURCES) {
    revenue += (allocations[resource] ?? 0) * getSellPrice(resource);
  }

  return revenue;
};

/** True if `key` is a resource that can be traded. */
export const isMarketResource = (key: string): key is MarketResource =>
  (MARKET_RESOURCES as readonly string[]).includes(key);

/**
 * Total number of buy and sell slots in use.
 *
 * Each merchant can carry one buy and one sell slot, so the total must never
 * exceed twice the merchant count.
 */
export const countAllocations = (allocations: Partial<Record<MarketResource, number>>): number =>
  MARKET_RESOURCES.reduce((sum, resource) => sum + (allocations[resource] ?? 0), 0);

/** True if the allocations hold no slots. */
export const isEmptyAllocation = (allocations: Partial<Record<MarketResource, number>>): boolean =>
  countAllocations(allocations) === 0;

/** A zeroed allocation map over every tradable resource. */
export const emptyAllocations = (): Record<MarketResource, number> =>
  Object.fromEntries(MARKET_RESOURCES.map((resource) => [resource, 0])) as Record<MarketResource, number>;

/** The gold cost of a single unit of each tradable resource, for display. */
export const getGoldPriceTable = (): Record<MarketResource, { buy: number; sell: number }> =>
  Object.fromEntries(MARKET_RESOURCES.map((resource) => [resource, {
    buy: getBuyPrice(resource),
    sell: getSellPrice(resource),
  }])) as Record<MarketResource, { buy: number; sell: number }>;
