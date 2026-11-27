import { createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';
import { CITY_CENTER_HOUSING_CAPACITY, POPULATION_PER_HUT } from '../../systems/population.js';
import { CITY_CENTER_STORAGE_WOOD_STONE, CITY_CENTER_STORAGE_FOOD, SHED_STORAGE, GRAIN_SILO_STORAGE } from '../../systems/gameEngine.js';

const CityCenterPanel: Component = () => {
  const gameState = getGameState();

  const popCapacity = createMemo(() => gameState.getPopulationCapacity());
  const hutCount = createMemo(() => gameState.getBuildingCounts()['hut'] ?? 0);
  const shedCount = createMemo(() => gameState.getBuildingCounts()['shed'] ?? 0);
  const siloCount = createMemo(() => gameState.getBuildingCounts()['grain_silo'] ?? 0);
  const maxWood = createMemo(() => gameState.getMaxStorage('wood'));
  const maxFood = createMemo(() => gameState.getMaxStorage('food'));

  return (
    <div class="city-center-panel">
      <section class="city-section">
        <h3>Housing</h3>
        <div class="city-row">
          <Tooltip content="The city center provides space for 5 people from the start." placement="top">
            <span class="city-item-name">City Housing</span>
          </Tooltip>
          <span class="city-item-value">{CITY_CENTER_HOUSING_CAPACITY} capacity</span>
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
          <Tooltip content="The city center provides 750 wood and stone storage, and 500 food storage from the start." placement="top">
            <span class="city-item-name">City Storage</span>
          </Tooltip>
          <span class="city-item-value">{formatNumber(CITY_CENTER_STORAGE_WOOD_STONE)} wood/stone, {formatNumber(CITY_CENTER_STORAGE_FOOD)} food</span>
        </div>
        <div class="city-row">
          <Tooltip content="Each shed adds 200 to wood, stone, and food storage." placement="top">
            <span class="city-item-name">Sheds ({shedCount()})</span>
          </Tooltip>
          <span class="city-item-value">+{formatNumber(shedCount() * SHED_STORAGE)} each</span>
        </div>
        <div class="city-row">
          <Tooltip content="Each grain silo adds 500 food storage." placement="top">
            <span class="city-item-name">Grain Silos ({siloCount()})</span>
          </Tooltip>
          <span class="city-item-value">+{formatNumber(siloCount() * GRAIN_SILO_STORAGE)} food</span>
        </div>
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
