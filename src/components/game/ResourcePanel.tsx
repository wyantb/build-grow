import { createMemo, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { getGameState } from '../../hooks/useGameState.js';
import { formatExact, formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';
import { RESOURCES } from '../../data/resources.js';
import type { ResourceEnum } from '../../data/resources.js';

type CappedResource = 'wood' | 'stone' | 'food' | 'research' | 'clay';

type ResourceRowDef = {
  key: ResourceEnum;
  cappedKey?: CappedResource;
};

/**
 * The resource rows above the first divider.
 *
 * Gold and research are the economy; food is sustenance. None of these
 * are production-focused, though food has a rate.
 */
const STANDARD_ROWS: ResourceRowDef[] = [
  { key: 'gold' },
  { key: 'research', cappedKey: 'research' },
  { key: 'food', cappedKey: 'food' },
];

/**
 * The production resources below the divider.
 */
const PRODUCTION_ROWS: ResourceRowDef[] = [
  { key: 'wood', cappedKey: 'wood' },
  { key: 'stone', cappedKey: 'stone' },
];

/**
 * Clay appears below another divider only once clay making is researched.
 */
const CLAY_ROW: ResourceRowDef = {
  key: 'clay',
  cappedKey: 'clay',
};

const ResourceRow = (props: { row: ResourceRowDef; rates: () => { [K in ResourceEnum]: number } }) => {
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
      <Tooltip content={RESOURCES[props.row.key].description} placement="right">
        <span class="resource-name">{RESOURCES[props.row.key].name}</span>
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
      <div class="solid-resource-divider" />
      <For each={PRODUCTION_ROWS}>
        {(row) => <ResourceRow row={row} rates={rates} />}
      </For>
      <Show when={showClay()}>
        <div class="solid-resource-divider" />
        <ResourceRow row={CLAY_ROW} rates={rates} />
      </Show>
    </div>
  );
};

export default ResourcePanel;
