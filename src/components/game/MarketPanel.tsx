import { For, createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';
import {
  MARKET_RESOURCE_INFO,
  MARKET_RESOURCES,
  getBuyPrice,
  getSellPrice,
} from '../../data/market.js';
import type { MarketResource } from '../../data/market.js';

/** The steps offered on the sell side of a row, in the order they are shown. */
const SELL_STEPS = [
  { step: 5, label: '--' },
  { step: 1, label: '-' },
] as const;

/** The steps offered on the buy side of a row, in the order they are shown. */
const BUY_STEPS = [
  { step: 1, label: '+' },
  { step: 5, label: '++' },
] as const;

const MarketPanel: Component = () => {
  const gameState = getGameState();

  const orders = createMemo(() => gameState.getMarketOrders());
  const merchants = createMemo(() => gameState.getMerchantCount());
  const capacity = createMemo(() => gameState.getMarketTradeCapacity());
  const caravanserai = createMemo(() => gameState.getCaravanseraiCount());

  /**
   * Gold spent or earned per second by the market orders.
   *
   * The engine plans the tick's trades from the current state, so this is
   * what actually settles: a buy that cannot be paid for is not counted.
   * This is the market's own rate, so a job that makes gold is not in it.
   */
  const goldPerSecond = createMemo(() => gameState.getMarketRates().gold);

  /**
   * The units bought and sold per second.
   *
   * The engine plans the tick's trades from the current state, so this is
   * what actually settles.
   */
  const flow = createMemo(() => gameState.getMarketFlow());

  const buyCount = (resource: MarketResource): number => orders().buys[resource] ?? 0;
  const sellCount = (resource: MarketResource): number => orders().sells[resource] ?? 0;

  /**
   * Adjust the net order for `resource` by `step` units per tick.
   *
   * Positive steps increase net buys or decrease net sells.
   * Negative steps increase net sells or decrease net buys.
   *
   * Examples:
   * - Sell count is 1, click +1 buy -> net becomes 0 (1 sell - 1 buy = 0)
   * - Sell count is 2, click +1 buy -> net becomes 1 sell (2 sell - 1 buy = 1 sell)
   * - Buy count is 2, click -5 sell -> net becomes 3 sell (2 buy - 5 sell = 3 sell)
   * - Net is 0, click +1 buy -> net becomes 1 buy
   * - Net is 1 sell, click +5 buy -> net becomes 4 buy (5 buy - 1 sell = 4 buy)
   */
  const adjust = (resource: MarketResource, step: number): void => {
    const currentBuy = buyCount(resource);
    const currentSell = sellCount(resource);

    // Calculate net position: positive = buy, negative = sell
    const netPosition = currentBuy - currentSell;
    const newNetPosition = netPosition + step;

    if (newNetPosition > 0) {
      // Positive net = buy
      gameState.setMarketAllocation('buy', resource, newNetPosition);
      gameState.setMarketAllocation('sell', resource, 0);
    } else if (newNetPosition < 0) {
      // Negative net = sell
      gameState.setMarketAllocation('buy', resource, 0);
      gameState.setMarketAllocation('sell', resource, Math.abs(newNetPosition));
    } else {
      // Zero net = clear both
      gameState.clearMarketAllocation(resource);
    }
  };

  /** Release the buy and the sell order for `resource`. */
  const clear = (resource: MarketResource): void => {
    gameState.clearMarketAllocation(resource);
  };

  const stepTooltip = (resource: MarketResource, step: number): string => {
    const label = MARKET_RESOURCE_INFO[resource].label;
    const verb = step > 0 ? 'Buy' : 'Sell';

    if (merchants() <= 0) {
      return `No merchants available. Assign a worker to the Merchant job to ${verb.toLowerCase()} ${label}.`;
    }

    // Calculate what the new net position would be
    const currentBuy = buyCount(resource);
    const currentSell = sellCount(resource);
    const netPosition = currentBuy - currentSell;
    const newNetPosition = netPosition + step;

    if (newNetPosition > 0) {
      return `Set net position to ${newNetPosition} buy${newNetPosition > 1 ? 's' : ''} per tick.`;
    } if (newNetPosition < 0) {
      return `Set net position to ${Math.abs(newNetPosition)} sell${Math.abs(newNetPosition) > 1 ? 's' : ''} per tick.`;
    }

    return `Set net position to 0 (no trading).`;

  };

  const clearTooltip = (resource: MarketResource): string => {
    const label = MARKET_RESOURCE_INFO[resource].label;

    return `Stop trading ${label}. Sets the buy and the sell count to 0.`;
  };

  /**
   * True when a step adjustment can be applied to `resource`.
   *
   * Enforces that total trades cannot exceed the trade capacity.
   * Each merchant provides one trade position, plus one more per caravanserai.
   * Buttons are enabled/disabled based on available trade positions:
   * - 1 sell, no merchants available: sell side is all disabled, 0 and buy side is enabled
   * - 2 buy, 3 merchants available: all trade buttons everywhere available
   * - 0 buy/sell, 1 merchant available: both sell and buy sides enabled
   * - 0 buy/sell, 0 merchants available: both sell and buy sides disabled
   */
  const canAdjust = (resource: MarketResource, step: number): boolean => {
    if (capacity() <= 0) {
      return false;
    }

    const currentBuy = buyCount(resource);
    const currentSell = sellCount(resource);

    // Calculate current total trades being maintained
    const currentTotalTrades = Object.values(orders().buys).reduce((sum, count) => sum + count, 0)
                              + Object.values(orders().sells).reduce((sum, count) => sum + count, 0);

    // Calculate what the new net position would be for this resource
    const netPosition = currentBuy - currentSell;
    const newNetPosition = netPosition + step;

    // Calculate how many trades this resource would need after adjustment
    const currentResourceTrades = currentBuy + currentSell;
    const newResourceTrades = Math.abs(newNetPosition);

    // Calculate the new total trades (current total minus this resource's current trades plus this resource's new trades)
    const newTotalTrades = currentTotalTrades - currentResourceTrades + newResourceTrades;

    // Check if we have enough capacity
    return newTotalTrades <= capacity();
  };

  return (
    <div class="market-panel">
      <div class="market-summary">
        <Tooltip
          content={
            <div>
              Trade Capacity: {capacity()} (from {merchants()} merchant{merchants() !== 1 ? 's' : ''}
              {caravanserai() > 0 && `, ${caravanserai()} caravanserai${caravanserai() !== 1 ? 's' : ''}`})
              <hr />
              {Object.values(orders().buys).some(count => count > 0) && (
                <>
                  Buying:
                  <For each={Object.entries(orders().buys)}>{([resource, count]) =>
                    count > 0 ? <div>{count} {resource} (costs {formatNumber(getBuyPrice(resource as MarketResource) * (flow().bought[resource as MarketResource] ?? 0))}/s)</div> : null}</For>
                </>
              )}
              {Object.values(orders().buys).some(count => count > 0) && Object.values(orders().sells).some(count => count > 0) && <br />}
              {Object.values(orders().sells).some(count => count > 0) && (
                <>
                  Selling:
                  <For each={Object.entries(orders().sells)}>{([resource, count]) =>
                    count > 0 ? <div>{count} {resource} (gains {formatNumber(getSellPrice(resource as MarketResource) * (flow().sold[resource as MarketResource] ?? 0))}/s)</div> : null}</For>
                </>
              )}
            </div>
          }
          placement="top"
        >
          <span>
            Trades Maintained: <strong>{Object.values(orders().buys).reduce((sum, count) => sum + count, 0) + Object.values(orders().sells).reduce((sum, count) => sum + count, 0)}/{capacity()}</strong>
          </span>
        </Tooltip>
        <span>
          Gold/s: <strong class={goldPerSecond() >= 0 ? 'positive' : 'negative'}>
            {goldPerSecond() >= 0 ? '+' : ''}{formatNumber(goldPerSecond())}
          </strong>
        </span>
      </div>

      <div class="market-table">
        <div class="market-header">
          <span class="header-name">Name</span>
          <span class="header-price">Current Buy Price</span>
          <span class="header-actions">Sell / Buy Count</span>
        </div>

        <For each={[...MARKET_RESOURCES]}>
          {(resource) => (
            <div class="market-row">
              <Tooltip content={MARKET_RESOURCE_INFO[resource].description} placement="right">
                <span class="market-name">{MARKET_RESOURCE_INFO[resource].label}</span>
              </Tooltip>

              <Tooltip
                content={`Sells at ${formatNumber(getSellPrice(resource))}g per unit.`}
                placement="right"
              >
                <span class="market-price">{formatNumber(getBuyPrice(resource))}g</span>
              </Tooltip>

              <div class="market-actions">
                <div class="market-action-group">
                  <For each={[...SELL_STEPS]}>
                    {(entry) => (
                      <Tooltip content={stepTooltip(resource, -entry.step)} placement="top">
                        <button
                          class="market-btn market-btn-sell"
                          onClick={() => adjust(resource, -entry.step)}
                          disabled={!canAdjust(resource, -entry.step)}
                        >
                          {entry.label}
                        </button>
                      </Tooltip>
                    )}
                  </For>
                  <span class="market-count market-count-sell" aria-label="Units sold per tick">
                    {sellCount(resource)}
                  </span>
                </div>

                <Tooltip content={clearTooltip(resource)} placement="top">
                  <button
                    class="market-btn market-btn-clear"
                    onClick={() => clear(resource)}
                    disabled={sellCount(resource) <= 0 && buyCount(resource) <= 0}
                  >
                    0
                  </button>
                </Tooltip>

                <div class="market-action-group">
                  <span class="market-count market-count-buy" aria-label="Units bought per tick">
                    {buyCount(resource)}
                  </span>
                  <For each={[...BUY_STEPS]}>
                    {(entry) => (
                      <Tooltip content={stepTooltip(resource, entry.step)} placement="top">
                        <button
                          class="market-btn market-btn-buy"
                          onClick={() => adjust(resource, entry.step)}
                          disabled={!canAdjust(resource, entry.step)}
                        >
                          {entry.label}
                        </button>
                      </Tooltip>
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      <p class="market-note">
        Merchants buy and sell every tick. Each trade position carries half a unit
        per tick. A resource is bought or sold, never both, so a buy cancels
        the matching sale.
      </p>
    </div>
  );
};

export default MarketPanel;
