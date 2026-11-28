import { createSignal, For, Show } from 'solid-js';
import { createRoot } from 'solid-js';
import type { Component } from 'solid-js';
import type { Resource } from '../../types/worldState.js';
import { getGameState } from '../../hooks/useGameState.js';
import Tooltip from '../ui/Tooltip.js';
import { timeToIncome, timeToAvailable, formatTime } from '../../utils/formatTimeToAfford.js';

const SHOW_COMPLETED_KEY = 'build-grow:research-show-completed';

/**
 * A persisted signal shared across component mounts.
 */
const [showCompleted, setShowCompleted] = createRoot(() => {
  const initial = localStorage.getItem(SHOW_COMPLETED_KEY) === 'true';
  const [signal, set] = createSignal(initial);

  const persist = (v: boolean) => {
    localStorage.setItem(SHOW_COMPLETED_KEY, String(v));
    set(v);
  };

  return [signal, persist] as const;
});

const ResearchPanel: Component = () => {
  const gameState = getGameState();

  const techCatalog = () => gameState.getTechnologyCatalog();

  const researched = (techId: string): boolean =>
    gameState.isTechnologyResearched(techId);

  const canResearchTech = (techId: string): boolean =>
    gameState.canResearch(techId);

  const canAffordTech = (techId: string): boolean =>
    gameState.canAffordResearch(techId);

  const doResearchTech = (techId: string): void => {
    gameState.doResearch(techId);
  };

  const visibleTechs = () => {
    const catalog = techCatalog();
    const show = showCompleted();

    return catalog.filter((t) => {
      if (researched(t.id)) {return show;}
      // Hide techs whose prerequisites have not all been researched.
      for (const prereq of t.prereqs ?? []) {
        if (!researched(prereq)) {
          return false;
        }
      }

      return true;
    });
  };

  return (
    <div class="research-panel">
      <div class="research-toolbar">
        <label class="research-toggle">
          <input
            type="checkbox"
            checked={showCompleted()}
            onChange={(e) => setShowCompleted(e.currentTarget.checked)}
          />
          Show completed
        </label>
      </div>
      <For each={visibleTechs()} keyed={(t) => t.id}>
        {(tech) => {
          const isResearched = () => researched(tech().id);
          const prereqsMet = () => canResearchTech(tech().id);
          const affordable = () => canAffordTech(tech().id);

          const cost = (): Partial<Resource> => ({ research: tech().researchCost });

          const incomeTime = () => {
            const rates = gameState.getResourceRates();
            const time = timeToIncome(cost(), rates);

            return time !== undefined ? formatTime(time) : null;
          };

          const availableTime = () => {
            if (affordable()) {return 'now';}
            const rates = gameState.getResourceRates();
            const resources = gameState.getResources();
            const time = timeToAvailable(cost(), rates, resources);

            return time !== undefined ? formatTime(time) : null;
          };

          return (
            <Tooltip
              content={
                <div class="tooltip-research">
                  <div class="tooltip-description">{tech().description}</div>
                  <div class="tooltip-divider" />
                  <div class="tooltip-costs">
                    <Show when={tech().researchCost > 0}>
                      <span class="cost">{tech().researchCost} research</span>
                    </Show>
                  </div>
                  <Show when={!isResearched() && incomeTime()}>
                    <div class="tooltip-divider" />
                    <div class="tooltip-time">To buy at current income: {incomeTime()}</div>
                    <div class="tooltip-available">Available in: {availableTime()}</div>
                  </Show>
                </div>
              }
              placement="top"
            >
              <button
                class={`research-btn ${isResearched() ? 'research-btn-done' : !affordable() ? 'research-btn-unaffordable' : ''}`}
                disabled={isResearched() || !prereqsMet() || !affordable()}
                onClick={() => doResearchTech(tech().id)}
              >
                <span class="research-name">{tech().name}</span>
                <Show when={isResearched()}>
                  <span class="research-status">✓</span>
                </Show>
              </button>
            </Tooltip>
          );
        }}
      </For>
      <Show when={!showCompleted() && visibleTechs().length === 0}>
        <div class="research-empty">All technologies researched</div>
      </Show>
    </div>
  );
};

export default ResearchPanel;
