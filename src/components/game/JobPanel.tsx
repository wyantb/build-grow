import { Component, For, createMemo } from 'solid-js'
import { getGameState } from '../../hooks/useGameState'
import type { Job } from '../../types/worldState'

const JobPanel: Component = () => {
  const gameState = getGameState()
  
  // Get jobs from game state
  const jobs = createMemo(() => Object.values(gameState.getJobs()))

  return (
    <div class="job-panel">
      <For each={jobs()}>
        {(job) => (
          <div class="job-card">
            <h3>{job.name}</h3>
            <p>{job.description}</p>
            <div class="job-workers">
              Workers: {job.workers}
            </div>
            <div class="job-productivity">
              Productivity: {job.productivity}x
            </div>
            <div class="worker-controls">
              <button class="worker-button" onClick={() => {
                // Decrease workers
              }}>-</button>
              <span class="worker-count">{job.workers}</span>
              <button class="worker-button" onClick={() => {
                // Increase workers
              }}>+</button>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

export default JobPanel