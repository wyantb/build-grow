import { For, createMemo, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import Tooltip from '../ui/Tooltip.js';
import {
  BUILDING_CATEGORY_ORDER,
  getScaledCost,
} from '../../data/buildings.js';
import type { BuildingType, BuildingCategory } from '../../data/buildings.js';
import type { Resource } from '../../types/worldState.js';
import { timeToIncome, timeToAvailable, formatTime } from '../../utils/formatTimeToAfford.js';
import type { ResourceEnum } from '../../data/resources.js';

/** The resource keys that a building can cost, in tooltip display order. */
const COST_RESOURCE_ORDER: ResourceEnum[] = [
  'wood', 'stone', 'food',
  'clay', 'copper', 'tin', 'bronze',
  'paper', 'gold',
];

const BuildingGrid: Component = () => {
  const gameState = getGameState();

  // Group buildings by category
  const buildingsByCategory = createMemo(() => {
    const catalog = gameState.getBuildingCatalog();
    const groups: Map<BuildingCategory, BuildingType[]> = new Map();

    for (const category of BUILDING_CATEGORY_ORDER) {
      const buildings = catalog.filter((b) => b.category === category);
      if (buildings.length > 0) {
        groups.set(category, buildings);
      }
    }

    return groups;
  });

  const canAfford = (cost: Resource): boolean => {
    const resources = gameState.getResources();

    return resources.wood >= cost.wood
      && resources.stone >= cost.stone
      && resources.food >= cost.food
      && resources.gold >= cost.gold;
  };

  // Build a building
  const buildBuilding = (buildingId: string) => {
    gameState.buildBuilding(buildingId);
  };

  return (
    <div class="building-grid">
      <For each={BUILDING_CATEGORY_ORDER}>
        {(category) => (
          <Show when={buildingsByCategory().get(category)}>
            {(group) => (
              <div class="building-category">
                <h3 class="category-heading">{category}</h3>
                <div class="building-list">
                  <For each={group()} keyed={(type) => type.id}>
                    {(type) => {
                      const count = () => gameState.getBuildingCounts()[type().id] ?? 0;
                      const scaledCost = () => getScaledCost(type().cost, count());
                      const affordable = () => canAfford(scaledCost());

                      return (
                        <Tooltip
                          content={
                            <div class="tooltip-building">
                              <div class="tooltip-description">{type().description}</div>
                              <div class="tooltip-divider" />
                              <div class="tooltip-costs">
                                <For each={COST_RESOURCE_ORDER.filter((key) => (scaledCost()[key] ?? 0) > 0)}>
                                  {(key) => {
                                    const value = scaledCost()[key] ?? 0;
                                    const resource = gameState.getResources();
                                    const affordableKey = resource[key] !== undefined ? (resource[key as keyof Resource] as number) >= value : true;
                                    const unaffordable = !affordable() && !affordableKey;
                                    const label = key === 'gold' ? 'g' : key;

                                    return (
                                      <span class={`cost ${unaffordable ? 'cost-unaffordable' : ''}`}>
                                        {value} {label}
                                      </span>
                                    );
                                  }}
                                </For>
                              </div>
                              <Show when={type().storageBonus}>
                                {(bonus) => {
                                  const parts: string[] = [];
                                  if (bonus().woodStone) {
                                    parts.push(`${bonus().woodStone} wood/stone`);
                                  }
                                  if (bonus().food) {
                                    parts.push(`${bonus().food} food`);
                                  }
                                  if (bonus().clay) {
                                    parts.push(`${bonus().clay} clay`);
                                  }
                                  if (parts.length === 0) {
                                    return null;
                                  }

                                  return (
                                    <>
                                      <div class="tooltip-divider" />
                                      <div class="tooltip-storage">+{parts.join(', ')} per building</div>
                                    </>
                                  );
                                }}
                              </Show>
                              <div class="tooltip-divider" />
                              <div class="tooltip-time">To buy at current income: {formatTime(timeToIncome(scaledCost(), gameState.getResourceRates()) ?? 0)}</div>
                              <div class="tooltip-available">Available in: {affordable() ? 'now' : (formatTime(timeToAvailable(scaledCost(), gameState.getResourceRates(), gameState.getResources()) ?? 0))}</div>
                            </div>
                          }
                          placement="top"
                        >

                          <button
                            class={`building-btn ${!affordable() ? 'building-btn-unaffordable' : ''}`}
                            disabled={!affordable()}
                            onClick={() => buildBuilding(type().id)}
                          >
                            <span class="building-name">{type().name}</span>
                            <Show when={count() > 0}>
                              <span class="building-count">{count()}</span>
                            </Show>
                          </button>
                        </Tooltip>
                      );
                    }}
                  </For>
                </div>
              </div>
            )}
          </Show>
        )}
      </For>
    </div>
  );
};

export default BuildingGrid;
