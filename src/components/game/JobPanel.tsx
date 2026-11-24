import { For, createMemo } from 'solid-js';
import type { Component } from 'solid-js';
import { getGameState } from '../../hooks/useGameState.js';
import type { Job } from '../../types/worldState.js';

const EMPTY_JOB: Job = {
  id: '',
  name: '',
  description: '',
  workers: 0,
  productivity: 0
};

const JobPanel: Component = () => {
  const gameState = getGameState();

  // Job ids are stable, so the list keeps its identity across ticks. The live
  // job record is read reactively inside each row instead of being copied into
  // the list, which would rebuild every row each tick.
  const jobs = createMemo<string[]>(() => Object.keys(gameState.getJobs()));
  const job = (id: string): Job => gameState.getJobs()[id] ?? EMPTY_JOB;

  // Get total population and assigned workers
  const getTotalAssignedWorkers = (): number => {
    return Object.values(gameState.getJobs()).reduce((total, job) => total + job.workers, 0);
  };

  const getAvailableWorkers = (): number => {
    return gameState.getPopulation() - getTotalAssignedWorkers();
  };

  // Assign workers to a job
  const assignWorker = (jobId: string) => {
    gameState.assignWorker(jobId);
  };

  // Unassign workers from a job
  const unassignWorker = (jobId: string) => {
    gameState.unassignWorker(jobId);
  };

  return (
    <div class="job-panel">
      <div class="population-info">
        <div>Available Workers: {getAvailableWorkers()}</div>
        <div>Total Population: {gameState.getPopulation()}</div>
      </div>

      <For each={jobs()} keyed={(id) => id}>
        {(id) => (
          <div class="job-card">
            <h3>{job(id()).name}</h3>
            <p>{job(id()).description}</p>
            <div class="job-workers">
              Workers: {job(id()).workers}
            </div>
            <div class="job-productivity">
              Productivity: {job(id()).productivity}x
            </div>
            <div class="worker-controls">
              <button
                class="worker-button"
                onClick={() => unassignWorker(id())}
                disabled={job(id()).workers <= 0}
              >
                -
              </button>
              <span class="worker-count">{job(id()).workers}</span>
              <button
                class="worker-button"
                onClick={() => assignWorker(id())}
                disabled={getAvailableWorkers() <= 0}
              >
                +
              </button>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

export default JobPanel;
