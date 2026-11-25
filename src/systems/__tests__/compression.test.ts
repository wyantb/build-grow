import { describe, it, expect } from 'vitest';
import {
  base64ToBytes,
  bytesToBase64,
  compressToBase64,
  compressText,
  decompressFromBase64,
  decompressText,
} from '../compression.js';
import { handleCompressionRequest } from '../compressionWorker.js';
import { gunzipBytes, gzipBytes } from '../gzip.js';

describe('base64', () => {
  it('round trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);

    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('round trips an empty array', () => {
    expect(base64ToBytes(bytesToBase64(new Uint8Array(new ArrayBuffer(0))))).toHaveLength(0);
  });

  it('handles a payload larger than one chunk', () => {
    const bytes = new Uint8Array(0x8000 * 2 + 17);

    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = i % 256;
    }

    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('gzip', () => {
  it('round trips text', async () => {
    const text = JSON.stringify({ hello: 'world', numbers: [1, 2, 3] });

    expect(await gunzipBytes(await gzipBytes(text))).toBe(text);
  });

  it('makes the text smaller', async () => {
    const text = 'a'.repeat(5000);

    expect((await gzipBytes(text)).byteLength).toBeLessThan(text.length);
  });
});

describe('the compression entry points', () => {
  it('round trips text through base64', async () => {
    const text = JSON.stringify({ hello: 'world' });

    expect(await decompressFromBase64(await compressToBase64(text))).toBe(text);
  });

  it('round trips text through the byte form', async () => {
    const text = JSON.stringify({ hello: 'world' });

    expect(await decompressText(await compressText(text))).toBe(text);
  });
});

describe('the worker message handler', () => {
  it('compresses the text it is given', async () => {
    const reply = await handleCompressionRequest({ id: 1, kind: 'gzip', text: 'hello' });

    expect(reply.id).toBe(1);
    expect(reply.ok).toBe(true);
    expect(reply.bytes).toBeDefined();
    expect(await gunzipBytes(reply.bytes!)).toBe('hello');
  });

  it('unzips the bytes it is given', async () => {
    const bytes = await gzipBytes('hello');
    const reply = await handleCompressionRequest({ id: 2, kind: 'gunzip', bytes });

    expect(reply.id).toBe(2);
    expect(reply.ok).toBe(true);
    expect(reply.text).toBe('hello');
  });

  it('reports a failure instead of throwing', async () => {
    const reply = await handleCompressionRequest({
      id: 3,
      kind: 'gunzip',
      bytes: new Uint8Array([1, 2, 3, 4]),
    });

    expect(reply.ok).toBe(false);
    expect(reply.error).toBeDefined();
  });
});
