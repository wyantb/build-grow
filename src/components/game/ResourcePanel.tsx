import { createMemo, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { getGameState } from '../../hooks/useGameState.js';
import { formatExact, formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';

type ResourceRowDef = {
  key: 'wood' | 'stone' | 'food' | 'gold' | 'research' | 'clay';
  label: string;
  description: string;
  cappedKey?: 'wood' | 'stone' | 'food' | 'research' | 'clay';
};

// Gold, Research, and Food above a divider; Wood and Stone below it.
// Clay appears below another divider only once clay making is researched.
const STANDARD_ROWS: ResourceRowDef[] = [
  {
    key: 'gold',
    label: 'Gold',
    description: 'Gold pays for trade and unlocks the market.',
  },
  {
    key: 'research',
    label: 'Research',
    description: 'Research accumulates from everyday discoveries. Future thinker jobs will produce more.',
    cappedKey: 'research',
  },
  {
    key: 'food',
    label: 'Food',
    description: 'Food keeps your population fed. A shortage stalls growth.',
    cappedKey: 'food',
  },
];

const PRODUCTION_ROWS: ResourceRowDef[] = [
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
];

const CLAY_ROW: ResourceRowDef = {
  key: 'clay',
  label: 'Clay',
  description: 'Clay is shaped into pottery and other useful wares.',
  cappedKey: 'clay',
};

const ResourceRow = (props: { row: ResourceRowDef; rates: () => { [K in ResourceRowDef['key']]: number } }) => {
  const gameState = getGameState();

  const amountTooltip = (): JSX.Element => {
    if (!props.row.cappedKey) {
      return formatExact(gameState.getResources()[props.row.key]);
    }

    const cap = gameState.getMaxStorage(props.row.cappedKey);
    const breakdown = gameState.getStorageBreakdown(props.row.cappedKey);

    return (
      <div>
        <div>
          {formatExact(gameState.getResources()[props.row.key])} / {formatExact(cap)}
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
    <div class="resource-row">
      <Tooltip content={props.row.description} placement="right">
        <span class="resource-name">{props.row.label}</span>
      </Tooltip>
      <Tooltip content={amountTooltip()} placement="right">
        <span class="resource-amount" tabindex="0">
          {props.row.cappedKey
            ? `${formatNumber(gameState.getResources()[props.row.key])} / ${formatNumber(gameState.getMaxStorage(props.row.cappedKey))}`
            : formatNumber(gameState.getResources()[props.row.key])}
        </span>
      </Tooltip>
      <Tooltip content={`Changes by ${formatNumber(props.rates()[props.row.key])} per second.`} placement="right">
        <span class={{
          'resource-rate': true,
          'positive': props.rates()[props.row.key] >= 0,
          'negative': props.rates()[props.row.key] < 0,
        }}>
          {props.rates()[props.row.key] >= 0 ? '+' : ''}{formatNumber(props.rates()[props.row.key])}/s
        </span>
      </Tooltip>
    </div>
  );
};

const ResourcePanel: Component = () => {
  const gameState = getGameState();

  const rates = createMemo(() => gameState.getResourceRates());

  const showClay = () => gameState.isTechnologyResearched('clay_making');

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
      <For each={STANDARD_ROWS}>
        {(row) => <ResourceRow row={row} rates={rates} />}
      </For>
      <div class="resource-divider" />
      <For each={PRODUCTION_ROWS}>
        {(row) => <ResourceRow row={row} rates={rates} />}
      </For>
      <Show when={showClay()}>
        <div class="resource-divider" />
        <ResourceRow row={CLAY_ROW} rates={rates} />
      </Show>
    </div>
  );
};

export default ResourcePanel;
