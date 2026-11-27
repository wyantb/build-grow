import type { Resource } from '../types/worldState.js';

export interface TechnologyType {
  id: string;
  name: string;
  description: string;
  /** The resource cost to research this technology. */
  cost: Resource;
  /** Technology ids that must be researched before this one. */
  prereqs: string[];
  /** Building ids that this technology unlocks. */
  unlocksBuildings: string[];
}

export const TECHNOLOGIES: TechnologyType[] = [
  {
    id: 'clay_making',
    name: 'Clay Making',
    description: 'We have learned to shape clay into useful objects.',
    cost: { wood: 0, stone: 0, food: 0, gold: 0, research: 40, clay: 0 },
    prereqs: [],
    unlocksBuildings: ['pottery_studio'],
  },
  {
    id: 'grain_silo',
    name: 'Grain Silo',
    description: 'Store food for your people.',
    cost: { wood: 0, stone: 0, food: 0, gold: 0, research: 80, clay: 0 },
    prereqs: ['clay_making'],
    unlocksBuildings: ['grain_silo'],
  },
  {
    id: 'hierarchy',
    name: 'Hierarchy',
    description: 'The chief helps keep us organized and harnesses ideas for the greater good.',
    cost: { wood: 0, stone: 0, food: 0, gold: 0, research: 50, clay: 0 },
    prereqs: [],
    unlocksBuildings: ['estate'],
  },
  {
    id: 'mining',
    name: 'Mining',
    description: 'Dig deeper into the earth to find valuable ores.',
    cost: { wood: 0, stone: 0, food: 0, gold: 0, research: 120, clay: 0 },
    prereqs: [],
    unlocksBuildings: [],
  },
  {
    id: 'bronze_alloy',
    name: 'Bronze Alloy',
    description: 'Combine copper and tin to create a stronger metal.',
    cost: { wood: 0, stone: 0, food: 0, gold: 0, research: 120, clay: 0 },
    prereqs: ['mining', 'clay_making'],
    unlocksBuildings: [],
  },
];

const technologiesById = new Map(TECHNOLOGIES.map((t) => [t.id, t]));

export const getTechnology = (id: string): TechnologyType | undefined => technologiesById.get(id);
