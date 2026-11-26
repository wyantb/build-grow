# Tech Debt


stat rolls include the original population of 5, not just net change in lives over RB


Known issues and planned work that is deliberately not done yet.

## Saves need a browser with the Compression Streams API

**Status:** Open, accepted for now.

**Where:** `src/systems/compression.ts`, called from `src/systems/saveSystem.ts`.

**The problem.** Saves are gzipped with the browser's Compression Streams API.
Safari only shipped `CompressionStream` in 17.4, so an older Safari cannot
save or load at all. The game reports this with a "no-compression" message
rather than failing quietly, and it keeps playing; the player just cannot
persist their progress.

**The fix.** Fall back to storing the plain JSON when the browser has no
Compression Streams API. The save format does not change: the `BG1:` prefix
names the encoding, so a second prefix could mark an uncompressed save. The
cost is a larger localStorage footprint, which is the reason compression was
chosen in the first place.

**Why it is not done now.** The game targets Chrome, Edge and Firefox. The
message tells anyone on an old Safari exactly what is wrong, and the export
and import buttons still work in a browser that has the API.

**Related.** If the state ever grows past the localStorage quota, the storage
backend should move to IndexedDB, which is asynchronous and has far more room.
The save format does not need to change for that: only the transport does.

## The rebirth rolls use Math.random

**Status:** Open, accepted for now.

**Where:** `src/systems/rebirth.ts`, called from `src/systems/gameEngine.ts`.

**The problem.** A rebirth rolls for better genes with `Math.random`, so the
rolls cannot be reproduced. A player who has a bad rebirth has no way to
replay it, and the game cannot tell a player what they were dealt. The
game already takes a random function through the engine's constructor, so
the roll is testable, but the source is still `Math.random` in the browser.

**The fix.** Replace `Math.random` with a seeded Mersenne Twister. The
generator would be seeded from a seed that is saved with the world, so the
same seed produces the same rebirth. A seed would also let the game show a
player the roll before they confirm it, and let a developer reproduce a
reported outcome exactly.

**Why it is not done now.** The mechanic is new and will change anyway, and
`Math.random` is good enough for a roll the player cannot see the inside of.
The engine's random function is already injectable, so swapping the source
later touches one place.

**Related.** The same generator would serve any future mechanic that needs
reproducible randomness.
