import { test, expect } from '@playwright/test';

const clientId = '123-test.apps.googleusercontent.com';
const file = (id, name, extra = {}) => ({
  id, name, mimeType: 'audio/wav', size: '160044', version: '1',
  createdTime: '2026-01-01T00:00:00Z', modifiedTime: '2026-01-02T00:00:00Z',
  capabilities: { canDownload: true }, ...extra,
});
function wav() {
  const buffer = Buffer.alloc(160044);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(160000, 40);
  for (let index = 0; index < 80000; index++) buffer.writeInt16LE(Math.round(Math.sin(index * .17) * 16000), 44 + index * 2);
  return buffer;
}
async function setup(page, { expires = 3600, denied = false, deferredMedia = false } = {}) {
  const calls = [];
  let status = 200;
  let releaseMedia;
  const waitMedia = new Promise((resolve) => { releaseMedia = resolve; });
  await page.route('https://accounts.google.com/gsi/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.google={accounts:{oauth2:{
      initTokenClient(config){window.oauthConfig=config;return{requestAccessToken(options){
        window.oauthOptions=options;setTimeout(()=>config.callback(${denied ? "{error:'access_denied'}" : `{access_token:'mock-drive-access',expires_in:${expires},scope:config.scope}`}),0);
      }}},
      hasGrantedAllScopes(response,scope){return response.scope===scope},
      revoke(token,callback){window.revokedToken=token;callback({successful:true})}
    }}};`,
  }));
  await page.route('https://www.googleapis.com/drive/v3/**', async (route) => {
    const request = route.request(); const url = new URL(request.url());
    calls.push({ url: request.url(), method: request.method(), headers: request.headers() });
    if (status !== 200) { await route.fulfill({ status, json: { error: 'Mock failure' } }); return; }
    if (url.pathname.endsWith('/about')) { await route.fulfill({ json: { user: { displayName: 'Test account', emailAddress: 'test@example.invalid' } } }); return; }
    if (url.searchParams.get('alt') === 'media') {
      if (deferredMedia) await waitMedia;
      await route.fulfill({ contentType: 'audio/wav', body: wav() }); return;
    }
    if (url.pathname.endsWith('/files/root')) { await route.fulfill({ json: { id: 'root', name: 'Private sounds', mimeType: 'application/vnd.google-apps.folder' } }); return; }
    const parent = url.searchParams.get('q');
    if (parent.startsWith("'released'")) { await route.fulfill({ json: { files: [file('cloud-one', 'Cloud one.wav')] } }); return; }
    if (parent.startsWith("'wip'")) { await route.fulfill({ json: { files: [file('cloud-two', 'Cloud two.wav')] } }); return; }
    if (url.searchParams.get('pageToken')) { await route.fulfill({ json: { files: [file('locked', 'Restricted.wav', { capabilities: { canDownload: false } })] } }); return; }
    await route.fulfill({ json: { files: [
      { id: 'released', name: 'Released', mimeType: 'application/vnd.google-apps.folder' },
      { id: 'wip', name: 'Work in Progress', mimeType: 'application/vnd.google-apps.folder' },
    ], nextPageToken: 'second' } });
  });
  await page.goto('/journal.html'); await expect(page.locator('#import-audio')).toBeEnabled();
  return { calls, setStatus: (value) => { status = value; }, releaseMedia };
}
async function connect(page, count = 3) {
  await page.locator('#drive-settings').evaluate((details) => { details.open = true; });
  await page.locator('#drive-client-id').fill(clientId);
  await page.locator('#drive-folder-id').fill('https://drive.google.com/drive/folders/root');
  await page.locator('#drive-connect').click(); await expect(page.locator('#drive-connect')).toHaveText('Connect Google Drive');
  await page.locator('#drive-connect').click();
  await expect(page.locator('#drive-status')).toContainText(`${count} sounds`);
}
test('Drive is opt-in, uses only read-only OAuth and maps paginated subfolders into the online journal', async ({ page }) => {
  const { calls } = await setup(page);
  expect(calls).toHaveLength(0);
  await connect(page);
  await expect(page.locator('.sound-entry')).toHaveCount(3);
  const card = page.locator('.sound-entry').filter({ has: page.getByRole('heading', { name: 'Cloud one', exact: true }) });
  await card.scrollIntoViewIfNeeded(); await expect(card.locator('.waveform-preview')).toHaveAttribute('data-ready', 'true');
  await expect(card.locator('.section-label')).toHaveText('Released');
  await expect(card.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.oauthConfig.scope)).toBe('https://www.googleapis.com/auth/drive.readonly');
  expect(await page.evaluate(() => window.oauthConfig.include_granted_scopes)).toBe(false);
  expect(calls.every((call) => call.method === 'GET' && call.headers.authorization === 'Bearer mock-drive-access')).toBe(true);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('mock-drive-access');
  await page.getByRole('button', { name: /^Work in Progress/ }).click();
  await expect(page.locator('.sound-entry')).toHaveCount(1);
  await expect(page.locator('.sound-entry h3')).toHaveText('Cloud two');
});
test('online playlists load genuine audio, survive filtering, and disconnect clears audio without touching the local library', async ({ page }) => {
  await setup(page); await page.locator('#audio-files').setInputFiles({ name: 'Local.wav', mimeType: 'audio/wav', buffer: wav() });
  await connect(page);
  await page.getByRole('checkbox', { name: 'Select Cloud one', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select Cloud two', exact: true }).check();
  await page.locator('#play-selection').click(); await expect(page.locator('#player-queue li')).toHaveCount(2);
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => !audio.paused)).toBe(true);
  await page.locator('#player-next').click(); await expect(page.locator('#player-title')).toHaveText('Cloud two');
  await page.locator('#player-size').click(); await page.locator('#source-filter').selectOption('local');
  await expect(page.locator('.sound-entry h3')).toHaveText('Local');
  expect(await page.locator('#player-audio').getAttribute('src')).toMatch(/^blob:/);
  await page.locator('#drive-disconnect').click(); await expect(page.locator('#sound-player')).not.toBeVisible();
  expect(await page.locator('#player-audio').getAttribute('src')).toBeNull();
  expect(await page.evaluate(() => window.revokedToken)).toBe('mock-drive-access');
  await page.reload(); await expect(page.locator('.sound-entry')).toHaveCount(1);
  await expect(page.locator('.sound-entry h3')).toHaveText('Local');
  await expect(page.locator('#drive-badge')).toHaveText('DISCONNECTED');
  await expect(page.locator('#drive-client-id')).toHaveValue(clientId);
});
test('expired tokens clear cloud metadata, queued playback and source URLs', async ({ page }) => {
  await setup(page, { expires: 2 }); await connect(page);
  await page.getByRole('button', { name: 'Play Cloud one', exact: true }).click();
  await expect(page.locator('#drive-status')).toContainText('session expired', { timeout: 6000 });
  await expect(page.locator('.sound-entry')).toHaveCount(0);
  await expect(page.locator('#sound-player')).not.toBeVisible();
});
test('Drive refresh errors preserve the previous list; 401 removes authorization and restrictions prevent downloads', async ({ page }) => {
  const mock = await setup(page); await connect(page);
  const restricted = page.locator('.sound-entry').filter({ has: page.getByRole('heading', { name: 'Restricted', exact: true }) });
  await restricted.scrollIntoViewIfNeeded();
  await expect(restricted.locator('.waveform-status')).toContainText('disabled downloads');
  await expect(restricted.getByRole('button', { name: 'Download original' })).toBeDisabled();
  mock.setStatus(403); await page.locator('#drive-refresh').click();
  await expect(page.locator('#drive-status')).toContainText('denied'); await expect(page.locator('.sound-entry')).toHaveCount(3);
  mock.setStatus(401); await page.locator('#drive-refresh').click();
  await expect(page.locator('#drive-badge')).toHaveText('DISCONNECTED'); await expect(page.locator('.sound-entry')).toHaveCount(0);
});
test('disconnect during a pending media fetch cannot reopen the player or retain cloud audio', async ({ page }) => {
  const mock = await setup(page, { deferredMedia: true }); await connect(page);
  await page.getByRole('button', { name: 'Play Cloud one', exact: true }).click();
  await expect(page.locator('#player-toggle')).toHaveText('Loading…');
  await page.locator('#player-size').click(); await page.locator('#drive-disconnect').click();
  mock.releaseMedia();
  await expect(page.locator('#sound-player')).not.toBeVisible();
  await expect(page.locator('.sound-entry')).toHaveCount(0);
  expect(await page.locator('#player-audio').getAttribute('src')).toBeNull();
});
test('OAuth denial and invalid settings remain disconnected with explicit actionable messages', async ({ page }) => {
  await setup(page, { denied: true });
  await page.locator('#drive-connect').click(); await expect(page.locator('#notification')).toContainText('OAuth Client ID');
  await page.locator('#drive-client-id').fill(clientId); await page.locator('#drive-folder-id').fill("bad'folder");
  await page.locator('#drive-connect').click(); await expect(page.locator('#drive-status')).toContainText('folder');
  await page.locator('#drive-folder-id').fill('root'); await page.locator('#drive-connect').click();
  await expect(page.locator('#drive-connect')).toHaveText('Connect Google Drive');
  await page.locator('#drive-connect').click(); await expect(page.locator('#drive-status')).toContainText('not granted');
  await expect(page.locator('#drive-badge')).toHaveText('DISCONNECTED');
  await expect(page.locator('#drive-connect')).toBeEnabled();
});
test('refresh reuses unchanged audio and original downloads and backups never persist Drive entries', async ({ page }) => {
  const { calls } = await setup(page);
  await page.locator('#audio-files').setInputFiles({ name: 'Local.wav', mimeType: 'audio/wav', buffer: wav() });
  await connect(page); await page.getByRole('button', { name: 'Play Cloud one', exact: true }).click();
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => !audio.paused)).toBe(true);
  await page.locator('#player-progress').fill('3'); await page.locator('#player-size').click();
  const source = await page.locator('#player-audio').getAttribute('src');
  await page.locator('#drive-refresh').click(); await expect(page.locator('#drive-refresh')).toBeEnabled();
  expect(await page.locator('#player-audio').getAttribute('src')).toBe(source);
  expect(await page.locator('#player-audio').evaluate((audio) => audio.currentTime)).toBeGreaterThanOrEqual(3);
  const card = page.locator('.sound-entry').filter({ has: page.getByRole('heading', { name: 'Cloud one', exact: true }) });
  const downloaded = page.waitForEvent('download'); await card.getByRole('button', { name: 'Download original' }).click();
  expect((await downloaded).suggestedFilename()).toBe('Cloud one.wav');
  expect(calls.filter((call) => call.url.includes('/cloud-one?alt=media'))).toHaveLength(1);
  const backups = page.waitForEvent('download'); await page.locator('.backup').evaluate((details) => { details.open = true; });
  await page.locator('#export-backup').click();
  const { readFile } = await import('node:fs/promises');
  const backup = JSON.parse(await readFile(await (await backups).path(), 'utf8'));
  expect(backup.entries).toHaveLength(1); expect(backup.entries[0].title).toBe('Local');
  await page.locator('#drive-disconnect').click();
});
test('Drive controls and source filters fit a narrow screen without exposing connection details by default', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 }); await setup(page);
  await expect(page.locator('#drive-client-id')).not.toBeVisible();
  await connect(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.locator('#source-filter').selectOption('drive');
  await expect(page.locator('.sound-entry')).toHaveCount(3);
  await page.locator('#drive-disconnect').click();
});
test('explicit Play is prioritized over waiting waveform downloads without parallel media fetches', async ({ page }) => {
  const mock = await setup(page, { deferredMedia: true });
  await page.route('https://www.googleapis.com/drive/v3/files?**', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q');
    if (query?.startsWith("'wip'")) {
      await route.fulfill({ json: { files: [file('cloud-two', 'Cloud two.wav'), file('cloud-three', 'Cloud three.wav')] } });
    } else await route.fallback();
  });
  await connect(page, 4);
  await page.locator('#entries').scrollIntoViewIfNeeded();
  await expect.poll(() => mock.calls.filter((call) => call.url.includes('alt=media')).length).toBe(1);
  await page.getByRole('button', { name: 'Play Cloud three', exact: true }).click();
  expect(mock.calls.filter((call) => call.url.includes('alt=media'))).toHaveLength(1);
  mock.releaseMedia();
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => !audio.paused)).toBe(true);
  await expect(page.locator('#player-title')).toHaveText('Cloud three');
  const ids = mock.calls.filter((call) => call.url.includes('alt=media')).map((call) => new URL(call.url).pathname.split('/').pop());
  expect(ids.slice(0, 2)).toEqual(['cloud-one', 'cloud-three']);
});
