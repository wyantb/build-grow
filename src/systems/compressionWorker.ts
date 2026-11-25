/**
 * The compression worker.
 *
 * Gzipping a save runs on the main thread by default, which blocks the render
 * loop while it works. This worker takes the JSON off the main thread, so the
 * game keeps ticking while the save is compressed.
 *
 * The worker speaks a small message protocol: a request carries an id and the
 * work to do, and the reply carries the same id.
 */

import { gunzipBytes, gzipBytes } from './gzip.js';

/** The work the worker can do. */
export type CompressionRequestKind = 'gzip' | 'gunzip';

export interface CompressionRequest {
  /** Ties a reply to its request. */
  id: number;
  kind: CompressionRequestKind;
  /** The text to compress, or the gzip bytes to unzip. */
  text?: string;
  bytes?: Uint8Array<ArrayBuffer>;
}

export interface CompressionReply {
  id: number;
  ok: boolean;
  text?: string;
  bytes?: Uint8Array<ArrayBuffer>;
  error?: string;
}

/**
 * Do the work a request asks for and build the reply.
 *
 * A failure comes back as a reply with `ok` false rather than as a thrown
 * error, so one bad request cannot kill the worker.
 */
export const handleCompressionRequest = async (
  request: CompressionRequest,
): Promise<CompressionReply> => {
  try {
    if (request.kind === 'gzip') {
      const bytes = await gzipBytes(request.text ?? '');

      return { id: request.id, ok: true, bytes };
    }

    const text = await gunzipBytes(request.bytes ?? new Uint8Array(new ArrayBuffer(0)));

    return { id: request.id, ok: true, text };
  } catch (error: unknown) {
    return {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'The compression worker failed.',
    };
  }
};

/**
 * Wire the worker up to the message protocol.
 *
 * This runs when the module is loaded inside a worker, where `self` is the
 * worker's global scope.
 */
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (event: MessageEvent<CompressionRequest>): void => {
    void handleCompressionRequest(event.data).then((reply) => {
      self.postMessage(reply);
    });
  };
}
