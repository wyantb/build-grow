import { For, createMemo, untrack } from 'solid-js';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { createDragContext, createDraggable, createDroppable } from '@solid-primitives/drag-drop';
import { getGameState } from '../../hooks/useGameState.js';
import { getAvailableJobIds, JOB_STATS } from '../../data/jobs.js';
import type { JobStats } from '../../systems/stats.js';
import { getWeightedStatFactor, getAverageStats, PRIMARY_WEIGHT, SECONDARY_WEIGHT } from '../../systems/stats.js';
import { NEUTRAL_STAT, STAT_LABELS } from '../../data/species.js';
import type { StatName } from '../../data/species.js';
import Tooltip from '../ui/Tooltip.js';
import { DragHandleIcon } from '../ui/icons.js';

/**
 * Build the tooltip content for a job row.
 *
 * Shows the job description, the average stats of its workers (with a
 * species breakdown), and the net productivity calculation. Every stat
 * gets a line of its own, and the section breaks are rules rather than
 * text, so the tooltip reads the same however narrow the screen is.
 */
const getJobTooltip = (
  jobId: string,
  species: Record<string, number>,
  state: ReturnType<typeof getGameState>['state'],
): JSX.Element => {
  const job = state.jobs[jobId];

  if (!job) {
    return '';
  }

  const jobStats: JobStats | undefined = JOB_STATS[jobId];

  if (!jobStats || !Object.values(species).some((c) => c > 0)) {
    return <div class="tooltip-description">{job.description}</div>;
  }

  const avg = getAverageStats(species, (speciesId) =>
    state.species[speciesId]?.stats ?? {
      strength: NEUTRAL_STAT,
      dexterity: NEUTRAL_STAT,
      constitution: NEUTRAL_STAT,
      intelligence: NEUTRAL_STAT,
      wisdom: NEUTRAL_STAT,
      charisma: NEUTRAL_STAT,
      manaSensitivity: NEUTRAL_STAT,
    },
  );

  const parts = Object.entries(species)
    .filter(([, c]) => c > 0)
    .map(([id, c]) => {
      const name = state.species[id]?.name ?? id;

      return `${c} ${name}`;
    })
    .join(' + ');

  const statLine = (statName: StatName): string => {
    const label = STAT_LABELS[statName] ?? statName;
    const value = Math.round(avg[statName]);

    return `Avg ${label}: ${value} (from ${parts})`;
  };

  const primaryFactor = jobStats.primary
    ? getWeightedStatFactor(avg[jobStats.primary], PRIMARY_WEIGHT)
    : 1;
  const secondaryFactor = jobStats.secondary
    ? getWeightedStatFactor(avg[jobStats.secondary], SECONDARY_WEIGHT)
    : 1;

  // Find the resource this job produces (first non-zero entry).
  const producedResource = Object.entries(job.production)
    .find(([, rate]) => rate > 0);

  return (
    <div class="tooltip-job">
      <div class="tooltip-description">{job.description}</div>
      <div class="tooltip-divider" />
      {jobStats.primary && (
        <div class="tooltip-stat">{statLine(jobStats.primary)}</div>
      )}
      {jobStats.secondary && (
        <div class="tooltip-stat">{statLine(jobStats.secondary)}</div>
      )}
      <div class="tooltip-divider" />
      <div class="tooltip-stat">Net productivity:</div>
      {producedResource && (
        <>
          <div class="tooltip-stat">
            {`${producedResource[1].toFixed(2)} ${producedResource[0]}/tick`}
          </div>
          {jobStats.primary && (
            <div class="tooltip-stat">
              {`× ${primaryFactor.toFixed(2)} (from ${STAT_LABELS[jobStats.primary]})`}
            </div>
          )}
          {jobStats.secondary && (
            <div class="tooltip-stat">
              {`× ${secondaryFactor.toFixed(2)} (from ${STAT_LABELS[jobStats.secondary]})`}
            </div>
          )}
          <div class="tooltip-stat">
            {`= ${(producedResource[1] * primaryFactor * secondaryFactor).toFixed(2)}/tick`}
          </div>
        </>
      )}
    </div>
  );
};

