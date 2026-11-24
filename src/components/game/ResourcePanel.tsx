import { Component } from 'solid-js'
import type { Resource } from '../../types/worldState'

interface ResourcePanelProps {
  getResources: () => Resource
  getRates: () => Resource
}

const ResourcePanel: Component<ResourcePanelProps> = (props) => {
  // Format numbers to show scientific notation when appropriate
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K'
    } else {
      return num.toFixed(1)
    }
  }

  return (
    <div class="resource-header">
      <span class="header-name">Resource</span>
      <span class="header-amount">Amount</span>
      <span class="header-rate">Rate/s</span>
    </div>
  )
}

export default ResourcePanel