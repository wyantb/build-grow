import { z } from 'zod';
import { ResourceSchema, MarketSchema, PendingRebirthSchema } from './worldState.js';

/**
 * The on-disk shape of a save.
 *
 * The payload holds only what changes while the game runs. Everything else
 * (job names, production rates, building costs) is derived from the game
 * data when the save is loaded, so a balance change applies to old saves
 * instead of being frozen inside them.
 */

/** Identifies a save as belonging to this game. */
export const SAVE_FORMAT = 'build-grow.save';

/**
 * The version of the save format itself.
 *
 * This moves only when the shape of a save changes. It is separate from the
 * game version, which moves when the game's rules change.
 */
export const SAVE_VERSION = 2;

/** Worker counts per job, and who works them. */
const JobWorkersSchema = z.record(z.string(), z.object({
  workers: z.number(),
  /**
   * The species working the job, by species id.
   *
   * A save written before jobs tracked their species does not have this, so
   * it is optional and defaults to nobody.
   */
  species: z.record(z.string(), z.number()).optional(),
}));

/**
 * One building instance.
 *
 * Only the identity is saved; the rest comes from the building catalog.
 */
const SavedBuildingSchema = z.object({
  id: z.string(),
});

/** The mutable part of the world. */
export const SavePayloadSchema = z.object({
  /**
   * The game version that wrote this payload.
   *
   * The envelope carries the version too, but the payload keeps its own so
   * that a bare payload can still be checked against the game. It is optional
   * because saves written before the payload carried a version do not have
   * one, and those should still load.
   */
  version: z.string().optional(),
  tick: z.number(),
  gameTime: z.number(),
  population: z.number(),
  resources: ResourceSchema,
  defaultJob: z.string(),
  jobs: JobWorkersSchema,
  /**
   * The jobs in priority order, top to bottom.
   *
   * A save written before the jobs could be ordered does not have this, so
   * it is optional and the starting order is used instead.
   */
  jobOrder: z.array(z.string()).optional(),
  /**
   * The species living in the world, by species id.
   *
   * Only the stats are saved: the name and the description come from the
   * species catalog on load.
   */
  species: z.record(z.string(), z.object({
    stats: z.object({
      strength: z.number(),
      dexterity: z.number(),
      constitution: z.number(),
      intelligence: z.number(),
      wisdom: z.number(),
      charisma: z.number(),
      manaSensitivity: z.number(),
    }),
    /**
     * How many of this species are in the world.
     *
     * A save written before the roster counted its species does not have
     * this, so it is optional and defaults to none.
     */
    count: z.number().optional(),
  })).optional(),
  buildings: z.record(z.string(), SavedBuildingSchema),
  buildingCounts: z.record(z.string(), z.number()),
  unlockedBuildings: z.array(z.string()),
  unlockedJobs: z.array(z.string()),
  /**
   * The technologies the player has researched.
   *
   * A save written before the research system existed does not have this,
   * so it is optional and defaults to none.
   */
  researchedTechnologies: z.array(z.string()).optional(),
  market: MarketSchema,
  /**
   * A rebirth the player has started but not confirmed.
   *
   * It is optional because a save written before the rebirth existed does
   * not have one, and because most saves are made outside a rebirth.
   */
  pendingRebirth: PendingRebirthSchema.optional(),
  /**
   * The rebirth pool.
   *
   * Tracks what races are available for the next village. A save written
   * before the pool existed does not have it, so it defaults to zero elves.
   */
  rebirthPool: z.object({
    human: z.number().optional(),
    elf: z.number(),
  }).optional(),
});

export type SavePayload = z.infer<typeof SavePayloadSchema>;

/**
 * The complete save file.
 *
 * `saveVersion` gates the shape of `state`, `gameVersion` records which
 * build of the game wrote the file.
 */
export const SaveEnvelopeSchema = z.object({
  format: z.literal(SAVE_FORMAT),
  saveVersion: z.number(),
  gameVersion: z.string(),
  savedAt: z.string(),
  state: SavePayloadSchema,
});

export type SaveEnvelope = z.infer<typeof SaveEnvelopeSchema>;
