/**
 * Technologies the player can research.
 *
 * Each technology has a research cost and optional prerequisites.
 * Buildings declare which technologies they require via `requiresTechs`,
 * so a technology never needs to know about buildings.
 */

export const TECHNOLOGIES = {
  clay_making: {
    id: 'clay_making',
    name: 'Clay Making',
    description: 'We have learned to shape clay into useful objects.',
    researchCost: 40,
    prereqs: [] as string[],
  },
  grain_silo: {
    id: 'grain_silo',
    name: 'Grain Silo',
    description: 'Store food for your people.',
    researchCost: 80,
    prereqs: ['clay_making'],
  },
  hierarchy: {
    id: 'hierarchy',
    name: 'Hierarchy',
    description: 'The chief helps keep us organized and harnesses ideas for the greater good.',
    researchCost: 50,
    prereqs: [],
  },
  mining: {
    id: 'mining',
    name: 'Mining',
    description: 'Dig deeper into the earth to find valuable ores.',
    researchCost: 120,
    prereqs: [],
  },
  bronze_alloy: {
    id: 'bronze_alloy',
    name: 'Bronze Alloy',
    description: 'Combine copper and tin to create a stronger metal.',
    researchCost: 120,
    prereqs: ['mining', 'clay_making'],
  },
  paper_making: {
    id: 'paper_making',
    name: 'Paper Making',
    description: 'Press wood pulp into sheets for writing and record-keeping.',
    researchCost: 75,
    prereqs: [],
  },
  writing: {
    id: 'writing',
    name: 'Writing',
    description: 'Record knowledge on paper. Librarians multiply research output.',
    researchCost: 150,
    prereqs: ['paper_making'],
  },
  bronze_hoe: {
    id: 'bronze_hoe',
    name: 'Bronze Hoe',
    description: 'Bronze-tipped hoes make farming more productive. Requires a brazier.',
    researchCost: 250,
    prereqs: ['writing', 'bronze_alloy'],
  },
  bronze_axe: {
    id: 'bronze_axe',
    name: 'Bronze Axe',
    description: 'Bronze axes fell trees faster. Requires a brazier.',
    researchCost: 250,
    prereqs: ['writing', 'bronze_alloy'],
  },
  bronze_chisel: {
    id: 'bronze_chisel',
    name: 'Bronze Chisel',
    description: 'Bronze chisels carve stone with ease. Requires a brazier.',
    researchCost: 250,
    prereqs: ['writing', 'bronze_alloy'],
  },
  bronze_pick: {
    id: 'bronze_pick',
    name: 'Bronze Pick',
    description: 'Bronze picks mine copper and tin more efficiently. Requires a brazier.',
    researchCost: 250,
    prereqs: ['writing', 'bronze_alloy'],
  },
  farm_houses: {
    id: 'farm_houses',
    name: 'Farm Houses',
    description: 'Add a house to every farm, providing housing for your people.',
    researchCost: 300,
    prereqs: ['bronze_alloy'],
  },
} as const;

export type TechnologyId = keyof typeof TECHNOLOGIES;
export type TechnologyEntry = (typeof TECHNOLOGIES)[TechnologyId];

const technologyEntries = Object.values(TECHNOLOGIES) as TechnologyEntry[];
const technologiesById = new Map(technologyEntries.map((t) => [t.id, t]));

export const getTechnology = (id: TechnologyId | string): TechnologyEntry | undefined => technologiesById.get(id as TechnologyId);
