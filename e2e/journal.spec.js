import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
function wav() {
  const sampleCount = 8000;
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(sampleCount * 2, 40);
  for (let index = 0; index < sampleCount; index++) buffer.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 220 / 8000) * 1000), 44 + index * 2);
  return buffer;
}
const audioFile = (name) => ({ name, mimeType: 'audio/wav', buffer: wav() });
const ready = async (page) => {
  await page.goto('/journal.html');
  await expect(page.locator('#import-audio')).toBeEnabled();
};

test('hub opens an empty private-on-device journal, responsive dark UI and no audio uploads', async ({ page }) => {
  const uploads = [];
  page.on('request', (request) => { if (request.method() !== 'GET') uploads.push(request.url()); });
  await page.goto('/');
  await page.getByRole('link', { name: /Open sound journal/ }).click();
  await expect(page).toHaveURL(/journal.html$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#section-filters button')).toHaveCount(5);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  expect(uploads).toEqual([]);
});

test('imports play locally, persist across reloads, edit and combine section/search/tag filters', async ({ page }) => {
  await ready(page);
  await page.locator('#audio-files').setInputFiles([audioFile('Tape sketch.wav'), audioFile('Finished.wav')]);
  await expect(page.locator('.sound-entry')).toHaveCount(2);
  const card = page.locator('.sound-entry').filter({ has: page.getByRole('heading', { name: 'Tape sketch', exact: true }) });
  await card.getByRole('button', { name: 'Play Tape sketch', exact: true }).click();
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => audio.duration)).toBe(1);
  await page.locator('#player-size').click();
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#edit-title').fill('Orange horizon');
  await page.locator('#edit-section').selectOption('Work in Progress');
  await page.locator('#edit-tags').fill('guitar, ambient, guitar');
  await page.locator('#edit-notes').fill('Try the slower tape layer.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#edit-dialog')).not.toBeVisible();
  await page.reload(); await expect(page.locator('.sound-entry')).toHaveCount(2);
  await page.getByRole('button', { name: /^Work in Progress/ }).click();
  await page.locator('#tag-filter').selectOption('ambient'); await page.locator('#search').fill('slower');
  await expect(page.locator('.sound-entry')).toHaveCount(1);
  await expect(page.locator('.sound-entry')).toContainText('Orange horizon');
  await page.locator('#search').fill('missing');
  await expect(page.locator('#empty')).toContainText('No sounds match');
  await page.locator('#search').fill(''); await page.locator('#tag-filter').selectOption('');
  await page.getByRole('button', { name: /^Released/ }).click();
  await page.locator('#audio-files').setInputFiles(audioFile('Release.wav'));
  await expect(page.locator('.sound-entry')).toContainText('Release');
  await expect(page.locator('.section-label')).toHaveText('Released');
});

test('full backup restores exact audio, malformed backups preserve library and deletion is confirmed', async ({ page }) => {
  await ready(page); await page.locator('#audio-files').setInputFiles(audioFile('Keep me.wav'));
  await page.locator('.backup').evaluate((details) => { details.open = true; });
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-backup').click();
  const download = await downloadPromise;
  const backup = await fs.readFile(await download.path());
  const data = JSON.parse(backup.toString());
  expect(data.entries[0].audio).toBe(`data:audio/wav;base64,${wav().toString('base64')}`);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.sound-entry')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.sound-entry')).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#backup-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
  await expect(page.locator('.sound-entry')).toHaveCount(1);
  await page.locator('#backup-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.locator('#notification')).toContainText('Choose a Sound Journal backup');
  await expect(page.locator('.sound-entry')).toHaveCount(1);
});

test('storage initialization failures are explicit without false success', async ({ page }) => {
  await page.addInitScript(() => { indexedDB.open = () => { throw new Error('Storage denied'); }; });
  await page.goto('/journal.html');
  await expect(page.locator('#notification')).toContainText('Storage denied');
  await expect(page.locator('#import-audio')).toBeDisabled();
});

test('invalid imports are atomic and failed edits retain the original entry', async ({ page }) => {
  await ready(page);
  await page.locator('#audio-files').setInputFiles([audioFile('Valid.wav'), { name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not audio') }]);
  await expect(page.locator('#notification')).toContainText('not a supported audio file');
  await expect(page.locator('.sound-entry')).toHaveCount(0);
  await page.locator('#audio-files').setInputFiles(audioFile('Original.wav'));
  await expect(page.locator('.sound-entry')).toHaveCount(1);
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new Error('Write denied'); }; });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#edit-title').fill('Changed');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#notification')).toContainText('Write denied');
  await expect(page.locator('#edit-error')).toBeVisible();
  await expect(page.locator('#edit-dialog')).toBeVisible();
  await page.locator('#cancel-edit').click();
  await expect(page.locator('.sound-entry h3')).toHaveText('Original');
  await page.reload(); await expect(page.locator('.sound-entry h3')).toHaveText('Original');
});

