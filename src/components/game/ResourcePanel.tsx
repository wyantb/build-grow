import { createMemo, For } from 'solid-js';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { getGameState } from '../../hooks/useGameState.js';
import { formatExact, formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';

type ResourceRowDef = {
  key: 'wood' | 'stone' | 'food' | 'gold';
  label: string;
  description: string;
  cappedKey?: 'wood' | 'stone' | 'food';
};

const RESOURCE_ROWS: ResourceRowDef[] = [
  {
    key: 'wood',
    label: 'Wood',
    description: 'Wood is the basic building material. Used for construction and upkeep.',
    cappedKey: 'wood',
  },
  {
    key: 'stone',
    label: 'Stone',
    description: 'Stone is mined for sturdy buildings and fortifications.',
    cappedKey: 'stone',
  },
  {
    key: 'food',
    label: 'Food',
    description: 'Food keeps your population fed. A shortage stalls growth.',
    cappedKey: 'food',
  },
  {
    key: 'gold',
    label: 'Gold',
    description: 'Gold pays for trade and unlocks the market.',
  },
] as const;

const ResourcePanel: Component = () => {
  const gameState = getGameState();

  const rates = createMemo(() => gameState.getResourceRates());

  const amountTooltip = (row: ResourceRowDef): JSX.Element => {
    if (!row.cappedKey) {
      return formatExact(gameState.getResources()[row.key]);
    }

    const cap = gameState.getMaxStorage(row.cappedKey);
    const breakdown = gameState.getStorageBreakdown(row.cappedKey);

    return (
      <div>
        <div>
          {formatExact(gameState.getResources()[row.key])} / {formatExact(cap)}
        </div>
        <div class="tooltip-divider" />
        <div class="tooltip-storage-header">Storage</div>
        <For each={breakdown}>
          {(entry) => (
            <div class="tooltip-storage-line">
              +{formatExact(entry.value)} from {entry.label.toLowerCase()}
            </div>
          )}
        </For>
      </div>
    );
  };

  return (
    <div class="resources-display">
      <div class="resource-header">
        <span class="header-name">Resource</span>
        <span class="header-amount">Amount</span>
        <span class="header-rate">Rate/s</span>
      </div>
      <div class="resource-row population-row">
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
      <For each={RESOURCE_ROWS}>
        {(row) => (
          <div class="resource-row">
            <Tooltip content={row.description} placement="right">
              <span class="resource-name">{row.label}</span>
            </Tooltip>
            <Tooltip content={amountTooltip(row)} placement="right">
              <span class="resource-amount" tabindex="0">
                {row.cappedKey
                  ? `${formatNumber(gameState.getResources()[row.key])} / ${formatNumber(gameState.getMaxStorage(row.cappedKey))}`
                  : formatNumber(gameState.getResources()[row.key])}
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
    </div>
  );
};

export default ResourcePanel;
