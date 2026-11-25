import { z } from 'zod';
import { ResourceSchema, MarketSchema } from './worldState.js';

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
export const SAVE_VERSION = 1;

/** Worker counts per job. */
const JobWorkersSchema = z.record(z.string(), z.object({
  workers: z.number(),
}));

/**
 * One building instance.
 *
 * Only the identity and the construction state are saved; the rest comes
 * from the building catalog.
 */
const SavedBuildingSchema = z.object({
  id: z.string(),
  built: z.boolean(),
  constructionProgress: z.number(),
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
  buildings: z.record(z.string(), SavedBuildingSchema),
  buildingCounts: z.record(z.string(), z.number()),
  unlockedBuildings: z.array(z.string()),
  unlockedJobs: z.array(z.string()),
  market: MarketSchema,
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
