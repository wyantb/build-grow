/**
 * The raw gzip calls, with no worker involved.
 *
 * Both the main thread and the compression worker use these, so the two
 * produce byte-for-byte the same output and a save written on one can be read
 * by the other.
 */

/** True when the browser can gzip and gunzip. */
export const isCompressionSupported = (): boolean =>
  typeof CompressionStream !== 'undefined'
  && typeof DecompressionStream !== 'undefined';

/**
 * Compress UTF-8 text into gzip bytes.
 */
export const gzipBytes = async (text: string): Promise<Uint8Array<ArrayBuffer>> => {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();

  return new Uint8Array(buffer);
};

/**
 * Decompress gzip bytes back into UTF-8 text.
 */
export const gunzipBytes = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));

  return new Response(stream).text();
};
