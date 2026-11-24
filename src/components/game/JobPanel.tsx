import { Component, For, createMemo } from 'solid-js'
import { getGameState } from '../../hooks/useGameState'
import { formatNumber } from '../../utils/formatNumber'
import type { Job } from '../../types/worldState'

const JobPanel: Component = () => {
  const gameState = getGameState()
  
  // Get jobs from game state
  const jobs = createMemo(() => Object.values(gameState.getJobs()))
  
  // Get total population and assigned workers
  const getTotalAssignedWorkers = (): number => {
    return Object.values(gameState.getJobs()).reduce((total, job) => total + job.workers, 0)
  }
  
  const getAvailableWorkers = (): number => {
    return gameState.getPopulation() - getTotalAssignedWorkers()
  }
  
  // Assign workers to a job
  const assignWorker = (jobId: string) => {
    gameState.assignWorker(jobId)
  }
  
  // Unassign workers from a job
  const unassignWorker = (jobId: string) => {
    gameState.unassignWorker(jobId)
  }

  return (
    <div class="job-panel">
      <div class="population-info">
        <div>Available Workers: {getAvailableWorkers()}</div>
        <div>Total Population: {gameState.getPopulation()}</div>
      </div>
      
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
              <button 
                class="worker-button" 
                onClick={() => unassignWorker(job.id)}
                disabled={job.workers <= 0}
              >
                -
              </button>
              <span class="worker-count">{job.workers}</span>
              <button 
                class="worker-button" 
                onClick={() => assignWorker(job.id)}
                disabled={getAvailableWorkers() <= 0}
              >
                +
              </button>
            </div>
          </div>
        )}
      </For>
    </div>
  )
}

export default JobPanel