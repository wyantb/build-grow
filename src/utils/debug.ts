/**
 * Debug flag: true in development, false in production builds.
 *
 * Use this to gate console logging of world state and other diagnostics
 * that should not run in the shipped build.
 */
export const DEBUG = import.meta.env.DEV;
