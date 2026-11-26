/**
 * Debug flag: true in development, false in production builds.
 *
 * Use this to gate console logging of world state and other diagnostics
 * that should not run in the shipped build.
 */
export const DEBUG = import.meta.env.DEV;

/**
 * Game speed multipliers available in debug mode.
 *
 * Each click cycles to the next value: 5x, 10x, 25x, 100x, then back to 1x.
 */
export const GAME_SPEEDS = [5, 10, 25, 100, 1] as const;

/**
 * Return the next speed in the rotation after the given one.
 *
 * When the current speed is not in the list (or the last entry), it wraps
 * to the first.
 */
export function nextGameSpeed(current: number): number {
  const idx = GAME_SPEEDS.indexOf(current as (typeof GAME_SPEEDS)[number]);

  if (idx < 0 || idx === GAME_SPEEDS.length - 1) {
    return GAME_SPEEDS[0];
  }

  const next = GAME_SPEEDS[idx + 1];

  if (!next) {return GAME_SPEEDS[0];}

  return next;
}
