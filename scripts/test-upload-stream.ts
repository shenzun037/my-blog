import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import { streamRequestToFile, UploadRequestError } from '../server/uploadStream.ts';

test('streams request chunks to disk and reports the real byte count', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shenzun-upload-test-'));
  const target = path.join(directory, 'upload.bin');
  const expected = Buffer.concat([Buffer.from('first'), Buffer.from(' second')]);
  try {
    const result = await streamRequestToFile(Readable.from([Buffer.from('first'), Buffer.from(' second')]), target, 64, '64 bytes', String(expected.length));
    assert.equal(result.size, expected.length);
    assert.equal(result.prefix.toString(), expected.toString());
    assert.deepEqual(await readFile(target), expected);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects a declared oversize upload before writing it', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shenzun-upload-test-'));
  const target = path.join(directory, 'upload.bin');
  try {
    await assert.rejects(
      streamRequestToFile(Readable.from([Buffer.from('too large')]), target, 4, '4 bytes', '9'),
      (error: unknown) => error instanceof UploadRequestError && error.status === 413,
    );
    await assert.rejects(stat(target));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('stops and removes a chunked upload that crosses its byte limit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'shenzun-upload-test-'));
  const target = path.join(directory, 'upload.bin');
  try {
    await assert.rejects(
      streamRequestToFile(Readable.from([Buffer.from('1234'), Buffer.from('5678')]), target, 6, '6 bytes'),
      (error: unknown) => error instanceof UploadRequestError && error.status === 413,
    );
    await assert.rejects(stat(target));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
