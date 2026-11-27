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
    id: 'grain_silo',
    name: 'Grain Silo',
    description: 'Store food for your people.',
    cost: { wood: 0, stone: 0, food: 0, gold: 0, research: 80 },
    prereqs: [],
    unlocksBuildings: ['grain_silo'],
  },
];

const technologiesById = new Map(TECHNOLOGIES.map((t) => [t.id, t]));

export const getTechnology = (id: string): TechnologyType | undefined => technologiesById.get(id);
