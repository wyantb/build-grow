import type { Resource } from '../types/worldState.js';

/**
 * How many seconds to accumulate a cost at current income rates,
 * ignoring what the player already has.
 *
 * When multiple resources are needed, the slowest one decides.
 * Returns `undefined` when the cost has no resources (nothing to accumulate).
 * Returns `Infinity` when a needed resource is not being produced.
 */
export function timeToIncome(
  cost: Resource,
  rates: Resource,
): number | undefined {
  let maxTime = 0;
  let hasCost = false;

  for (const key of ['wood', 'stone', 'food', 'gold', 'research'] as const) {
    const needed = cost[key] ?? 0;
    if (needed <= 0) {continue;}

    hasCost = true;

    const rate = rates[key];
    const time = rate > 0 ? needed / rate : Infinity;
    if (time > maxTime) {
      maxTime = time;
    }
  }

  return hasCost ? maxTime : undefined;
}

/**
 * How many seconds until the player can afford a cost,
 * taking current resources into account.
 *
 * Returns `undefined` when already affordable (no deficit on any resource).
 * Returns `Infinity` when a needed resource is not being produced and the
 * player doesn't have enough in stock.
 */
export function timeToAvailable(
  cost: Resource,
  rates: Resource,
  resources: Resource,
): number | undefined {
  let maxTime = 0;
  let hasDeficit = false;

  for (const key of ['wood', 'stone', 'food', 'gold', 'research'] as const) {
    const needed = cost[key] ?? 0;
    if (needed <= 0) {continue;}

    const have = resources[key];
    if (have >= needed) {continue;}

    hasDeficit = true;

    const deficit = needed - have;
    const rate = rates[key];
    const time = rate > 0 ? deficit / rate : Infinity;
    if (time > maxTime) {
      maxTime = time;
    }
  }

  return hasDeficit ? maxTime : undefined;
}

/**
 * Format a duration in seconds for display.
 *
 * <= 0: "now"
 * Infinity: "never"
 * <60s: whole seconds, rounded up
 * 60s–3600s: X.Y minutes
 * 3600s–86400s: X.Y hours
 * >86400s: "24+ h"
 */
export function formatTime(seconds: number): string {
  if (seconds === Infinity) {return 'never';}
  if (seconds <= 0) {return 'now';}
  if (seconds < 60) {return `${Math.ceil(seconds)}s`;}
  if (seconds < 3600) {return `${(seconds / 60).toFixed(1)} min`;}
  if (seconds <= 86400) {return `${(seconds / 3600).toFixed(1)} h`;}

  return '24+ h';
}
