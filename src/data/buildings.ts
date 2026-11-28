import type { Resource, ResourceOptional } from '../types/worldState.js';
import type { TechnologyId } from './technologies.js';
import { fillResource } from './resources.js';

export type BuildingCategory = 'Residential Block' | 'Commercial District' | 'Rural District' | 'Factory District' | 'Storage';

export interface BuildingType {
  id: string;
  name: string;
  description: string;
  cost: ResourceOptional;
  /** Display category — groups buttons under section headings. */
  category: BuildingCategory;
  /**
   * Technologies that must be researched before this building is visible.
   * An empty array means the building is visible from the start.
   */
  requiresTechs?: TechnologyId[];
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
    clay?: number;
    knowledge?: number;
  };
  /**
   * How much population housing this building provides per copy.
   *
   * Only applies when `housingRequiresTech` is researched (or when absent).
   * The engine sums these across all copies to derive housing at runtime.
   */
  housingBonus?: number;
  /**
   * Technology that must be researched before this building's housingBonus
   * takes effect. Absent means the housing is active from the start.
   */
  housingRequiresTech?: TechnologyId;
}

export const BUILDING_TYPES: BuildingType[] = [
  {
    id: 'hut',
    name: 'Hut',
    description: 'Basic housing for your population; provides 2 base pop capacity.',
    cost: { wood: 20, stone: 10 },
    category: 'Residential Block',
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Provides 1 merchant job; enabling resource trading.',
    cost: { wood: 30, stone: 30, food: 15 },
    category: 'Commercial District',
  },
  {
    id: 'caravanserai',
    name: 'Caravanserai',
    description: 'A trading house on the caravan route. It has no staff of its own, but it gives every merchant room for one more trade position.',
    cost: { wood: 500, stone: 500 },
    category: 'Commercial District',
  },
  {
    id: 'lumberjack',
    name: 'Lumberjack Post',
    description: 'Provides work for lumberjacks; increasing wood production.',
    cost: { wood: 25, stone: 15 },
    category: 'Rural District',
  },
  {
    id: 'quarry',
    name: 'Quarry',
    description: 'Provides work for quarry workers; increasing stone production.',
    cost: { wood: 20, stone: 25 },
    category: 'Rural District',
  },
  {
    id: 'farm',
    name: 'Farm',
    description: 'Provides work for a farmer; increasing food production.',
    cost: { wood: 35 },
    category: 'Rural District',
    housingBonus: 5,
    housingRequiresTech: 'farm_houses',
  },
  {
    id: 'shed',
    name: 'Shed',
    description: 'Stores a small amount of productive resources.',
    cost: { wood: 30, stone: 10 },
    storageBonus: { woodStone: 200, clay: 50 },
    category: 'Storage',
  },
  {
    id: 'grain_silo',
    name: 'Grain Silo',
    description: 'Stores food for your people.',
    cost: { wood: 40, stone: 20 },
    requiresTechs: ['grain_silo'],
    storageBonus: { food: 500 },
    category: 'Storage',
  },
  {
    id: 'pottery_studio',
    name: 'Pottery Studio',
    description: 'A workshop for shaping clay into useful wares.',
    cost: { wood: 30, stone: 80 },
    requiresTechs: ['clay_making'],
    category: 'Commercial District',
  },
  {
    id: 'estate',
    name: 'Estate',
    description: 'A grand hall for the chief to govern and inspire.',
    cost: { wood: 150, stone: 150 },
    requiresTechs: ['hierarchy'],
    category: 'Commercial District',
  },
  {
    id: 'copper_mine',
    name: 'Copper Mine',
    description: 'Digs deep for copper ore. Provides work for copper miners.',
    cost: { wood: 100, stone: 80 },
    requiresTechs: ['mining'],
    category: 'Rural District',
  },
  {
    id: 'tin_mine',
    name: 'Tin Mine',
    description: 'Extracts rare tin deposits. Provides work for tin miners.',
    cost: { wood: 120, stone: 100 },
    requiresTechs: ['mining'],
    category: 'Rural District',
  },
  {
    id: 'copper_kiln',
    name: 'Copper Kiln',
    description: 'A furnace for smelting copper and tin into bronze.',
    cost: { wood: 80, stone: 150, clay: 60 },
    requiresTechs: ['bronze_alloy'],
    category: 'Factory District',
  },
  {
    id: 'paper_mill',
    name: 'Paper Mill',
    description: 'Processes wood pulp into sheets of paper. Provides work for paper makers.',
    cost: { wood: 60, stone: 40 },
    requiresTechs: ['paper_making'],
    category: 'Commercial District',
  },
  {
    id: 'library',
    name: 'Library',
    description: 'A repository of written knowledge. Provides a librarian job and +100 knowledge storage.',
    cost: { wood: 100, stone: 100, clay: 20, paper: 20 },
    requiresTechs: ['writing'],
    storageBonus: { knowledge: 100 },
    category: 'Commercial District',
  },
  {
    id: 'brazier',
    name: 'Brazier',
    description: 'A communal forge that consumes bronze to empower workers with bronze tools.',
    cost: { wood: 50, stone: 80 },
    requiresTechs: ['bronze_hoe'],
    category: 'Factory District',
  },
];

/** The id of any building in the catalog. */
export type BuildingId = typeof BUILDING_TYPES[number]['id'];

const buildingTypesById = new Map<string, BuildingType>(BUILDING_TYPES.map((type) => [type.id, type]));

export const getBuildingType = (id: string): BuildingType | undefined => buildingTypesById.get(id);

/** The category headings in display order. */
export const BUILDING_CATEGORY_ORDER: BuildingCategory[] = [
  'Residential Block',
  'Rural District',
  'Factory District',
  'Commercial District',
  'Storage',
];

/** Cost multiplier per existing building of the same type. */
export const COST_SCALE_FACTOR = 1.35;

/** Return the base cost multiplied by 1.35^n where n = count. */
export function getScaledCost(cost: ResourceOptional, count: number): Resource {
  if (count === 0) {
    return fillResource(cost);
  }

  const factor = Math.pow(COST_SCALE_FACTOR, count);

  return fillResource({
    wood: cost.wood ? Math.ceil(cost.wood * factor) : 0,
    stone: cost.stone ? Math.ceil(cost.stone * factor) : 0,
    food: cost.food ? Math.ceil(cost.food * factor) : 0,
    gold: cost.gold ? Math.ceil(cost.gold * factor) : 0,
    research: cost.research ? Math.ceil(cost.research * factor) : 0,
    clay: cost.clay ? Math.ceil(cost.clay * factor) : 0,
    copper: cost.copper ? Math.ceil(cost.copper * factor) : 0,
    tin: cost.tin ? Math.ceil(cost.tin * factor) : 0,
    bronze: cost.bronze ? Math.ceil(cost.bronze * factor) : 0,
    paper: cost.paper ? Math.ceil(cost.paper * factor) : 0,
  });
}