test('library pagination retains all imported sounds and separate browser profiles see no entries', async ({ page, browser }) => {
  await ready(page);
  await page.locator('#audio-files').setInputFiles(Array.from({ length: 21 }, (_, index) => audioFile(`Sound ${index}.wav`)));
  await expect(page.locator('#entry-count')).toHaveText('21');
  await expect(page.locator('.sound-entry')).toHaveCount(20);
  await page.locator('#show-more').click(); await expect(page.locator('.sound-entry')).toHaveCount(21);
  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage(); await ready(otherPage);
    await expect(otherPage.locator('#entry-count')).toHaveText('0');
  } finally { await other.close(); }
});

test.describe('recorder', () => {
  test('recording pauses the dedicated dock and blocks transport, including a pending Play request', async ({ page }) => {
    await ready(page); await page.locator('#audio-files').setInputFiles(audioFile('Monitor.wav'));
    await page.getByRole('button', { name: 'Play Monitor', exact: true }).click();
    await expect.poll(() => page.locator('#player-audio').evaluate((audio) => !audio.paused)).toBe(true);
    await page.locator('#player-size').click(); await page.locator('#player-toggle').click();
    await page.evaluate(() => {
      const resume = AudioContext.prototype.resume;
      AudioContext.prototype.resume = async function () { await new Promise((resolve) => { window.resumePlayer = resolve; }); return resume.call(this); };
    });
    await page.locator('#player-toggle').click();
    await page.locator('#record').click(); await expect(page.locator('#stop-recording')).toBeVisible();
    await page.evaluate(() => window.resumePlayer());
    await expect(page.locator('#player-error')).toContainText('Stop the recording');
    expect(await page.locator('#player-audio').evaluate((audio) => audio.paused)).toBe(true);
    await page.locator('#player-toggle').click();
    expect(await page.locator('#player-audio').evaluate((audio) => audio.paused)).toBe(true);
    await expect.poll(() => page.locator('#recording-time').textContent()).not.toBe('00:00');
    await page.locator('#stop-recording').click(); await expect(page.locator('#notification')).toHaveText('Recording saved locally.');
    await page.getByRole('button', { name: /^All sounds/ }).click();
    await expect(page.locator('.sound-entry')).toHaveCount(2);
    await page.locator('#player-close').click();
  });
  test('records a playable take to Recordings and releases the microphone', async ({ page }) => {
    await ready(page);
    await page.addInitScript(() => {
      const get = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await get(constraints); window.recordingTracks = stream.getTracks(); return stream;
      };
    });
    await page.reload(); await expect(page.locator('#record')).toBeEnabled();
    await page.locator('#recording-title').fill('First take'); await page.locator('#record').click();
    await expect(page.locator('#stop-recording')).toBeVisible();
    await expect.poll(() => page.locator('#recording-time').textContent()).not.toBe('00:00');
    await page.locator('#stop-recording').click();
    await expect(page.locator('.sound-entry')).toContainText('First take');
    await expect(page.locator('.section-label')).toHaveText('Recordings');
    await expect.poll(() => page.evaluate(() => window.recordingTracks.every((track) => track.readyState === 'ended'))).toBe(true);
    await page.getByRole('button', { name: 'Play First take', exact: true }).click();
    await expect.poll(() => page.locator('#player-audio').evaluate((audio) => !audio.paused)).toBe(true);
    await page.locator('#player-size').click();
    await expect(page.locator('#recovery')).toBeHidden();
    await page.reload(); await expect(page.locator('.sound-entry')).toContainText('First take');
  });
  test('failed recording save retains a downloadable take and supports retry', async ({ page }) => {
    await ready(page);
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      window.failJournalSave = true;
      IDBObjectStore.prototype.put = function (...args) {
        if (window.failJournalSave) throw new Error('Test quota exceeded');
        return put.apply(this, args);
      };
    });
    await page.locator('#record').click(); await expect(page.locator('#stop-recording')).toBeVisible();
    await expect.poll(() => page.locator('#recording-time').textContent()).not.toBe('00:00');
    await page.locator('#stop-recording').click();
    await expect(page.locator('#notification')).toContainText('Test quota exceeded');
    await expect(page.locator('#recovery')).toBeVisible();
    await expect(page.locator('#record')).toBeDisabled();
    await expect(page.locator('.sound-entry')).toHaveCount(0);
    const downloaded = page.waitForEvent('download'); await page.locator('#recovery-download').click();
    expect((await fs.stat(await (await downloaded).path())).size).toBeGreaterThan(0);
    await page.evaluate(() => { window.failJournalSave = false; });
    await page.locator('#retry-recording').click();
    await expect(page.locator('.sound-entry')).toHaveCount(1);
    await expect(page.locator('#recovery')).toBeHidden();
    await expect(page.locator('#record')).toBeEnabled();
  });
  test('denied microphone permission does not create an entry or leave capture pending', async ({ page }) => {
    await ready(page);
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new Error('Permission denied'); }; });
    await page.locator('#record').click();
    await expect(page.locator('#notification')).toContainText('Permission denied');
    await expect(page.locator('#record')).toBeEnabled();
    await expect(page.locator('.sound-entry')).toHaveCount(0);
  });
});
