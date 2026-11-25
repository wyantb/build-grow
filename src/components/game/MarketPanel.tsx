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
  getTradeCapacity,
} from '../../data/market.js';
import type { MarketResource } from '../../data/market.js';
import type { MarketAction } from '../../systems/marketSystem.js';

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

  /**
   * Gold spent or earned per tick by the market orders.
   *
   * The engine plans the tick's trades from the current state, so this is
   * what actually settles: a buy that cannot be paid for is not counted.
   */
  const goldPerTick = createMemo(() => gameState.getMarketTickRates().gold);

  const buyCount = (resource: MarketResource): number => orders().buys[resource] ?? 0;
  const sellCount = (resource: MarketResource): number => orders().sells[resource] ?? 0;

  const freeTrades = (action: MarketAction): number =>
    gameState.getFreeMarketTrades(action);

  /**
   * True when `step` units cannot be added to an order in `action`.
   *
   * Every unit of an order occupies one of the merchants' trades, so adding
   * to an order always needs that many free trades, whether it opens an
   * order or raises the quantity of an existing one.
   */
  const atCapacity = (action: MarketAction, step: number): boolean =>
    freeTrades(action) < step;

  /**
   * Add `step` units per tick to the order for `resource`.
   *
   * The engine releases the order running in the other direction, so a
   * resource is never bought and sold at the same time.
   */
  const raise = (action: MarketAction, resource: MarketResource, step: number): void => {
    const current = action === 'buy' ? buyCount(resource) : sellCount(resource);

    gameState.setMarketAllocation(action, resource, current + step);
  };

  /** Release the buy and the sell order for `resource`. */
  const clear = (resource: MarketResource): void => {
    gameState.clearMarketAllocation(resource);
  };

  const stepTooltip = (action: MarketAction, resource: MarketResource, step: number): string => {
    const label = MARKET_RESOURCE_INFO[resource].label;
    const verb = action === 'buy' ? 'Buy' : 'Sell';

    if (merchants() <= 0) {
      return `No merchants available. Assign a worker to the Merchant job to ${verb.toLowerCase()} ${label}.`;
    }

    const free = freeTrades(action);
    if (free < step) {
      const capacity = getTradeCapacity(merchants());

      return `No trade left. ${merchants()} merchant${merchants() === 1 ? '' : 's'} carr${merchants() === 1 ? 'ies' : 'y'} ${capacity} ${action} trade${capacity === 1 ? '' : 's'} per tick.`;
    }

    const opposite = action === 'buy' ? sellCount(resource) : buyCount(resource);
    const cancels = opposite > 0
      ? ` Cancels the ${action === 'buy' ? 'sell' : 'buy'} order.`
      : '';

    return `${verb} ${step} ${label} per tick. ${free} trade${free === 1 ? '' : 's'} left.${cancels}`;
  };

  const clearTooltip = (resource: MarketResource): string => {
    const label = MARKET_RESOURCE_INFO[resource].label;

    return `Stop trading ${label}. Sets the buy and the sell count to 0.`;
  };

  return (
    <div class="market-panel">
      <div class="market-summary">
        <span>
          Merchants: <strong>{merchants()}</strong>
        </span>
        <span>
          Gold/tick: <strong class={goldPerTick() >= 0 ? 'positive' : 'negative'}>
            {goldPerTick() >= 0 ? '+' : ''}{formatNumber(goldPerTick())}
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
                      <Tooltip content={stepTooltip('sell', resource, entry.step)} placement="top">
                        <button
                          class="market-btn market-btn-sell"
                          onClick={() => raise('sell', resource, entry.step)}
                          disabled={atCapacity('sell', entry.step)}
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
                      <Tooltip content={stepTooltip('buy', resource, entry.step)} placement="top">
                        <button
                          class="market-btn market-btn-buy"
                          onClick={() => raise('buy', resource, entry.step)}
                          disabled={atCapacity('buy', entry.step)}
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
        Merchants buy and sell every tick. Each merchant carries one buy and one sell
        trade per tick. A resource is bought or sold, never both, so a buy cancels
        the matching sale.
      </p>
    </div>
  );
};

export default MarketPanel;
