import { createMemo, createSignal, For } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { SPECIES, STAT_LABELS } from '../../data/species.js';
import type { Stats } from '../../data/species.js';
import { REBIRTH_DISPLAY_STATS } from '../../systems/rebirth.js';
import Tooltip from '../ui/Tooltip.js';

type RebirthTab = 'avatar' | 'species' | 'confirm';

const RebirthView: Component = () => {
  const gameState = getGameState();

  const pending = createMemo(() => gameState.getPendingRebirth());
  const pool = createMemo(() => gameState.getRebirthPool());

  /** Total lives available for the next village (always 5). */
  const totalLives = createMemo(() => {
    const p = pool();

    // The total number of lives per village is fixed; it does not grow
    // with the pool.  The pool only caps how many of each species may
    // be chosen.
    return p?.human ?? 5;
  });

  /** The species whose before/after stats are available. */
  const viewableSpecies = createMemo(() => {
    const rebirth = pending();
    if (!rebirth) return [];

    return SPECIES.filter((s) => rebirth.before[s.id] && rebirth.after[s.id]);
  });

  const [activeSpeciesTab, setActiveSpeciesTab] = createSignal<string>(
    viewableSpecies()[0]?.id ?? 'human',
  );

  /**
   * The composition: how many lives of each race the player chose.
   *
   * Read from the pending rebirth so it survives a save / reload.
   */
  const composition = createMemo<Record<string, number>>(() => {
    const rebirth = pending();

    if (!rebirth) {
      return { human: totalLives() };
    }

    return rebirth.composition ?? { human: totalLives() };
  });

  const usedLives = createMemo(() =>
    Object.values(composition()).reduce((s, c) => s + c, 0),
  );

  /**
   * Increase the count of one race.
   *
   * Must stay within the species' pool cap and the total lives budget.
   */
  const increaseRace = (raceId: string) => {
    const p = pool();
    const poolCount = p !== undefined
      ? (p as Record<string, number>)[raceId] ?? 0
      : 0;

    if ((composition()[raceId] ?? 0) >= poolCount) {
      return;
    }

    if (usedLives() >= totalLives()) {
      return;
    }

    const comp = { ...composition() };

    comp[raceId] = (comp[raceId] ?? 0) + 1;

    gameState.setComposition(comp);
  };

  /**
   * Decrease the count of one race.
   */
  const decreaseRace = (raceId: string) => {
    const comp = { ...composition() };
    const current = comp[raceId] ?? 0;

    if (current <= 0) {
      return;
    }

    comp[raceId] = current - 1;

    gameState.setComposition(comp);
  };

  /**
   * Races the player can pick: any species with count > 0 in the pool.
   */
  const availableRaces = createMemo(() => {
    const p = pool();

    return Object.entries((p as Record<string, number> | undefined) ?? {})
      .filter(([, count]) => count > 0)
      .map(([id]) => id);
  });

  /**
   * The after-stats for a race, for the tooltip on the confirm tab.
   */
  const raceAfterStats = createMemo(() => {
    const rebirth = pending();
    const result: Record<string, Stats> = {};

    for (const raceId of availableRaces()) {
      const after = rebirth?.after?.[raceId];
      if (after) {
        result[raceId] = after;
      }
    }

    return result;
  });

  /**
   * Carry out the rebirth and go back to the village.
   */
  const confirm = () => {
    gameState.confirmRebirth();
  };

  const [activeTab, setActiveTab] = createSignal<RebirthTab>('avatar');

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
          <div class="species-tabs">
            <For each={viewableSpecies()}>
              {(species) => (
                <button
                  class={`species-tab ${activeSpeciesTab() === species.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => setActiveSpeciesTab(species.id)}
                >
                  {species.name}
                </button>
              )}
            </For>
          </div>

          <For each={viewableSpecies()}>
            {(species) => {
              const rebirth = pending();
              const before = rebirth?.before?.[species.id];
              const after = rebirth?.after?.[species.id];

              if (!before || !after) return null;

              return (
                <div
                  class={`species-pane ${activeSpeciesTab() === species.id ? 'active' : ''}`}
                  id={`species-pane-${species.id}`}
                >
                  <h2>{species.name}</h2>
                  <div class="stat-table">
                    <div class="stat-table-header">
                      <span class="stat-name">Stat</span>
                      <span class="stat-before">Before</span>
                      <span class="stat-before" />
                      <span class="stat-after">After</span>
                    </div>
                    <For each={REBIRTH_DISPLAY_STATS}>
                      {(stat) => {
                        const gain = after[stat] - before[stat];

                        return (
                          <div class="stat-row">
                            <span class="stat-name">{STAT_LABELS[stat]}</span>
                            <span class="stat-before">{before[stat]}</span>
                            <span class="stat-after" />
                            <span class="stat-after">
                              {after[stat]}
                              {gain > 0 && <span class="stat-gain">(+{gain})</span>}
                            </span>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        <div class={`tab-pane ${activeTab() === 'confirm' ? 'active' : ''}`} id="rebirth-confirm-tab">
          <h2>Confirm</h2>

          <p class="rebirth-hint">
            Choose the {totalLives()} lives for your next village.
            {' '}{usedLives()} / {totalLives()} chosen.
          </p>

          <div class="race-selector">
            <For each={availableRaces()}>
              {(raceId) => {
                const species = SPECIES.find((s) => s.id === raceId);
                if (!species) return null;

                const after = raceAfterStats()[raceId];
                const total = after
                  ? REBIRTH_DISPLAY_STATS.reduce((s, key) => s + after[key], 0)
                  : 0;

                const count = createMemo(() => composition()[raceId] ?? 0);

                return (
                  <div class="race-row">
                    <Tooltip
                      content={REBIRTH_DISPLAY_STATS
                        .map((key) => `${STAT_LABELS[key]}: ${after?.[key] ?? '?'}`)
                        .join('\n')}
                      placement="top"
                    >
                      <span class="race-name">
                        {species.name} ({total})
                      </span>
                    </Tooltip>

                    <div class="race-controls">
                      <button
                        class="race-btn"
                        type="button"
                        disabled={count() <= 0}
                        onClick={() => decreaseRace(raceId)}
                      >
                        {'\u2039'}
                      </button>
                      <span class="race-count">{count()}</span>
                      <button
                        class="race-btn"
                        type="button"
                        disabled={usedLives() >= totalLives()}
                        onClick={() => increaseRace(raceId)}
                      >
                        {'\u203A'}
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          <div class="action-buttons">
            <Tooltip
              content="The village is thrown away and a new one starts with your chosen people."
              placement="top"
            >
              <button
                class="action-button"
                id="confirm-rebirth-button"
                type="button"
                disabled={usedLives() !== totalLives()}
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
