/**
 * Gzip encoding for save payloads.
 *
 * A save is JSON text. It is stored gzipped, which keeps a large world well
 * inside the localStorage quota and makes the exported file a standard gzip
 * archive that any tool can open.
 *
 * The compression runs in a Web Worker, so the game keeps ticking while a
 * save is written. A browser that cannot start a worker falls back to
 * compressing on the main thread.
 */

import { gunzipBytes, gzipBytes, isCompressionSupported } from './gzip.js';
import type { CompressionReply, CompressionRequest } from './compressionWorker.js';

export { isCompressionSupported };

/**
 * Encode bytes as base64.
 *
 * The bytes are converted in chunks because spreading a large array into
 * `String.fromCharCode` overflows the call stack.
 */
export const bytesToBase64 = (bytes: Uint8Array<ArrayBuffer>): string => {
  const CHUNK_SIZE = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

/**
 * Decode a base64 string back into bytes.
 */
export const base64ToBytes = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

/**
 * The worker, once it has been started.
 *
 * It is created on the first compression so that a game that never saves
 * never starts one.
 */
let worker: Worker | null = null;
let workerBroken = false;
let nextRequestId = 1;

const startWorker = (): Worker | null => {
  if (worker) {
    return worker;
  }

  if (workerBroken) {
    return null;
  }

  try {
    worker = new Worker(new URL('./compressionWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    // A browser that blocks workers, or a page opened from a file, falls
    // back to compressing on the main thread.
    workerBroken = true;

    return null;
  }

  worker.onerror = () => {
    workerBroken = true;
    worker?.terminate();
    worker = null;
  };

  return worker;
};

/**
 * Send work to the worker and wait for its reply.
 *
 * Resolves with undefined when the worker could not do the work, so the
 * caller falls back to the main thread.
 */
const runInWorker = <T>(
  request: Omit<CompressionRequest, 'id'>,
  read: (reply: CompressionReply) => T | undefined,
): Promise<T | undefined> => {
  const activeWorker = startWorker();

  if (!activeWorker) {
    return Promise.resolve(undefined);
  }

  const id = nextRequestId++;

  return new Promise<T | undefined>((resolve) => {
    const onMessage = (event: MessageEvent<CompressionReply>) => {
      if (event.data.id !== id) {
        return;
      }

      activeWorker.removeEventListener('message', onMessage);

      if (!event.data.ok) {
        resolve(undefined);

        return;
      }

      resolve(read(event.data));
    };

    activeWorker.addEventListener('message', onMessage);

    activeWorker.postMessage({ ...request, id } satisfies CompressionRequest);
  });
};

/**
 * Compress UTF-8 text into gzip bytes.
 */
export const compressText = async (text: string): Promise<Uint8Array<ArrayBuffer>> => {
  const fromWorker = await runInWorker(
    { kind: 'gzip', text },
    (reply) => reply.bytes,
  );

  if (fromWorker) {
    return fromWorker;
  }

  return gzipBytes(text);
};

/**
 * Decompress gzip bytes back into UTF-8 text.
 */
export const decompressText = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => {
  const fromWorker = await runInWorker(
    { kind: 'gunzip', bytes },
    (reply) => reply.text,
  );

  if (fromWorker !== undefined) {
    return fromWorker;
  }

  return gunzipBytes(bytes);
};

/**
 * Compress text into a base64-encoded gzip string.
 *
 * This is the form stored in localStorage, which holds strings only.
 */
export const compressToBase64 = async (text: string): Promise<string> =>
  bytesToBase64(await compressText(text));

/**
 * Decompress a base64-encoded gzip string back into text.
 */
export const decompressFromBase64 = async (base64: string): Promise<string> =>
  decompressText(base64ToBytes(base64));
