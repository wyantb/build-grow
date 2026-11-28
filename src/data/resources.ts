/**
 * The resource catalog.
 *
 * Every physical resource the engine tracks lives here with its market and
 * rarity metadata. The ResourceSchema in worldState.ts is derived from this
 * map, so adding a resource only requires one entry.
 *
 * INVARIANT (game_design/resources.md): manufactured resources should have
 * a higher baseFactor and baseRarity than the raw materials they come from.
 */

import type { TechnologyId } from './technologies.js';

/** Where a resource comes from. */
export type ResourceCategory = 'rawMaterial' | 'manufactured' | 'metaphysical';

/** All resources the engine tracks. */
export const RESOURCES = {
  /** The basic building material, harvested by lumberjacks. */
  wood: {
    name: 'Wood',
    description: 'The basic building material. Used for construction and upkeep.',
    baseFactor: 0.5,
    baseRarity: 1,
    tradeable: true,
    category: 'rawMaterial' as const,
    production: 'lumberjack',
    unlocksTech: null as TechnologyId | null,
  },
  /** Mined from quarries; the other basic building material. */
  stone: {
    name: 'Stone',
    description: 'Mined for sturdy buildings and fortifications.',
    baseFactor: 0.75,
    baseRarity: 1,
    tradeable: true,
    category: 'rawMaterial' as const,
    production: 'quarrier',
    unlocksTech: null as TechnologyId | null,
  },
  /** Grown by farmers; consumed by every person. */
  food: {
    name: 'Food',
    description: 'Keeps your population fed. A shortage stalls growth.',
    baseFactor: 0.4,
    baseRarity: 1,
    tradeable: true,
    category: 'rawMaterial' as const,
    production: 'farmer',
    unlocksTech: null as TechnologyId | null,
  },
  /** The medium of exchange; never traded on the market. */
  gold: {
    name: 'Gold',
    description: 'The medium of exchange. Spent and earned, never bought or sold.',
    baseFactor: 0,
    baseRarity: 0,
    tradeable: false,
    category: 'metaphysical' as const,
    production: null,
    unlocksTech: null as TechnologyId | null,
  },
  /** Accumulates from per-person research; used to unlock technologies. */
  research: {
    name: 'Research',
    description: 'Accumulates from everyday discoveries. Used to unlock technologies.',
    baseFactor: 0,
    baseRarity: 0,
    tradeable: false,
    category: 'metaphysical' as const,
    production: null,
    unlocksTech: null as TechnologyId | null,
  },
  /** Shaped by ceramists from stone; used for pottery and other wares. */
  clay: {
    name: 'Clay',
    description: 'Shaped into pottery and other useful wares.',
    baseFactor: 1.5,
    baseRarity: 2,
    tradeable: true,
    category: 'manufactured' as const,
    production: 'ceramist',
    unlocksTech: 'clay_making' as TechnologyId,
  },
  /** Mined by copper miners; a raw material for bronze. */
  copper: {
    name: 'Copper',
    description: 'A reddish metal mined from deep deposits. Used in alloys and tools.',
    baseFactor: 2.5,
    baseRarity: 3,
    tradeable: true,
    category: 'rawMaterial' as const,
    production: 'copper_miner',
    unlocksTech: 'mining' as TechnologyId,
  },
  /** Mined by tin miners; a rarer raw material for bronze. */
  tin: {
    name: 'Tin',
    description: 'A soft, silver-white metal. Rare deposits make it prized.',
    baseFactor: 3.25,
    baseRarity: 4,
    tradeable: true,
    category: 'rawMaterial' as const,
    production: 'tin_miner',
    unlocksTech: 'mining' as TechnologyId,
  },
  /** Cast from copper and tin; a strong alloy for tools and weapons. */
  bronze: {
    name: 'Bronze',
    description: 'A strong alloy of copper and tin. Superior to either metal alone.',
    baseFactor: 8.25,
    baseRarity: 5,
    tradeable: true,
    category: 'manufactured' as const,
    production: 'bronze_caster',
    unlocksTech: 'bronze_alloy' as TechnologyId,
  },
  /** Pressed from wood pulp; used for writing and record-keeping. */
  paper: {
    name: 'Paper',
    description: 'Sheets pressed from processed wood pulp. The foundation of literacy.',
    baseFactor: 4.0,
    baseRarity: 3,
    tradeable: true,
    category: 'manufactured' as const,
    production: 'paper_maker',
    unlocksTech: 'paper_making' as TechnologyId,
  },
} as const;

export type ResourceEnum = keyof typeof RESOURCES;
export type ResourceEntry = (typeof RESOURCES)[ResourceEnum];

/**
 * The resource shape used by the engine.
 *
 * Every key in RESOURCES maps to a number, so this stays in sync with the
 * catalog automatically.
 */
/** Resources that have a storage cap (and a capped display in the UI). */
export type CappedResource = 'wood' | 'stone' | 'food' | 'research' | 'clay' | 'copper' | 'tin' | 'bronze' | 'paper';

export type Resource = { [K in ResourceEnum]: number };
/** A resource record where omitted fields default to 0 at runtime. */
export type ResourceOptional = Partial<Record<ResourceEnum, number>>;

/** Fill a partial resource object with 0 for every missing key. */
export function fillResource(partial: ResourceOptional): Resource {
  const result = {} as Resource;
  for (const key of Object.keys(RESOURCES) as ResourceEnum[]) {
    result[key] = partial[key] ?? 0;
  }

  return result;
}

/** The tradable resources (those that can be bought or sold at market). */
export const MARKET_RESOURCES = (
  Object.entries(RESOURCES) as [ResourceEnum, ResourceEntry][]
)
  .filter(([, r]) => r.tradeable)
  .map(([key]) => key);

/** Raw materials: harvested or gathered directly from the world. */
export const RAW_MATERIAL_RESOURCES = (
  Object.entries(RESOURCES) as [ResourceEnum, ResourceEntry][]
)
  .filter(([, r]) => r.category === 'rawMaterial')
  .map(([key]) => key);

/** Manufactured resources: crafted from raw materials. */
export const MANUFACTURED_RESOURCES = (
  Object.entries(RESOURCES) as [ResourceEnum, ResourceEntry][]
)
  .filter(([, r]) => r.category === 'manufactured')
  .map(([key]) => key);
