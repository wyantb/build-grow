/**
 * The game's semantic version.
 *
 * Save files record this so a load can tell whether the save was written by a
 * different build of the game. The save format has its own version, which
 * moves only when the shape of a save changes; this version moves whenever
 * the game changes in a way that could affect a saved world, such as a
 * balance change to a job or a building.
 */
export const GAME_VERSION = '3.2.0';

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a `major.minor.patch` version string.
 *
 * Returns undefined for anything that is not a plain three-part version, so
 * a corrupt value is reported rather than silently treated as compatible.
 */
export const parseVersion = (version: string): ParsedVersion | undefined => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());

  if (!match) {
    return undefined;
  }

  const [, major, minor, patch] = match;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
};

/**
 * True when a save written under `saveVersion` can be loaded by this build.
 *
 * A different major version means the game's rules changed enough that the
 * save may not make sense. A different minor or patch version only means the
 * balance may have shifted, which the load can survive, so the game warns
 * about it rather than refusing.
 */
export const isVersionCompatible = (saveVersion: string): boolean => {
  const parsed = parseVersion(saveVersion);

  if (!parsed) {
    return false;
  }

  const current = parseVersion(GAME_VERSION);

  if (!current) {
    return false;
  }

  return parsed.major === current.major;
};

/**
 * True when the save was written by a different build than this one.
 *
 * The load is allowed to continue, but the player is told what changed.
 */
export const isVersionDifferent = (saveVersion: string): boolean => saveVersion !== GAME_VERSION;
