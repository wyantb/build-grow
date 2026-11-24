import { For, createMemo } from 'solid-js'
import type { Component } from 'solid-js'
import { getGameState } from '../../hooks/useGameState.js'
import { formatNumber } from '../../utils/formatNumber.js'
import type { Resource } from '../../types/worldState.js'
import type { BuildingType } from '../../data/buildings.js'

const BuildingGrid: Component = () => {
  const gameState = getGameState()

  // Building types the player has unlocked, plus their live construction state
  const buildings = createMemo(() =>
    gameState.getBuildingCatalog().map((type) => ({
      type,
      construction: gameState.getBuildings()[type.id]
    }))
  )

  // Format cost for display
  const formatCost = (cost: Resource): string => {
    const costs = []
    if (cost.wood > 0) costs.push(`${formatNumber(cost.wood)} Wood`)
    if (cost.stone > 0) costs.push(`${formatNumber(cost.stone)} Stone`)
    if (cost.food > 0) costs.push(`${formatNumber(cost.food)} Food`)
    if (cost.gold > 0) costs.push(`${formatNumber(cost.gold)} Gold`)
    return costs.join(', ')
  }

  // Check if player can afford a building
  const canAffordBuilding = (building: BuildingType): boolean => {
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
        {({ type, construction }) => (
          <div class={`building-card ${construction?.built ? 'built' : 'unbuilt'}`}>
            <h3>{type.name}</h3>
            <p>{type.description}</p>
            <div class="building-cost">
              Cost: {formatCost(type.cost)}
            </div>
            <div class="building-time">
              Time: {type.buildTime}s
            </div>
            {construction && !construction.built && (
              <div class="construction-progress">
                Progress: {construction.constructionProgress}%
              </div>
            )}
            <button
              class="build-button"
              disabled={construction?.built || !canAffordBuilding(type)}
              onClick={() => buildBuilding(type.id)}
            >
              {construction?.built ? 'Built' : 'Build'}
            </button>
          </div>
        )}
      </For>
    </div>
  )
}

export default BuildingGrid