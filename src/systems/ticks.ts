/**
 * The game's tick rate.
 *
 * It lives on its own so that the systems that reason about time, such as
 * the population growth rule, can share it without importing the engine.
 */

/** How many ticks the engine runs per second. */
export const TICKS_PER_SECOND = 5;
