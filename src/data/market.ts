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
 * Trades a single merchant offers per tick, per direction.
 *
 * A merchant carries one buy trade and one sell trade, so their capacity is
 * one unit of each per tick. Raising the quantity of an order beyond this
 * needs another merchant.
 */
export const TRADES_PER_MERCHANT = 1;

/**
 * Trades per tick that `merchantCount` merchants can carry, in each direction.
 */
export const getTradeCapacity = (merchantCount: number): number =>
  merchantCount * TRADES_PER_MERCHANT;

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
