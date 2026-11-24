import { For, createMemo, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import Tooltip from '../ui/Tooltip.js';
import {
  BUILDING_CATEGORY_ORDER,
  getScaledCost,
  getScaledBuildTime
} from '../../data/buildings.js';
import type { BuildingType, BuildingCategory } from '../../data/buildings.js';
import type { Resource } from '../../types/worldState.js';

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
        {(category) => {
          const group = buildingsByCategory().get(category);

          return (
            <Show when={group && group.length > 0}>
              <div class="building-category">
                <h3 class="category-heading">{category}</h3>
                <div class="building-list">
                  <For each={group!} keyed={(type) => type.id}>
                    {(type) => {
                      const count = () => gameState.getBuildingCounts()[type().id] ?? 0;
                      const scaledCost = () => getScaledCost(type().cost, count());
                      const scaledTime = () => getScaledBuildTime(type().buildTime, count());
                      const affordable = () => canAfford(scaledCost());

                      // Find any in-progress construction for this building type
                      const construction = () => {
                        const allBuildings = gameState.getBuildings();
                        for (const [_key, building] of Object.entries(allBuildings)) {
                          if (building.id === type().id && !building.built) {
                            return building;
                          }
                        }

                        return undefined;
                      };

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
                              <div class="tooltip-divider" />
                              <div class="tooltip-effects">{type().effect}</div>
                              <div class="tooltip-divider" />
                              <div class="tooltip-build-time">Build time: {scaledTime()}s</div>
                            </div>
                          }
                          placement="top"
                        >

                          <button
                            class={`building-btn ${!affordable() ? 'building-btn-unaffordable' : ''}${construction() ? ' building-btn-constructing' : ''}`}
                            disabled={!affordable() || !!construction()}
                            onClick={() => buildBuilding(type().id)}
                          >
                            <span class="building-name">
                              {construction() ? `Building... (${construction()?.constructionProgress}%)` : type().name}
                            </span>
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
            </Show>
          );
        }}
      </For>
    </div>
  );
};

export default BuildingGrid;
