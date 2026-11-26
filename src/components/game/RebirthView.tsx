import { createMemo, createSignal, For } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import { STAT_LABELS } from '../../data/species.js';
import type { Stats } from '../../data/species.js';
import { REBIRTH_DISPLAY_STATS } from '../../systems/rebirth.js';
import Tooltip from '../ui/Tooltip.js';

type RebirthTab = 'avatar' | 'race' | 'confirm';

interface RaceOption {
  id: string;
  name: string;
  stats: Stats;
  totalStats: number;
}

const TOTAL_LIVES = 5;

const RebirthView: Component = () => {
  const gameState = getGameState();

  const pending = createMemo(() => gameState.getPendingRebirth());
  const pool = createMemo(() => gameState.getRebirthPool());

  /**
   * The races the player can pick from.
   *
   * Humans are always available. Elves are available once the pool has at
   * least one.
   */
  const raceOptions = createMemo<RaceOption[]>(() => {
    const rebirth = pending();

    if (!rebirth) {
      return [];
    }

    const options: RaceOption[] = [];

    // Humans are always available.
    const humanAfter = rebirth.after['human'];

    if (humanAfter) {
      const total = REBIRTH_DISPLAY_STATS.reduce((s, key) => s + humanAfter[key], 0);

      options.push({
        id: 'human',
        name: 'Human',
        stats: humanAfter,
        totalStats: total,
      });
    }

    // Elves are available when the pool has at least one.
    const elfCount = pool()?.elf ?? 0;

    if (elfCount > 0) {
      const elfAfter = rebirth.after['elf'];

      if (elfAfter) {
        const total = REBIRTH_DISPLAY_STATS.reduce((s, key) => s + elfAfter[key], 0);

        options.push({
          id: 'elf',
          name: 'Elf',
          stats: elfAfter,
          totalStats: total,
        });
      }
    }

    return options;
  });

  /**
   * The current composition: how many lives of each race.
   *
   * Read from the pending rebirth so it survives a save / reload.
   */
  const composition = createMemo<Record<string, number>>(() => {
    const rebirth = pending();

    if (!rebirth) {
      return { human: TOTAL_LIVES };
    }

    return rebirth.composition ?? { human: TOTAL_LIVES };
  });

  const [activeTab, setActiveTab] = createSignal<RebirthTab>('avatar');

  const usedLives = createMemo(() =>
    Object.values(composition()).reduce((s, c) => s + c, 0),
  );

  /**
   * Increase the count of one race.
   */
  const increaseRace = (raceId: string) => {
    if (usedLives() >= TOTAL_LIVES) {
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
          class={`tab ${activeTab() === 'race' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('race')}
        >
          Race
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

        <div class={`tab-pane ${activeTab() === 'race' ? 'active' : ''}`} id="rebirth-race-tab">
          <h2>Race</h2>
          <p class="rebirth-hint">
            Choose the {TOTAL_LIVES} lives for your next village.
            {' '}{usedLives()} / {TOTAL_LIVES} chosen.
          </p>

          <div class="race-selector">
            <For each={raceOptions()}>
              {(race) => {
                const count = createMemo(() => composition()[race.id] ?? 0);

                return (
                  <div class="race-row">
                    <Tooltip
                      content={REBIRTH_DISPLAY_STATS
                        .map((key) => `${STAT_LABELS[key]}: ${race.stats[key]}`)
                        .join('\n')}
                      placement="top"
                    >
                      <span class="race-name">
                        {race.name} ({race.totalStats})
                      </span>
                    </Tooltip>

                    <div class="race-controls">
                      <button
                        class="race-btn"
                        type="button"
                        disabled={count() <= 0}
                        onClick={() => decreaseRace(race.id)}
                      >
                        {'\u2039'}
                      </button>
                      <span class="race-count">{count()}</span>
                      <button
                        class="race-btn"
                        type="button"
                        disabled={usedLives() >= TOTAL_LIVES}
                        onClick={() => increaseRace(race.id)}
                      >
                        {'\u203A'}
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        <div class={`tab-pane ${activeTab() === 'confirm' ? 'active' : ''}`} id="rebirth-confirm-tab">
          <h2>Confirm</h2>

          <div class="confirm-composition">
            <p class="rebirth-blob">
              <For each={raceOptions()}>
                {(race) => {
                  const count = composition()[race.id] ?? 0;

                  if (count <= 0) {
                    return null;
                  }

                  return (
                    <span>
                      {count} {race.name}
                      {count > 1 ? 's' : ''}
                      {' '}
                    </span>
                  );
                }}
              </For>
            </p>
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
                disabled={usedLives() !== TOTAL_LIVES}
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
