# Tech Debt

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

## Save compression runs on the main thread

**Status:** Done. Compression moved into a Web Worker.

**Where:** `src/systems/compression.ts` and `src/systems/compressionWorker.ts`.

**What it does.** Gzipping and gunzipping run in a Web Worker, so the game
keeps ticking while a save is written. The worker takes the JSON string,
compresses it, and posts the bytes back.

**What is left.** A browser that blocks workers, or a page opened from a
`file://` URL, cannot start the worker. The code falls back to compressing on
the main thread, so the game still saves, but the stutter the worker was meant
to avoid comes back on those pages.
