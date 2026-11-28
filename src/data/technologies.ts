/**
 * Technologies the player can research.
 *
 * Each technology has a research cost, optional prerequisites, and optional
 * buildings it unlocks. Cost is a single research value because research is
 * the only resource that can pay for technologies.
 */

export const TECHNOLOGIES = {
  clay_making: {
    id: 'clay_making',
    name: 'Clay Making',
    description: 'We have learned to shape clay into useful objects.',
    researchCost: 40,
    prereqs: [] as string[],
    unlocksBuildings: ['pottery_studio'] as string[],
  },
  grain_silo: {
    id: 'grain_silo',
    name: 'Grain Silo',
    description: 'Store food for your people.',
    researchCost: 80,
    prereqs: ['clay_making'],
    unlocksBuildings: ['grain_silo'],
  },
  hierarchy: {
    id: 'hierarchy',
    name: 'Hierarchy',
    description: 'The chief helps keep us organized and harnesses ideas for the greater good.',
    researchCost: 50,
    prereqs: [],
    unlocksBuildings: ['estate'],
  },
  mining: {
    id: 'mining',
    name: 'Mining',
    description: 'Dig deeper into the earth to find valuable ores.',
    researchCost: 120,
    prereqs: [],
    unlocksBuildings: [] as string[],
  },
  bronze_alloy: {
    id: 'bronze_alloy',
    name: 'Bronze Alloy',
    description: 'Combine copper and tin to create a stronger metal.',
    researchCost: 120,
    prereqs: ['mining', 'clay_making'],
    unlocksBuildings: [] as string[],
  },
} as const;

export type TechnologyId = keyof typeof TECHNOLOGIES;
export type TechnologyEntry = (typeof TECHNOLOGIES)[TechnologyId];

const technologyEntries = Object.values(TECHNOLOGIES) as TechnologyEntry[];
const technologiesById = new Map(technologyEntries.map((t) => [t.id, t]));

export const getTechnology = (id: TechnologyId | string): TechnologyEntry | undefined => technologiesById.get(id as TechnologyId);
