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

  // Calculate how many workers can actually be added to a job
  const canAddToJob = (jobId: string, requested: number): number => {
    const job = gameState.getJobs()[jobId];
    if (!job) {return 0;}

    const jobs = gameState.getJobs();
    const defaultJobId = gameState.state.defaultJob;
    const totalAssigned = Object.values(jobs)
      .filter((j) => j.id !== defaultJobId)
      .reduce((sum, j) => sum + j.workers, 0);
    const available = Math.max(0, gameState.state.population - totalAssigned);

    // Room in job (0 capacity = unlimited)
    const roomInJob = job.capacity > 0
      ? Math.max(0, job.capacity - job.workers)
      : Infinity;

    // available already includes what's in the default job
    const canMove = Math.min(available, roomInJob);

    return Math.min(canMove, requested);
  };

  const addWorkersTooltip = (jobId: string, count: number): string => {
    const actual = canAddToJob(jobId, count);
    if (actual === 0) {return `No workers available to add ${count}`;}
    if (actual < count) {return `Add ${actual} worker${actual > 1 ? 's' : ''} (${count} requested)`;}

    return `Add ${count} worker${count > 1 ? 's' : ''}`;
  };

  const isAddDisabled = (jobId: string, count: number): boolean =>
    canAddToJob(jobId, count) <= 0;

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
                  disabled={isDefaultJob(job().id) || job().workers <= 0}
                >
                  {'\u00AB'}
                </button>
              </Tooltip>
              <Tooltip content="Remove 1 worker" placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, -1)}
                  disabled={isDefaultJob(job().id) || job().workers <= 0}
                >
                  {'\u2039'}
                </button>
              </Tooltip>
              {job().canDefault && !isDefaultJob(job().id) && (
                <Tooltip content="Set as default job" placement="top">
                  <button
                    class="job-btn job-btn-default"
                    onClick={() => gameState.setDefaultJob(job().id)}
                  >
                    D
                  </button>
                </Tooltip>
              )}
              <Tooltip content={addWorkersTooltip(job().id, 1)} placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, 1)}
                  disabled={isAddDisabled(job().id, 1)}
                >
                  {'\u203A'}
                </button>
              </Tooltip>
              <Tooltip content={addWorkersTooltip(job().id, 5)} placement="top">
                <button
                  class="job-btn"
                  onClick={() => gameState.assignWorkers(job().id, 5)}
                  disabled={isAddDisabled(job().id, 5)}
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
