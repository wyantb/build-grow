import type { Resource } from '../types/worldState.js';

export interface BuildingType {
  id: string;
  name: string;
  description: string;
  cost: Resource;
  buildTime: number;
  effect: string;
}

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: 'hut',
    name: 'Hut',
    description: 'Basic housing for your population',
    cost: { wood: 20, stone: 10, food: 0, gold: 0 },
    buildTime: 30,
    effect: 'Provides housing for citizens'
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Sells resources for money',
    cost: { wood: 30, stone: 30, food: 15, gold: 0 },
    buildTime: 60,
    effect: 'Provides 1 merchant job and enables resource trading'
  },
  {
    id: 'lumberjack',
    name: 'Lumberjack Post',
    description: 'Produces wood resources',
    cost: { wood: 25, stone: 15, food: 0, gold: 0 },
    buildTime: 45,
    effect: 'Provides work for lumberjacks and increases wood production'
  },
  {
    id: 'quarry',
    name: 'Quarry',
    description: 'Produces stone resources',
    cost: { wood: 20, stone: 25, food: 0, gold: 0 },
    buildTime: 45,
    effect: 'Provides work for quarry workers and increases stone production'
  },
  {
    id: 'builder',
    name: 'Builder Workshop',
    description: 'Allows construction of more advanced buildings',
    cost: { wood: 50, stone: 30, food: 20, gold: 0 },
    buildTime: 120,
    effect: 'Allows construction of advanced buildings'
  }
];

const buildingTypesById = new Map(BUILDING_TYPES.map((type) => [type.id, type]));

export const getBuildingType = (id: string): BuildingType | undefined => buildingTypesById.get(id);
