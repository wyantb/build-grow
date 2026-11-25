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

/**
 * Trade positions a single merchant provides per tick.
 *
 * A merchant provides one trade position capacity, which can be used for
 * either a buy or a sell order. Raising the total quantity of orders beyond
 * this capacity requires another merchant.
 */
export const TRADES_PER_MERCHANT = 1;

/**
 * Extra trade positions a single merchant gains per caravanserai.
 *
 * A caravanserai has no staff of its own; it gives every merchant room for
 * one more trade.
 */
export const TRADES_PER_CARAVANSERAI = 1;

/**
 * Total trade positions that `merchantCount` merchants can provide per tick.
 *
 * Each caravanserai adds a trade position to every merchant, so three
 * merchants and three caravanserai carry twelve positions.
 */
export const getTradeCapacity = (merchantCount: number, caravanseraiCount: number): number =>
  merchantCount * (TRADES_PER_MERCHANT + caravanseraiCount * TRADES_PER_CARAVANSERAI);

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
