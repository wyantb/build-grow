import { createMemo } from 'solid-js'
import type { Component } from 'solid-js'
import { getGameState } from '../../hooks/useGameState.js'
import { formatNumber } from '../../utils/formatNumber.js'

const ResourcePanel: Component = () => {
  const gameState = getGameState()
  
  // Get resource rates from game state
  const rates = createMemo(() => gameState.getResourceRates())

  return (
    <div class="resources-display">
      <div class="resource-header">
        <span class="header-name">Resource</span>
        <span class="header-amount">Amount</span>
        <span class="header-rate">Rate/s</span>
      </div>
      <div class="resource-row">
        <span class="resource-name">Wood</span>
        <span class="resource-amount">{formatNumber(gameState.getResources().wood)}</span>
        <span class={{ 
          'resource-rate': true, 
          'positive': rates().wood >= 0, 
          'negative': rates().wood < 0 
        }}>
          {rates().wood >= 0 ? '+' : ''}{formatNumber(rates().wood)}/s
        </span>
      </div>
      <div class="resource-row">
        <span class="resource-name">Stone</span>
        <span class="resource-amount">{formatNumber(gameState.getResources().stone)}</span>
        <span class={{ 
          'resource-rate': true, 
          'positive': rates().stone >= 0, 
          'negative': rates().stone < 0 
        }}>
          {rates().stone >= 0 ? '+' : ''}{formatNumber(rates().stone)}/s
        </span>
      </div>
      <div class="resource-row">
        <span class="resource-name">Food</span>
        <span class="resource-amount">{formatNumber(gameState.getResources().food)}</span>
        <span class={{ 
          'resource-rate': true, 
          'positive': rates().food >= 0, 
          'negative': rates().food < 0 
        }}>
          {rates().food >= 0 ? '+' : ''}{formatNumber(rates().food)}/s
        </span>
      </div>
      <div class="resource-row">
        <span class="resource-name">Gold</span>
        <span class="resource-amount">{formatNumber(gameState.getResources().gold)}</span>
        <span class={{ 
          'resource-rate': true, 
          'positive': rates().gold >= 0, 
          'negative': rates().gold < 0 
        }}>
          {rates().gold >= 0 ? '+' : ''}{formatNumber(rates().gold)}/s
        </span>
      </div>
      <div class="resource-row">
        <span class="resource-name">Population</span>
        <span class="resource-amount">{gameState.getPopulation()}</span>
        <span class="resource-rate">-</span>
      </div>
      <div class="resource-row">
        <span class="resource-name">Time</span>
        <span class="resource-amount">{gameState.getGameTime().toFixed(0)}s</span>
        <span class="resource-rate">-</span>
      </div>
    </div>
  )
}

export default ResourcePanel