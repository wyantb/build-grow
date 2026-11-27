import { createMemo, For } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';
import { BUILDING_TYPES } from '../../data/buildings.js';
import { POPULATION_PER_HUT } from '../../systems/population.js';

const CityCenterPanel: Component = () => {
  const gameState = getGameState();

  const popCapacity = createMemo(() => gameState.getPopulationCapacity());
  const hutCount = createMemo(() => gameState.getBuildingCounts()['hut'] ?? 0);
  const maxWood = createMemo(() => gameState.getMaxStorage('wood'));
  const maxFood = createMemo(() => gameState.getMaxStorage('food'));

  // Derive storage bonus rows from BUILDING_TYPES that have storageBonus
  const storageBuildings = BUILDING_TYPES.filter((b) => b.storageBonus);

  return (
    <div class="city-center-panel">
      <section class="city-section">
        <h3>Housing</h3>
        <div class="city-row">
          <Tooltip content="The city center provides housing from the start." placement="top">
            <span class="city-item-name">City Housing</span>
          </Tooltip>
          <span class="city-item-value">{gameState.state.cityCenter.housing} capacity</span>
        </div>
        <div class="city-row">
          <Tooltip content={`Each hut houses ${POPULATION_PER_HUT} people. Huts are built in the Buildings tab.`} placement="top">
            <span class="city-item-name">Huts ({hutCount()})</span>
          </Tooltip>
          <span class="city-item-value">{hutCount() * POPULATION_PER_HUT} capacity</span>
        </div>
        <div class="city-row city-total">
          <span class="city-item-name">Total</span>
          <span class="city-item-value">{popCapacity()} capacity</span>
        </div>
      </section>

      <section class="city-section">
        <h3>Storage</h3>
        <div class="city-row">
          <Tooltip content="The city center provides base wood, stone, and food storage." placement="top">
            <span class="city-item-name">City Storage</span>
          </Tooltip>
          <span class="city-item-value">{formatNumber(gameState.state.cityCenter.storageWoodStone)} wood/stone, {formatNumber(gameState.state.cityCenter.storageFood)} food</span>
        </div>

        <For each={storageBuildings}>{(type) => {
          const count = createMemo(() => gameState.getBuildingCounts()[type.id] ?? 0);
          const bonus = type.storageBonus!;
          const parts: string[] = [];
          if (bonus.woodStone) {
            parts.push(`${formatNumber(bonus.woodStone)} wood/stone`);
          }
          if (bonus.food) {
            parts.push(`${formatNumber(bonus.food)} food`);
          }

          return (
            <div class="city-row">
              <Tooltip content={`Each ${type.name} adds ${parts.join(' and ')} storage.`} placement="top">
                <span class="city-item-name">{type.name}s ({count()})</span>
              </Tooltip>
              <span class="city-item-value">+{parts.join(', ')}</span>
            </div>
          );
        }}</For>

        <div class="city-row city-total">
          <span class="city-item-name">Wood / Stone</span>
          <span class="city-item-value">{formatNumber(maxWood())}</span>
        </div>
        <div class="city-row city-total">
          <span class="city-item-name">Food</span>
          <span class="city-item-value">{formatNumber(maxFood())}</span>
        </div>
      </section>
    </div>
  );
};

export default CityCenterPanel;
