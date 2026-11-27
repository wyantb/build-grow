import { createMemo, For, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { formatNumber } from '../../utils/formatNumber.js';
import Tooltip from '../ui/Tooltip.js';
import { BUILDING_TYPES } from '../../data/buildings.js';
import { POPULATION_PER_HUT } from '../../systems/population.js';

/** A shared dialog that is currently open. */
type ActiveDialog = 'housing' | 'storage' | null;

const CityCenterPanel: Component = () => {
  const gameState = getGameState();
  const [activeDialog, setActiveDialog] = createSignal<ActiveDialog>(null);

  const popCapacity = createMemo(() => gameState.getPopulationCapacity());
  const hutCount = createMemo(() => gameState.getBuildingCounts()['hut'] ?? 0);
  const cityHousing = createMemo(() => gameState.state.cityCenter.housing);
  const maxWood = createMemo(() => gameState.getMaxStorage('wood'));
  const maxStone = createMemo(() => gameState.getMaxStorage('stone'));
  const maxFood = createMemo(() => gameState.getMaxStorage('food'));

  // Storage bonus buildings
  const storageBuildings = BUILDING_TYPES.filter((b) => b.storageBonus);

  const openDialog = (dialog: ActiveDialog) => setActiveDialog(dialog);
  const closeDialog = () => setActiveDialog(null);

  return (
    <div class="city-center-panel">
      {/* Housing Section */}
      <section class="city-section">
        <h3 class="city-section-heading">Housing</h3>
        <Tooltip
          content={
            <div class="tooltip-city-item">
              <div class="tooltip-city-title">City Housing</div>
              <div class="tooltip-divider" />
              <div class="tooltip-description">The core of your community center, this housing supports your initial population.</div>
              <div class="tooltip-divider" />
              <div class="tooltip-city-stat">Provides {cityHousing()} housing</div>
            </div>
          }
          placement="top"
        >
          <button
            class="city-source-btn"
            onClick={() => openDialog('housing')}
          >
            <span class="city-source-name">City Housing</span>
            <span class="city-source-value">{cityHousing()} housing</span>
          </button>
        </Tooltip>
      </section>

      {/* Storage Section */}
      <section class="city-section">
        <h3 class="city-section-heading">Storage</h3>
        <Tooltip
          content={
            <div class="tooltip-city-item">
              <div class="tooltip-city-title">City Storage</div>
              <div class="tooltip-divider" />
              <div class="tooltip-description">The city center provides base storage for wood, stone, and food.</div>
              <div class="tooltip-divider" />
              <div class="tooltip-city-stat">{formatNumber(gameState.state.cityCenter.storageWoodStone)} wood / stone</div>
              <div class="tooltip-city-stat">{formatNumber(gameState.state.cityCenter.storageFood)} food</div>
            </div>
          }
          placement="top"
        >
          <button
            class="city-source-btn"
            onClick={() => openDialog('storage')}
          >
            <span class="city-source-name">City Storage</span>
            <span class="city-source-value">{formatNumber(maxWood())} wood/stone, {formatNumber(maxFood())} food</span>
          </button>
        </Tooltip>
      </section>

      {/* Population Breakdown Dialog */}
      <Show when={activeDialog() === 'housing'}>
        <div class="dialog-overlay" onClick={closeDialog}>
          <div class="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div class="dialog-header">
              <h3>Maximum Population</h3>
              <button class="dialog-close" onClick={closeDialog} aria-label="Close">✕</button>
            </div>
            <div class="dialog-body">
              <div class="dialog-total">Total: {popCapacity()} population</div>
              <div class="dialog-divider" />
              <div class="dialog-row">
                <span class="dialog-label">City Housing</span>
                <span class="dialog-value">{cityHousing()}</span>
              </div>
              <Show when={hutCount() > 0}>
                <div class="dialog-row">
                  <span class="dialog-label">Huts ({hutCount()})</span>
                  <span class="dialog-value">{hutCount() * POPULATION_PER_HUT}</span>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* Storage Breakdown Dialog */}
      <Show when={activeDialog() === 'storage'}>
        <div class="dialog-overlay" onClick={closeDialog}>
          <div class="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div class="dialog-header">
              <h3>Storage Capacity</h3>
              <button class="dialog-close" onClick={closeDialog} aria-label="Close">✕</button>
            </div>
            <div class="dialog-body">
              <For each={[
                { name: 'Wood', amount: maxWood(), center: gameState.state.cityCenter.storageWoodStone, buildings: storageBuildings.filter((b) => b.storageBonus?.woodStone) },
                { name: 'Stone', amount: maxStone(), center: gameState.state.cityCenter.storageWoodStone, buildings: storageBuildings.filter((b) => b.storageBonus?.woodStone) },
                { name: 'Food', amount: maxFood(), center: gameState.state.cityCenter.storageFood, buildings: storageBuildings.filter((b) => b.storageBonus?.food) },
              ]}>
                {(group) => (
                  <>
                    <div class="dialog-resource-header">{group.name}</div>
                    <div class="dialog-row">
                      <span class="dialog-label">City Storage</span>
                      <span class="dialog-value">{formatNumber(group.center)}</span>
                    </div>
                    <For each={group.buildings}>
                      {(type) => {
                        const count = createMemo(() => gameState.getBuildingCounts()[type.id] ?? 0);
                        const perBuilding = type.storageBonus!.woodStone ?? type.storageBonus!.food!;
                        const total = createMemo(() => count() * perBuilding);

                        return (
                          <Show when={count() > 0}>
                            <div class="dialog-row">
                              <span class="dialog-label">{type.name}s ({count()})</span>
                              <span class="dialog-value">+{formatNumber(total())}</span>
                            </div>
                          </Show>
                        );
                      }}
                    </For>
                    <div class="dialog-row dialog-total-row">
                      <span class="dialog-label">Total {group.name}</span>
                      <span class="dialog-value">{formatNumber(group.amount)}</span>
                    </div>
                    <div class="dialog-divider" />
                  </>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default CityCenterPanel;