const JobPanel: Component = () => {
  const gameState = getGameState();

  // The jobs the player sees, in the priority order they have set.
  const jobs = createMemo(() => {
    const all = gameState.getJobs();
    const visible = getAvailableJobIds(
      gameState.getBuildingCounts(),
      gameState.state.jobOrder,
    );

    return visible
      .map((jobId) => all[jobId])
      .filter((job) => job !== undefined);
  });

  // The job that is dragged goes to the place of the job it is dropped on.
  const dragContext = createDragContext({
    onDragEnd: (dragged, over) => {
      if (!over) {return;}

      const targetIndex = jobs().findIndex((job) => job.id === over.id);

      if (targetIndex < 0) {return;}

      gameState.reorderJob(String(dragged.id), targetIndex);
    },
  });

  // True when the job has a neighbour to move towards.
  const canMove = (jobId: string, direction: -1 | 1): boolean => {
    const index = jobs().findIndex((job) => job.id === jobId);

    if (index < 0) {return false;}

    return index + direction >= 0 && index + direction < jobs().length;
  };

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
      <dragContext.Provider>
        <For each={jobs()} keyed={(j) => j.id}>
          {(job) => {
            // The handle is what the player grabs. The row is the drop
            // target, so the arrows and the worker buttons stay clickable.
            // The id never changes for a row, so it is read once.
            const jobId = untrack(() => job().id);
            const draggable = createDraggable(jobId);
            const droppable = createDroppable(jobId);

            // The dragged row follows the pointer.
            const dragStyle = () => {
              const transform = draggable.transform();

              if (!transform) {return undefined;}

              return {
                transform: `translate(${transform.x}px, ${transform.y}px)`,
                'z-index': '10',
              };
            };

            const rowClass = () => {
              const classes = ['job-row'];

              if (draggable.isDragging()) {classes.push('job-row-dragging');}
              if (droppable.isOver()) {classes.push('job-row-over');}

              return classes.join(' ');
            };

            return (
              <div
                ref={droppable.ref}
                class={rowClass()}
                style={dragStyle()}
              >
                <Tooltip content="Drag to reorder" placement="top">
                  <button
                    ref={draggable.ref}
                    class="job-drag-handle"
                    aria-label={`Reorder ${job().name}`}
                  >
                    <DragHandleIcon size={14} />
                  </button>
                </Tooltip>
                <div class="job-row-order">
                  <Tooltip content="Move up" placement="top">
                    <button
                      class="job-order-btn"
                      onClick={() => gameState.moveJob(job().id, -1)}
                      disabled={!canMove(job().id, -1)}
                      aria-label={`Move ${job().name} up`}
                    >
                      {'\u25B2'}
                    </button>
                  </Tooltip>
                  <Tooltip content="Move down" placement="top">
                    <button
                      class="job-order-btn"
                      onClick={() => gameState.moveJob(job().id, 1)}
                      disabled={!canMove(job().id, 1)}
                      aria-label={`Move ${job().name} down`}
                    >
                      {'\u25BC'}
                    </button>
                  </Tooltip>
                </div>
                <div class="job-row-name">
                  <Tooltip content={getJobTooltip(job().id, job().species, gameState.state)} placement="top">
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
                  {job().canDefault ? (
                    <Tooltip content="Set as default job" placement="top">
                      <button
                        class="job-btn job-btn-default"
                        onClick={() => gameState.setDefaultJob(job().id)}
                        disabled={isDefaultJob(job().id)}
                      >
                        D
                      </button>
                    </Tooltip>
                  ) : (
                    <div class="job-btn job-btn-default" aria-hidden="true">
                      {'\u00A0'}
                    </div>
                  )}
                  <Tooltip content={addWorkersTooltip(job().id, 1)} placement="top">
                    <button
                      class="job-btn"
                      onClick={() => gameState.assignWorkers(job().id, 1)}
                      disabled={isDefaultJob(job().id) || isAddDisabled(job().id, 1)}
                    >
                      {'\u203A'}
                    </button>
                  </Tooltip>
                  <Tooltip content={addWorkersTooltip(job().id, 5)} placement="top">
                    <button
                      class="job-btn"
                      onClick={() => gameState.assignWorkers(job().id, 5)}
                      disabled={isDefaultJob(job().id) || isAddDisabled(job().id, 5)}
                    >
                      {'\u00BB'}
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          }}
        </For>
      </dragContext.Provider>
    </div>
  );
};

export default JobPanel;
