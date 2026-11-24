import { z } from 'zod';
export declare const ResourceSchema: z.ZodObject<{
    wood: z.ZodNumber;
    stone: z.ZodNumber;
    food: z.ZodNumber;
    gold: z.ZodNumber;
}, z.core.$strip>;
export type Resource = z.infer<typeof ResourceSchema>;
export declare const JobSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    workers: z.ZodNumber;
    productivity: z.ZodNumber;
}, z.core.$strip>;
export type Job = z.infer<typeof JobSchema>;
export declare const BuildingSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    cost: z.ZodObject<{
        wood: z.ZodNumber;
        stone: z.ZodNumber;
        food: z.ZodNumber;
        gold: z.ZodNumber;
    }, z.core.$strip>;
    buildTime: z.ZodNumber;
    built: z.ZodBoolean;
    constructionProgress: z.ZodNumber;
}, z.core.$strip>;
export type Building = z.infer<typeof BuildingSchema>;
export declare const SpeciesSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    baseStats: z.ZodObject<{
        strength: z.ZodNumber;
        intelligence: z.ZodNumber;
        agility: z.ZodNumber;
        magic: z.ZodNumber;
    }, z.core.$strip>;
    growthRate: z.ZodNumber;
    resourceConsumption: z.ZodNumber;
}, z.core.$strip>;
export type Species = z.infer<typeof SpeciesSchema>;
export declare const WorldStateSchema: z.ZodObject<{
    version: z.ZodString;
    tick: z.ZodNumber;
    resources: z.ZodObject<{
        wood: z.ZodNumber;
        stone: z.ZodNumber;
        food: z.ZodNumber;
        gold: z.ZodNumber;
    }, z.core.$strip>;
    population: z.ZodNumber;
    jobs: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        workers: z.ZodNumber;
        productivity: z.ZodNumber;
    }, z.core.$strip>>;
    buildings: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        cost: z.ZodObject<{
            wood: z.ZodNumber;
            stone: z.ZodNumber;
            food: z.ZodNumber;
            gold: z.ZodNumber;
        }, z.core.$strip>;
        buildTime: z.ZodNumber;
        built: z.ZodBoolean;
        constructionProgress: z.ZodNumber;
    }, z.core.$strip>>;
    species: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        baseStats: z.ZodObject<{
            strength: z.ZodNumber;
            intelligence: z.ZodNumber;
            agility: z.ZodNumber;
            magic: z.ZodNumber;
        }, z.core.$strip>;
        growthRate: z.ZodNumber;
        resourceConsumption: z.ZodNumber;
    }, z.core.$strip>;
    unlockedBuildings: z.ZodArray<z.ZodString>;
    unlockedJobs: z.ZodArray<z.ZodString>;
    gameTime: z.ZodNumber;
}, z.core.$strip>;
export type WorldState = z.infer<typeof WorldStateSchema>;
export declare const createInitialState: () => WorldState;
//# sourceMappingURL=worldState.d.ts.map