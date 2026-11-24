import { Component, For, createMemo } from 'solid-js'
import { getGameState } from '../../hooks/useGameState'
import { formatNumber } from '../../utils/formatNumber'
import type { Building } from '../../types/worldState'

const BuildingGrid: Component = () => {
  const gameState = getGameState()
  
  // Get buildings from game state
  const buildings = createMemo(() => Object.values(gameState.getBuildings()))
  
  // Format cost for display
  const formatCost = (cost: Building['cost']): string => {
    const costs = []
    if (cost.wood > 0) costs.push(`${formatNumber(cost.wood)} Wood`)
    if (cost.stone > 0) costs.push(`${formatNumber(cost.stone)} Stone`)
    if (cost.food > 0) costs.push(`${formatNumber(cost.food)} Food`)
    if (cost.gold > 0) costs.push(`${formatNumber(cost.gold)} Gold`)
    return costs.join(', ')
  }
  
  // Check if player can afford a building
  const canAffordBuilding = (building: Building): boolean => {
    const resources = gameState.getResources()
    return (
      resources.wood >= building.cost.wood &&
      resources.stone >= building.cost.stone &&
      resources.food >= building.cost.food &&
      resources.gold >= building.cost.gold
    )
  }
  
  // Build a building
  const buildBuilding = (buildingId: string) => {
    gameState.buildBuilding(buildingId)
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
            <button 
              class="build-button" 
              disabled={building.built || !canAffordBuilding(building)}
              onClick={() => buildBuilding(building.id)}
            >
              {building.built ? 'Built' : 'Build'}
            </button>
          </div>
        )}
      </For>
    </div>
  )
}

export default BuildingGrid