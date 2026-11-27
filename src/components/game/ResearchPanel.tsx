import { For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import Tooltip from '../ui/Tooltip.js';
import type { TechnologyType } from '../../data/technologies.js';

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

  /**
   * How many seconds it takes to afford a technology at current income.
   *
   * When multiple resources are needed, the slowest one decides.
   * Returns undefined when the technology costs no resources.
   */
  const timeToAfford = (tech: TechnologyType): number | undefined => {
    const rates = gameState.getResourceRates();
    const resources = gameState.getResources();
    const cost = tech.cost;

    let maxTime = 0;
    let hasCost = false;

    for (const key of ['wood', 'stone', 'food', 'gold', 'research'] as const) {
      const needed = cost[key] ?? 0;
      if (needed <= 0) {continue;}

      hasCost = true;

      const have = resources[key];
      const rate = rates[key];

      if (have >= needed) {continue;}

      const deficit = needed - have;
      const time = rate > 0 ? deficit / rate : Infinity;
      if (time > maxTime) {
        maxTime = time;
      }
    }

    return hasCost ? maxTime : undefined;
  };

  /**
   * Format a duration in seconds for display.
   *
   * <60s: whole seconds, rounded up
   * 60s–3600s: X.Y minutes
   * 3600s–86400s: X.Y hours
   * >86400s: "24+ hours"
   */
  const formatTime = (seconds: number): string => {
    if (seconds <= 0) {return '0s';}
    if (seconds < 60) {return `${Math.ceil(seconds)}s`;}
    if (seconds < 3600) {return `${(seconds / 60).toFixed(1)} min`;}
    if (seconds <= 86400) {return `${(seconds / 3600).toFixed(1)} h`;}

    return '24+ h';
  };

  return (
    <div class="research-panel">
      <For each={techCatalog()} keyed={(t) => t.id}>
        {(tech) => {
          const isResearched = () => researched(tech().id);
          const prereqsMet = () => canResearchTech(tech().id);
          const affordable = () => canAffordTech(tech().id);

          const buyTime = () => {
            const time = timeToAfford(tech());

            return time !== undefined ? formatTime(time) : null;
          };

          return (
            <Tooltip
              content={
                <div class="tooltip-research">
                  <div class="tooltip-description">{tech().description}</div>
                  <div class="tooltip-divider" />
                  <div class="tooltip-costs">
                    <Show when={tech().cost.research && tech().cost.research > 0}>
                      <span class="cost">{tech().cost.research} research</span>
                    </Show>
                  </div>
                  <Show when={!isResearched() && buyTime()}>
                    <div class="tooltip-time">To buy at current income: {buyTime()}</div>
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
    </div>
  );
};

export default ResearchPanel;
