import type { WorldState, Resource } from '../types/worldState.js';

interface MarketOffer {
  resource: keyof Resource;
  quantity: number;
  price: number; // gold per unit
  type: 'buy' | 'sell';
}

interface MarketTrade {
  resource: keyof Resource;
  quantity: number;
  price: number;
  type: 'buy' | 'sell';
}

class MarketSystem {
  private state: WorldState;
  
  constructor(state: WorldState) {
    this.state = state;
  }
  
  // Process market trades for this tick
  processTrades(): void {
    // For now, we'll just log that we're processing trades
    // In a real implementation, this would handle buying/selling resources
    console.log('Processing market trades...');
  }
  
  // Get available merchants
  getMerchantCount(): number {
    // Check if we have a market building and merchant job
    const market = this.state.buildings['market'];
    const merchantJob = this.state.jobs['merchant'];
    
    if (market && market.built && merchantJob) {
      // Return the number of workers assigned to merchant job
      return merchantJob.workers;
    }
    return 0;
  }
  
  // Get base prices for resources
  getResourcePrices(): Record<keyof Resource, { buy: number; sell: number }> {
    return {
      wood: { buy: 1, sell: 0.5 },
      stone: { buy: 1.2, sell: 0.6 },
      food: { buy: 0.8, sell: 0.4 },
      gold: { buy: 1, sell: 1 } // Gold trades 1:1
    };
  }
  
  // Buy resources from market
  buyResource(resource: keyof Resource, quantity: number): boolean {
    const prices = this.getResourcePrices();
    const priceInfo = prices[resource];
    
    if (!priceInfo) return false;
    
    const cost = quantity * priceInfo.buy;
    
    // Check if player has enough gold
    if (this.state.resources.gold < cost) {
      return false;
    }
    
    // Deduct gold and add resource
    this.state.resources.gold -= cost;
    this.state.resources[resource] += quantity;
    
    return true;
  }
  
  // Sell resources to market
  sellResource(resource: keyof Resource, quantity: number): boolean {
    const prices = this.getResourcePrices();
    const priceInfo = prices[resource];
    
    if (!priceInfo) return false;
    
    // Check if player has enough resources
    if (this.state.resources[resource] < quantity) {
      return false;
    }
    
    const earnings = quantity * priceInfo.sell;
    
    // Deduct resource and add gold
    this.state.resources[resource] -= quantity;
    this.state.resources.gold += earnings;
    
    return true;
  }
}

export default MarketSystem;
export type { MarketOffer, MarketTrade };