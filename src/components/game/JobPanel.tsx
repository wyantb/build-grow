import { For, createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import Tooltip from '../ui/Tooltip.js';

const JobPanel: Component = () => {
  const gameState = getGameState();

  const jobs = createMemo(() => {
    const raw = Object.values(gameState.getJobs());

    // Sort: defaultable (uncapped) first, then capped jobs by name
    return raw.sort((a, b) => {
      const aDefault = a.canDefault ? 0 : 1;
      const bDefault = b.canDefault ? 0 : 1;
      if (aDefault !== bDefault) { return aDefault - bDefault; }

      return a.name.localeCompare(b.name);
    });
  });

  const isDefaultJob = (jobId: string): boolean =>
    gameState.state.defaultJob === jobId;

  const capacityLabel = (w: number, cap: number): string => {
    if (cap === 0) { return `${w}`; }

    return `${w} / ${cap}`;
  };

  return (
    <div class="job-panel">
      <For each={jobs()} keyed={(j) => j.id}>
        {(job) => (
          <div class="job-row">
            <div class="job-row-name">
              <Tooltip content={job().description} placement="top">
                <span class="job-label">{job().name}</span>
              </Tooltip>
            </div>
            <div class="job-row-count">
              {capacityLabel(job().workers, job().capacity)}
            </div>
            <div class="job-row-controls">
              <Tooltip content="Remove 5 workers" placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, -5)}
                  disabled={job().workers <= 0}
                >
                  {'\u00AB'}
                </button>
              </Tooltip>
              <Tooltip content="Remove 1 worker" placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, -1)}
                  disabled={job().workers <= 0}
                >
                  {'\u2039'}
                </button>
              </Tooltip>
              <Tooltip content="Set as default job" placement="top">
                <button
                  class="job-btn job-btn-default"
                  disabled={!job().canDefault || isDefaultJob(job().id)}
                  onClick={() => gameState.setDefaultJob(job().id)}
                >
                  {job().canDefault && !isDefaultJob(job().id) ? 'D' : '\u00A0'}
                </button>
              </Tooltip>
              <Tooltip content="Add 1 worker" placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, 1)}
                  disabled={job().capacity > 0 && job().workers >= job().capacity}
                >
                  {'\u203A'}
                </button>
              </Tooltip>
              <Tooltip content="Add 5 workers" placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, 5)}
                  disabled={job().capacity > 0 && job().workers >= job().capacity}
                >
                  {'\u00BB'}
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

export default JobPanel;
