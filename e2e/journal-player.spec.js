import { test, expect } from '@playwright/test';

function sound(name, silent = false, duration = 3) {
  const count = 8000 * duration;
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(count * 2, 40);
  if (!silent) for (let index = 0; index < count; index++) buffer.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 220 / 8000) * (index < count / 2 ? 1500 : 7000)), 44 + index * 2);
  return { name, mimeType: 'audio/wav', buffer };
}
async function ready(page) {
  await page.goto('/journal.html');
  await expect(page.locator('#import-audio')).toBeEnabled();
}
test('decoded pre-play bars reflect audio amplitude, silence and both halves of a file', async ({ page }) => {
  await ready(page);
  await page.locator('#audio-files').setInputFiles([sound('Loud.wav'), sound('Silence.wav', true)]);
  await page.locator('.sound-entry').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.waveform-preview[data-ready=true]')).toHaveCount(2);
  expect(await page.locator('#player-audio').getAttribute('src')).toBeNull();
  const pixels = async (title, x) => page.locator('.sound-entry').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
    .locator('canvas').evaluate((canvas, fraction) => {
      const { width, height } = canvas;
      const data = canvas.getContext('2d').getImageData(Math.floor(width * fraction), 0, 1, height).data;
      let count = 0; for (let index = 3; index < data.length; index += 4) if (data[index]) count++;
      return count;
    }, x);
  expect(await pixels('Loud', .753)).toBeGreaterThan(await pixels('Loud', .253));
  expect(await pixels('Loud', .753)).toBeGreaterThan(await pixels('Silence', .753));
});
test('dedicated player minimizes, keeps playing through filters, resumes and seeks without a restart', async ({ page }) => {
  await ready(page); await page.locator('#audio-files').setInputFiles(sound('Long track.wav', false, 20));
  await page.getByRole('button', { name: 'Play Long track', exact: true }).click();
  await expect(page.locator('#sound-player')).toBeVisible();
  await expect(page.locator('#player-title')).toHaveText('Long track');
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => !audio.paused)).toBe(true);
  await page.locator('#player-progress').fill('5');
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => audio.currentTime)).toBeGreaterThanOrEqual(5);
  await page.locator('#player-size').click();
  await expect(page.locator('#sound-player')).toHaveClass(/minimized/);
  const src = await page.locator('#player-audio').getAttribute('src');
  await page.locator('#search').fill('no match');
  expect(await page.locator('#player-audio').getAttribute('src')).toBe(src);
  expect(await page.locator('#player-audio').evaluate((audio) => audio.currentTime)).toBeGreaterThanOrEqual(5);
  await page.locator('#player-size').click();
  await expect(page.locator('#sound-player')).not.toHaveClass(/minimized/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#sound-player')).toHaveClass(/minimized/);
  await page.locator('#player-toggle').click();
  expect(await page.locator('#player-audio').evaluate((audio) => audio.paused)).toBe(true);
  await page.locator('#player-close').click();
  await expect(page.locator('#sound-player')).not.toBeVisible();
  expect(await page.locator('#player-audio').getAttribute('src')).toBeNull();
});
test('six audio-reactive profiles draw non-empty canvases, including projected 3D', async ({ page }) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await ready(page); await page.locator('#audio-files').setInputFiles(sound('Visual track.wav', false, 30));
  await page.getByRole('button', { name: 'Play Visual track', exact: true }).click();
  for (const profile of ['spectrum', 'scope', 'terrain', 'orbit', 'ribbons', 'prism']) {
    await page.locator('#visual-profile').selectOption(profile);
    await expect(page.locator('#player-visualizer')).toHaveAttribute('data-profile', profile);
    await expect.poll(() => page.locator('#player-visualizer').evaluate((canvas) => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 0; index < data.length; index += 4) if (data[index] > 80 && data[index + 1] > 40) return true;
      return false;
    })).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('multi-file playlist supports next, previous, automatic advance, repeat, selection and queue additions', async ({ page }) => {
  await ready(page);
  await page.locator('#player-files').setInputFiles([sound('First.wav'), sound('Second.wav'), sound('Third.wav')]);
  await expect(page.locator('#player-title')).toHaveText('First');
  await expect(page.locator('#player-queue li')).toHaveCount(3);
  await page.locator('#player-next').click(); await expect(page.locator('#player-title')).toHaveText('Second');
  await page.locator('#player-previous').click(); await expect(page.locator('#player-title')).toHaveText('First');
  await page.locator('#player-progress').fill('2.8');
  await expect(page.locator('#player-title')).toHaveText('Second');
  await page.locator('#player-repeat').selectOption('one');
  await page.locator('#player-progress').fill('2.8');
  await expect.poll(() => page.locator('#player-audio').evaluate((audio) => audio.currentTime < 1)).toBe(true);
  await expect(page.locator('#player-title')).toHaveText('Second');
  await page.locator('#player-repeat').selectOption('off');
  await page.locator('#player-size').click();
  await page.getByRole('button', { name: 'Add First to queue', exact: true }).click();
  await expect(page.locator('#player-queue li')).toHaveCount(4);
  await page.getByRole('checkbox', { name: 'Select Third', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select Second', exact: true }).check();
  await page.locator('#play-selection').click();
  await expect(page.locator('#player-queue li')).toHaveCount(2);
  await page.locator('#player-queue li').last().getByRole('button', { name: /Move .* up/ }).click();
  await expect(page.locator('#player-track-position')).toHaveText('Track 2 of 2');
});
test('metadata edits preserve active playback; deleting active audio closes the player and frees its source', async ({ page }) => {
  await ready(page); await page.locator('#audio-files').setInputFiles(sound('Original.wav', false, 20));
  await page.getByRole('button', { name: 'Play Original', exact: true }).click();
  await page.locator('#player-progress').fill('5'); await page.locator('#player-size').click();
  const src = await page.locator('#player-audio').getAttribute('src');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.locator('#edit-title').fill('Renamed'); await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('#player-title')).toHaveText('Renamed');
  expect(await page.locator('#player-audio').getAttribute('src')).toBe(src);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('#sound-player')).not.toBeVisible();
  expect(await page.locator('#player-audio').getAttribute('src')).toBeNull();
});
test('queue additions do not autoplay; repeated tracks keep their position through filtering and reordering', async ({ page }) => {
  await ready(page); await page.locator('#audio-files').setInputFiles([sound('One.wav', false, 20), sound('Two.wav', false, 20)]);
  await page.getByRole('button', { name: 'Add One to queue', exact: true }).click();
  await expect(page.locator('#sound-player')).toHaveClass(/minimized/);
  expect(await page.locator('#player-audio').evaluate((audio) => audio.paused)).toBe(true);
  await page.getByRole('button', { name: 'Add Two to queue', exact: true }).click();
  await page.getByRole('button', { name: 'Add One to queue', exact: true }).click();
  await page.locator('#player-size').click();
  await page.getByRole('button', { name: 'Play queued track 3: One', exact: true }).click();
  await expect(page.locator('#player-track-position')).toHaveText('Track 3 of 3');
  await page.locator('#player-size').click(); await page.locator('#search').fill('Two');
  await expect(page.locator('#player-track-position')).toHaveText('Track 3 of 3');
  await page.locator('#player-size').click();
  await page.locator('#player-queue li').last().getByRole('button', { name: 'Move One up', exact: true }).click();
  await expect(page.locator('#player-track-position')).toHaveText('Track 2 of 3');
  await page.locator('#player-queue li').first().getByRole('button', { name: 'Remove One from queue', exact: true }).click();
  await expect(page.locator('#player-track-position')).toHaveText('Track 1 of 2');
});
test('expanded playlist adds imported files without restarting the active track and can browse the journal', async ({ page }) => {
  await ready(page); await page.locator('#player-files').setInputFiles(sound('Active.wav', false, 20));
  await page.locator('#player-progress').fill('5');
  const src = await page.locator('#player-audio').getAttribute('src');
  const chooser = page.waitForEvent('filechooser'); await page.locator('#player-add-files').click();
  await (await chooser).setFiles([sound('Added.wav'), sound('Another.wav')]);
  await expect(page.locator('#player-queue li')).toHaveCount(3);
  expect(await page.locator('#player-audio').getAttribute('src')).toBe(src);
  expect(await page.locator('#player-audio').evaluate((audio) => audio.currentTime)).toBeGreaterThanOrEqual(5);
  await page.locator('#player-browse').click();
  await expect(page.locator('#sound-player')).toHaveClass(/minimized/);
  await expect(page.locator('.sound-entry')).toHaveCount(3);
});
test('waveform decode failures are explicit; expanded and minimized controls fit small screens', async ({ page }) => {
  await ready(page); await page.locator('#audio-files').setInputFiles({ name: 'Broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('not wav') });
  await page.locator('.sound-entry').scrollIntoViewIfNeeded();
  await expect(page.locator('.waveform-status')).toContainText('Waveform unavailable');
  await page.getByRole('button', { name: 'Play Broken', exact: true }).click();
  await expect(page.locator('#player-error')).toBeVisible();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await page.locator('#sound-player').evaluate((root) => root.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#player-size').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#player-size').click();
  }
});
