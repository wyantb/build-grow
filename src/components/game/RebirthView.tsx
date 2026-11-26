import { createMemo, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { STAT_LABELS } from '../../data/species.js';
import type { Stats } from '../../data/species.js';
import { REBIRTH_DISPLAY_STATS } from '../../systems/rebirth.js';
import Tooltip from '../ui/Tooltip.js';

type RebirthTab = 'avatar' | 'species' | 'confirm';

/**
 * The stats of one species, before and after the rebirth.
 */
interface SpeciesStats {
  id: string;
  name: string;
  count: number;
  before: Stats;
  after: Stats;
}

/**
 * The view the player is taken to when they start a rebirth.
 *
 * It is not the village: there are no buildings, no jobs and no resources
 * here. The player is choosing what their people become, so the view holds
 * the avatar, the species and the confirmation.
 */
const RebirthView: Component = () => {
  const gameState = getGameState();

  const pending = createMemo(() => gameState.getPendingRebirth());

  /**
   * The species the player can see in this rebirth.
   *
   * A species is listed when it is in the world, and the most populous one
   * opens first.
   */
  const species = createMemo<SpeciesStats[]>(() => {
    const rebirth = pending();

    if (!rebirth) {
      return [];
    }

    const roster = gameState.state.species;

    return Object.entries(rebirth.after)
      .map(([id, after]) => ({
        id,
        name: roster[id]?.name ?? id,
        count: roster[id]?.count ?? 0,
        before: rebirth.before[id] ?? after,
        after,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  const [activeTab, setActiveTab] = createSignal<RebirthTab>('avatar');

  /**
   * The species shown in the species tab.
   *
   * It starts on the most populous one, which is the species the player
   * spent the most time with.
   */
  const [activeSpeciesId, setActiveSpeciesId] = createSignal<string | undefined>(undefined);

  const activeSpecies = createMemo<SpeciesStats | undefined>(() => {
    const list = species();
    const chosen = activeSpeciesId();

    if (chosen) {
      const found = list.find((entry) => entry.id === chosen);

      if (found) {
        return found;
      }
    }

    return list[0];
  });

  /**
   * Carry out the rebirth and go back to the village.
   */
  const confirm = () => {
    gameState.confirmRebirth();
  };

  return (
    <div class="rebirth-view" id="rebirth-view">
      <div class="tabs">
        <button
          class={`tab ${activeTab() === 'avatar' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('avatar')}
        >
          Avatar
        </button>
        <button
          class={`tab ${activeTab() === 'species' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('species')}
        >
          Species
        </button>
        <button
          class={`tab ${activeTab() === 'confirm' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('confirm')}
        >
          Confirm
        </button>
      </div>

      <div class="tab-content">
        <div class={`tab-pane ${activeTab() === 'avatar' ? 'active' : ''}`} id="rebirth-avatar-tab">
          <h2>Avatar</h2>
          <p class="rebirth-blob">This is You!</p>
        </div>

        <div class={`tab-pane ${activeTab() === 'species' ? 'active' : ''}`} id="rebirth-species-tab">
          <h2>Species</h2>

          <div class="species-tabs">
            <For each={species()}>
              {(entry) => (
                <button
                  class={`species-tab ${activeSpecies()?.id === entry.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveSpeciesId(entry.id)}
                >
                  {entry.name}
                </button>
              )}
            </For>
          </div>

          <Show when={activeSpecies()}>
            {(entry) => (
              <div class="stat-table" id="rebirth-stat-table">
                <div class="stat-table-header">
                  <span class="stat-name">Stat</span>
                  <span class="stat-before">Before</span>
                  <span class="stat-name">Stat</span>
                  <span class="stat-after">After</span>
                </div>

                <For each={REBIRTH_DISPLAY_STATS}>
                  {(stat) => (
                    <div class="stat-row">
                      <span class="stat-name">{STAT_LABELS[stat]}</span>
                      <span class="stat-before">{entry().before[stat]}</span>
                      <span class="stat-name">{STAT_LABELS[stat]}</span>
                      <span class="stat-after">
                        {entry().after[stat]}
                        <Show when={entry().after[stat] > entry().before[stat]}>
                          <span class="stat-gain">
                            +{entry().after[stat] - entry().before[stat]}
                          </span>
                        </Show>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            )}
          </Show>
        </div>

        <div class={`tab-pane ${activeTab() === 'confirm' ? 'active' : ''}`} id="rebirth-confirm-tab">
          <h2>Confirm</h2>

          <p class="rebirth-blob">This is You!</p>

          <div class="action-buttons">
            <Tooltip
              content="The village is thrown away and a new one starts with your better genes."
              placement="top"
            >
              <button
                class="action-button"
                id="confirm-rebirth-button"
                type="button"
                onClick={confirm}
              >
                Confirm Rebirth
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RebirthView;
