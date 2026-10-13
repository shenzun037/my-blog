import fs from 'node:fs';
import type { Readable } from 'node:stream';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export class UploadRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UploadRequestError';
    this.status = status;
  }
}

/** Streams a request body to disk while enforcing a byte limit and capturing only its prefix. */
export async function streamRequestToFile(
  source: Readable,
  targetPath: string,
  maxBytes: number,
  limitLabel: string,
  contentLength?: string,
): Promise<{ size: number; prefix: Buffer }> {
  if (contentLength !== undefined) {
    if (!/^\d+$/.test(contentLength)) throw new UploadRequestError('Invalid Content-Length header.', 400);
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes) {
      throw new UploadRequestError(`File must be ${limitLabel} or smaller.`, 413);
    }
    if (declaredLength === 0) throw new UploadRequestError('The uploaded file is empty.', 400);
  }

  let size = 0;
  let prefixLength = 0;
  const prefix = Buffer.alloc(12);
  const limiter = new Transform({
    transform(chunk: Buffer | Uint8Array, _encoding, callback) {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += data.length;
      if (size > maxBytes) {
        callback(new UploadRequestError(`File must be ${limitLabel} or smaller.`, 413));
        return;
      }
      const copiedLength = Math.min(prefix.length - prefixLength, data.length);
      if (copiedLength > 0) {
        data.copy(prefix, prefixLength, 0, copiedLength);
        prefixLength += copiedLength;
      }
      callback(null, data);
    },
  });

  try {
    await pipeline(source, limiter, fs.createWriteStream(targetPath, { flags: 'wx' }));
  } catch (error) {
    await fs.promises.unlink(targetPath).catch(() => undefined);
    throw error;
  }
  if (size === 0) {
    await fs.promises.unlink(targetPath).catch(() => undefined);
    throw new UploadRequestError('The uploaded file is empty.', 400);
  }
  return { size, prefix: prefix.subarray(0, prefixLength) };
}
