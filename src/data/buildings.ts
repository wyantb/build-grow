import type { Resource } from '../types/worldState.js';

export type BuildingCategory = 'Residential Block' | 'Commercial District' | 'Rural District' | 'Storage';

export interface BuildingType {
  id: string;
  name: string;
  description: string;
  cost: Resource;
  effect: string;
  /** Display category — groups buttons under section headings. */
  category: BuildingCategory;
  /**
   * How much storage this building adds per copy.
   *
   * Absent or zero means the building does not increase storage.
   * The engine sums these across all copies of the building to
   * derive the cap at runtime; the UI reads the same values so
   * tooltips and the city-center panel stay in sync.
   */
  storageBonus?: {
    woodStone?: number;
    food?: number;
  };
}

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: 'hut',
    name: 'Hut',
    description: 'Basic housing for your population.',
    cost: { wood: 20, stone: 10, food: 0, gold: 0 },
    effect: 'Houses 2 people. The population cannot grow past the housing.',
    category: 'Residential Block',
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Sells resources for gold.',
    cost: { wood: 30, stone: 30, food: 15, gold: 0 },
    effect: 'Provides 1 merchant job and enables resource trading.',
    category: 'Commercial District',
  },
  {
    id: 'caravanserai',
    name: 'Caravanserai',
    description: 'A trading house on the caravan route. It has no staff of its own, but it gives every merchant room for one more trade.',
    cost: { wood: 500, stone: 500, food: 0, gold: 0 },
    effect: 'Each Caravanserai gives every merchant 1 extra trade position.',
    category: 'Commercial District',
  },
  {
    id: 'lumberjack',
    name: 'Lumberjack Post',
    description: 'Produces wood resources.',
    cost: { wood: 25, stone: 15, food: 0, gold: 0 },
    effect: 'Provides work for lumberjacks and increases wood production.',
    category: 'Rural District',
  },
  {
    id: 'quarry',
    name: 'Quarry',
    description: 'Produces stone resources.',
    cost: { wood: 20, stone: 25, food: 0, gold: 0 },
    effect: 'Provides work for quarry workers and increases stone production.',
    category: 'Rural District',
  },
  {
    id: 'farm',
    name: 'Farm',
    description: 'Grows food to feed your population.',
    cost: { wood: 35, stone: 0, food: 0, gold: 0 },
    effect: 'Provides work for a farmer and increases food production.',
    category: 'Rural District',
  },
  {
    id: 'shed',
    name: 'Shed',
    description: 'A small storage facility for your various resources.',
    cost: { wood: 30, stone: 10, food: 0, gold: 0 },
    effect: 'Stores a small amount of productive resources.',
    storageBonus: { woodStone: 200, food: 200 },
    category: 'Storage',
  },
  {
    id: 'grain_silo',
    name: 'Grain Silo',
    description: 'A sealed silo for long-term grain storage.',
    cost: { wood: 40, stone: 20, food: 0, gold: 0 },
    effect: 'Stores food for your people.',
    storageBonus: { food: 500 },
    category: 'Storage',
  },
];

const buildingTypesById = new Map(BUILDING_TYPES.map((type) => [type.id, type]));

export const getBuildingType = (id: string): BuildingType | undefined => buildingTypesById.get(id);

/** The category headings in display order. */
export const BUILDING_CATEGORY_ORDER: BuildingCategory[] = [
  'Residential Block',
  'Commercial District',
  'Rural District',
  'Storage',
];

/** Cost multiplier per existing building of the same type. */
export const COST_SCALE_FACTOR = 1.35;

/** Return the base cost multiplied by 1.35^n where n = count. */
export function getScaledCost(cost: Resource, count: number): Resource {
  if (count === 0) {
    return { ...cost };
  }

  const factor = Math.pow(COST_SCALE_FACTOR, count);

  return {
    wood: Math.ceil(cost.wood * factor),
    stone: Math.ceil(cost.stone * factor),
    food: Math.ceil(cost.food * factor),
    gold: Math.ceil(cost.gold * factor),
  };
}
