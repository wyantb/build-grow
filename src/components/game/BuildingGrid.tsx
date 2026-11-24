import { Component, For, createMemo } from 'solid-js'
import { getGameState } from '../../hooks/useGameState'
import type { Building } from '../../types/worldState'

const BuildingGrid: Component = () => {
  const gameState = getGameState()
  
  // Get buildings from game state
  const buildings = createMemo(() => Object.values(gameState.getBuildings()))
  
  // Format cost for display
  const formatCost = (cost: Building['cost']): string => {
    const costs = []
    if (cost.wood > 0) costs.push(`${cost.wood} Wood`)
    if (cost.stone > 0) costs.push(`${cost.stone} Stone`)
    if (cost.food > 0) costs.push(`${cost.food} Food`)
    if (cost.gold > 0) costs.push(`${cost.gold} Gold`)
    return costs.join(', ')
  }

  return (
    <div class="building-grid">
      <For each={buildings()}>
        {(building) => (
          <div class={`building-card ${building.built ? 'built' : 'unbuilt'}`}>
            <h3>{building.name}</h3>
            <p>{building.description}</p>
            <div class="building-cost">
              Cost: {formatCost(building.cost)}
            </div>
            <div class="building-time">
              Time: {building.buildTime}s
            </div>
            {!building.built && (
              <div class="construction-progress">
                Progress: {building.constructionProgress}%
              </div>
            )}
            <button class="build-button" disabled={building.built}>
              {building.built ? 'Built' : 'Build'}
            </button>
          </div>
        )}
      </For>
    </div>
  )
}

export default BuildingGrid