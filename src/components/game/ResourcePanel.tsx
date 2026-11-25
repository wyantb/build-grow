import { createMemo, For } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { formatExact, formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';

const RESOURCE_ROWS = [
  {
    key: 'wood',
    label: 'Wood',
    description: 'Wood is the basic building material. Used for construction and upkeep.',
  },
  {
    key: 'stone',
    label: 'Stone',
    description: 'Stone is mined for sturdy buildings and fortifications.',
  },
  {
    key: 'food',
    label: 'Food',
    description: 'Food keeps your population fed. A shortage stalls growth.',
  },
  {
    key: 'gold',
    label: 'Gold',
    description: 'Gold pays for trade and unlocks the market.',
  },
] as const;

const ResourcePanel: Component = () => {
  const gameState = getGameState();

  // Get resource rates from game state
  const rates = createMemo(() => gameState.getResourceRates());

  return (
    <div class="resources-display">
      <div class="resource-header">
        <span class="header-name">Resource</span>
        <span class="header-amount">Amount</span>
        <span class="header-rate">Rate/s</span>
      </div>
      <For each={RESOURCE_ROWS}>
        {(row) => (
          <div class="resource-row">
            <Tooltip content={row.description} placement="right">
              <span class="resource-name">{row.label}</span>
            </Tooltip>
            <Tooltip content={formatExact(gameState.getResources()[row.key])} placement="right">
              <span class="resource-amount" tabindex="0">
                {formatNumber(gameState.getResources()[row.key])}
              </span>
            </Tooltip>
            <Tooltip content={`Changes by ${formatNumber(rates()[row.key])} per second.`} placement="right">
              <span class={{
                'resource-rate': true,
                'positive': rates()[row.key] >= 0,
                'negative': rates()[row.key] < 0,
              }}>
                {rates()[row.key] >= 0 ? '+' : ''}{formatNumber(rates()[row.key])}/s
              </span>
            </Tooltip>
          </div>
        )}
      </For>
      <div class="resource-row">
        <Tooltip
          content="Your people. Assign them to jobs to produce resources and grow the civilization."
          placement="right"
        >
          <span class="resource-name">Population</span>
        </Tooltip>
        <span class="resource-amount">
          {gameState.getPopulation()} / {gameState.getPopulationCapacity()}
        </span>
        <span class="resource-rate">-</span>
      </div>
    </div>
  );
};

export default ResourcePanel;
