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

  const freeSlots = (action: 'buy' | 'sell'): number =>
    gameState.getFreeMarketSlots(action);

  /**
   * True when the increment for `action` and `resource` cannot be applied.
   *
   * Raising the quantity of an existing order never needs a free slot; only
   * opening a new order does.
   */
  const atSlotLimit = (action: 'buy' | 'sell', resource: MarketResource): boolean => {
    const current = action === 'buy' ? buyCount(resource) : sellCount(resource);

    return current === 0 && freeSlots(action) <= 0;
  };

  const adjust = (action: 'buy' | 'sell', resource: MarketResource, delta: number): void => {
    const current = action === 'buy' ? buyCount(resource) : sellCount(resource);
    const next = Math.max(0, current + delta);

    if (next === current) {return;}

    gameState.setMarketAllocation(action, resource, next);
  };

  const slotTooltip = (action: 'buy' | 'sell', resource: MarketResource): string => {
    const label = MARKET_RESOURCE_INFO[resource].label;
    const verb = action === 'buy' ? 'Buy' : 'Sell';

    if (merchants() <= 0) {
      return `No merchants available. Assign a worker to the Merchant job to ${verb.toLowerCase()} ${label}.`;
    }

    const free = freeSlots(action);
    if (free <= 0) {
      return `All ${merchants()} merchant slot${merchants() === 1 ? '' : 's'} are in use.`;
    }

    return `${verb} ${label} per tick. ${free} slot${free === 1 ? '' : 's'} free.`;
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
          <span class="header-actions">Actions</span>
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
                  <Tooltip content={slotTooltip('buy', resource)} placement="top">
                    <button
                      class="market-btn"
                      onClick={() => adjust('buy', resource, 1)}
                      disabled={atSlotLimit('buy', resource)}
                    >
                      Buy
                    </button>
                  </Tooltip>
                  <span class="market-count" aria-label="Units bought per tick">
                    {buyCount(resource)}
                  </span>
                  <Tooltip content="Buy one less unit per tick." placement="top">
                    <button
                      class="market-btn market-btn-minus"
                      onClick={() => adjust('buy', resource, -1)}
                      disabled={buyCount(resource) <= 0}
                    >
                      -
                    </button>
                  </Tooltip>
                </div>

                <div class="market-action-group">
                  <Tooltip content={slotTooltip('sell', resource)} placement="top">
                    <button
                      class="market-btn market-btn-sell"
                      onClick={() => adjust('sell', resource, 1)}
                      disabled={atSlotLimit('sell', resource)}
                    >
                      Sell
                    </button>
                  </Tooltip>
                  <span class="market-count" aria-label="Units sold per tick">
                    {sellCount(resource)}
                  </span>
                  <Tooltip content="Sell one less unit per tick." placement="top">
                    <button
                      class="market-btn market-btn-minus"
                      onClick={() => adjust('sell', resource, -1)}
                      disabled={sellCount(resource) <= 0}
                    >
                      -
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      <p class="market-note">
        Merchants buy and sell every tick. Each merchant carries one buy and one sell order.
      </p>
    </div>
  );
};

export default MarketPanel;
