import { For } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';
import type { Resource } from '../../types/worldState.js';

const MarketPanel: Component = () => {
  const gameState = getGameState();

  // Mock market data - in a real implementation this would come from the game engine
  const getMarketData = (): { resource: keyof Resource; price: number; trend: 'up' | 'down' }[] => {
    return [
      { resource: 'wood', price: 0.8, trend: 'up' },
      { resource: 'stone', price: 1.2, trend: 'down' },
      { resource: 'food', price: 0.5, trend: 'up' },
      { resource: 'gold', price: 1.0, trend: 'down' },
    ];
  };

  // Buy resources
  const buyResource = (resource: keyof Resource, amount: number) => {
    // In a real implementation, this would call the game engine
    console.info(`Buying ${amount} of ${resource}`);
  };

  // Sell resources
  const sellResource = (resource: keyof Resource, amount: number) => {
    // In a real implementation, this would call the game engine
    console.info(`Selling ${amount} of ${resource}`);
  };

  return (
    <div class="market-panel">
      <h2>Market Trading</h2>
      <div class="market-info">
        <p>Trade resources to maximize your profits!</p>
        <p>Prices fluctuate based on supply and demand.</p>
      </div>

      <div class="market-table">
        <div class="market-header">
          <span>Resource</span>
          <span>Price (Gold)</span>
          <span>Trend</span>
          <span>Your Amount</span>
          <span>Actions</span>
        </div>

        <For each={getMarketData()}>{(item) => (
          <div class="market-row">
            <Tooltip
              content={`Current price for one ${item.resource}. The price rises and falls with demand.`}
              placement="right"
            >
              <span class="resource-name">{item.resource.charAt(0).toUpperCase() + item.resource.slice(1)}</span>
            </Tooltip>
            <span class="price">{formatNumber(item.price)}g</span>
            <Tooltip
              content={item.trend === 'up' ? 'The price is trending up.' : 'The price is trending down.'}
              placement="right"
            >
              <span class={`trend ${item.trend}`}>
                {item.trend === 'up' ? '↗' : '↘'}
              </span>
            </Tooltip>
            <span class="your-amount">
              {formatNumber(gameState.getResources()[item.resource])}
            </span>
            <div class="trade-buttons">
              <Tooltip content="Buy 10 units of this resource." placement="top">
                <button
                  class="trade-button buy"
                  onClick={() => buyResource(item.resource, 10)}
                >
                  Buy
                </button>
              </Tooltip>
              <Tooltip content="Sell 10 units of this resource." placement="top">
                <button
                  class="trade-button sell"
                  onClick={() => sellResource(item.resource, 10)}
                >
                  Sell
                </button>
              </Tooltip>
            </div>
          </div>
        )}</For>
      </div>

      <div class="trading-info">
        <h3>Trading Tips</h3>
        <ul>
          <li>Buy low, sell high for maximum profit</li>
          <li>Watch price trends to predict future values</li>
          <li>Diversify your resource portfolio</li>
        </ul>
      </div>
    </div>
  );
};

export default MarketPanel;
