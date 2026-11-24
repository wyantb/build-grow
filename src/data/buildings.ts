import type { Resource } from '../types/worldState.js';

export type BuildingCategory = 'Residential Block' | 'Commercial District' | 'Industrial Park';

export interface BuildingType {
  id: string;
  name: string;
  description: string;
  cost: Resource;
  buildTime: number;
  effect: string;
  /** Display category — groups buttons under section headings. */
  category: BuildingCategory;
}

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: 'hut',
    name: 'Hut',
    description: 'Basic housing for your population.',
    cost: { wood: 20, stone: 10, food: 0, gold: 0 },
    buildTime: 30,
    effect: 'Provides housing for citizens.',
    category: 'Residential Block',
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Sells resources for gold.',
    cost: { wood: 30, stone: 30, food: 15, gold: 0 },
    buildTime: 60,
    effect: 'Provides 1 merchant job and enables resource trading.',
    category: 'Commercial District',
  },
  {
    id: 'lumberjack',
    name: 'Lumberjack Post',
    description: 'Produces wood resources.',
    cost: { wood: 25, stone: 15, food: 0, gold: 0 },
    buildTime: 45,
    effect: 'Provides work for lumberjacks and increases wood production.',
    category: 'Industrial Park',
  },
  {
    id: 'quarry',
    name: 'Quarry',
    description: 'Produces stone resources.',
    cost: { wood: 20, stone: 25, food: 0, gold: 0 },
    buildTime: 45,
    effect: 'Provides work for quarry workers and increases stone production.',
    category: 'Industrial Park',
  },
  {
    id: 'builder',
    name: 'Builder Workshop',
    description: 'Allows construction of more advanced buildings.',
    cost: { wood: 50, stone: 30, food: 20, gold: 0 },
    buildTime: 120,
    effect: 'Allows construction of advanced buildings.',
    category: 'Industrial Park',
  },
];

const buildingTypesById = new Map(BUILDING_TYPES.map((type) => [type.id, type]));

export const getBuildingType = (id: string): BuildingType | undefined => buildingTypesById.get(id);

/** The category headings in display order. */
export const BUILDING_CATEGORY_ORDER: BuildingCategory[] = [
  'Residential Block',
  'Commercial District',
  'Industrial Park',
];

/** Cost multiplier per existing building of the same type. */
export const COST_SCALE_FACTOR = 1.35;
/** Build-time multiplier per existing building of the same type. */
export const BUILD_TIME_SCALE_FACTOR = 1.25;

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

/** Return the base build time multiplied by 1.25^n where n = count. */
export function getScaledBuildTime(baseTime: number, count: number): number {
  if (count === 0) {
    return baseTime;
  }

  return Math.ceil(baseTime * Math.pow(BUILD_TIME_SCALE_FACTOR, count));
}
