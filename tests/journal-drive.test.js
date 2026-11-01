import test from 'node:test';
import assert from 'node:assert/strict';
import { driveFolderId, driveEntry, validateDriveSettings, createDriveClient, driveScope } from '../journal-drive.js';

const file = (extra = {}) => ({
  id: 'audio_1', name: 'Test.wav', mimeType: 'audio/wav', size: '100',
  createdTime: '2026-01-01T00:00:00Z', modifiedTime: '2026-01-02T00:00:00Z',
  version: '2', capabilities: { canDownload: true }, ...extra,
});
test('Drive settings accept only Web client IDs and safe Google folder IDs', () => {
  assert.equal(driveFolderId('https://drive.google.com/drive/u/0/folders/abc_123?usp=sharing'), 'abc_123');
  assert.equal(driveFolderId('abc-123'), 'abc-123');
  assert.deepEqual(validateDriveSettings('123.apps.googleusercontent.com', 'root'), { clientId: '123.apps.googleusercontent.com', folderId: 'root' });
  for (const value of ["root' or true", 'https://evil.test/folders/abc', 'https://drive.google.com/file/d/abc/view', 'http://drive.google.com/drive/folders/root']) {
    assert.throws(() => driveFolderId(value));
  }
  assert.throws(() => validateDriveSettings('not-a-client-secret', 'root'));
  assert.equal(driveScope, 'https://www.googleapis.com/auth/drive.readonly');
});
test('Drive audio metadata maps native journal sections without storing cloud audio', () => {
  const entry = driveEntry(file(), ['Work in Progress', 'Album']);
  assert.equal(entry.section, 'Work in Progress'); assert.equal(entry.path, 'Work in Progress / Album');
  assert.equal(entry.id, 'drive:audio_1'); assert.equal(entry.audio, undefined);
  assert.equal(driveEntry(file(), ['RELEASED']).section, 'Released');
  assert.equal(driveEntry(file(), ['Other']).section, 'Sketches');
  assert.equal(driveEntry(file({ name: 'Document.pdf', mimeType: 'application/pdf' }), []), undefined);
  assert.equal(driveEntry(file({ name: 'Fake.wav', mimeType: 'application/vnd.google-apps.shortcut' }), []), undefined);
  assert.equal(driveEntry(file({ size: '0' }), []), undefined);
  assert.throws(() => driveEntry(file({ modifiedTime: 'invalid' }), []));
  assert.throws(() => driveEntry(file({ size: '-1' }), []));
  assert.equal(driveEntry(file({ capabilities: undefined }), []).canDownload, false);
});
test('Drive traversal follows real subfolders and pages with authenticated read-only requests', async () => {
  const requests = [];
  const client = createDriveClient({
    token: () => 'mock-token', onUnauthorized: () => assert.fail('Unexpected expiry'),
    fetcher: async (address, options) => {
      const url = new URL(address); requests.push({ url, options });
      assert.equal(options.headers.Authorization, 'Bearer mock-token');
      assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
      if (url.pathname.endsWith('/files/root')) return Response.json({ id: 'root', name: 'Journal', mimeType: 'application/vnd.google-apps.folder' });
      if (url.searchParams.get('q').startsWith("'child'")) return Response.json({ files: [file()] });
      if (url.searchParams.has('pageToken')) return Response.json({ files: [file({ id: 'second' })] });
      return Response.json({ files: [{ id: 'child', name: 'Released', mimeType: 'application/vnd.google-apps.folder' }], nextPageToken: 'page2' });
    },
  });
  const result = await client.library('root');
  assert.equal(result.name, 'Journal'); assert.equal(result.entries.length, 2);
  assert.equal(result.entries.find((entry) => entry.driveId === 'audio_1').section, 'Released');
  assert.equal(requests.length, 4);
  assert(requests.every(({ options }) => !options.method || options.method === 'GET'));
});
test('Drive errors are explicit, unauthorized callbacks run, and invalid folder listings never succeed', async () => {
  for (const status of [401, 403, 404, 500]) {
    let expired = false;
    const client = createDriveClient({ token: () => 'mock', onUnauthorized: () => { expired = true; }, fetcher: async () => new Response('', { status }) });
    await assert.rejects(client.library('root'), status === 401 ? /expired/ : status === 403 ? /denied/ : status === 404 ? /unavailable/ : /500/);
    assert.equal(expired, status === 401);
  }
  const client = createDriveClient({ token: () => 'mock', onUnauthorized: () => {}, fetcher: async () => Response.json({ mimeType: 'audio/wav' }) });
  await assert.rejects(client.library('root'), /not a folder/);
});
test('Cloud download restrictions and empty responses fail without a success-shaped audio result', async () => {
  let calls = 0;
  const client = createDriveClient({ token: () => 'mock', onUnauthorized: () => {}, fetcher: async () => { calls++; return new Response(''); } });
  await assert.rejects(client.audio(driveEntry(file({ capabilities: { canDownload: false } }), [])), /disabled/);
  assert.equal(calls, 0);
  await assert.rejects(client.audio(driveEntry(file(), [])), /empty/);
});
