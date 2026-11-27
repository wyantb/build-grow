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
                                <Show when={scaledCost().wood > 0}>
                                  <span class={`cost ${!affordable() && scaledCost().wood > gameState.getResources().wood ? 'cost-unaffordable' : ''}`}>
                                    {scaledCost().wood} wood
                                  </span>
                                </Show>
                                <Show when={scaledCost().stone > 0}>
                                  <span class={`cost ${!affordable() && scaledCost().stone > gameState.getResources().stone ? 'cost-unaffordable' : ''}`}>
                                    {scaledCost().stone} stone
                                  </span>
                                </Show>
                                <Show when={scaledCost().food > 0}>
                                  <span class={`cost ${!affordable() && scaledCost().food > gameState.getResources().food ? 'cost-unaffordable' : ''}`}>
                                    {scaledCost().food} food
                                  </span>
                                </Show>

                                <Show when={scaledCost().gold > 0}>
                                  <span class={`cost ${!affordable() && scaledCost().gold > gameState.getResources().gold ? 'cost-unaffordable' : ''}`}>
                                    {scaledCost().gold}g
                                  </span>
                                </Show>
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
