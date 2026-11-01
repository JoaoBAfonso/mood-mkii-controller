import { test, expect } from '@playwright/test';
import { pedals } from '../pedals.js';
import { libraryKey } from '../presets.js';
import { mockMidi, connect, messages, clearMessages } from './helpers.js';

test.beforeEach(async ({ page }) => { await mockMidi(page); });
async function open(page, id = 'mood-mkii') {
  await page.goto(`/controller.html?pedal=${id}`); await connect(page);
}
async function editor(page, slot, name = '', notes = '', favorite = false) {
  await page.locator('#preset-slot').fill(String(slot));
  await page.locator('#preset-name').fill(name);
  await page.locator('#preset-notes').fill(notes);
  await page.locator('#preset-favorite').setChecked(favorite);
  await page.locator('#preset-organize').click();
}
async function add(page, slot) {
  await page.locator('#preset-slot').fill(String(slot));
  await page.locator('#preset-add-setlist').click();
}
test('hub is neutral, technical clutter is optional and both manuals are in each header', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(32, 40, 42)');
  await expect(page.locator('.brand-icon')).toHaveText('≋');
  expect(await page.locator('main').innerText()).not.toMatch(/\d+ CC|Presets · Synth/);
  for (const pedal of pedals) {
    await open(page, pedal.id);
    await expect(page.locator('header #main-manual-link')).toHaveAttribute('href', pedal.mainManualUrl);
    await expect(page.locator('header #manual-link')).toHaveAttribute('href', pedal.manualUrl);
    await expect(page.locator('.cc-badge,.model-note')).toHaveCount(0);
    await expect(page.locator('.state-note')).toBeHidden();
    await expect(page.locator('[data-position="14"] input[type=number]')).toBeHidden();
    expect(await messages(page)).toEqual([]);
    await page.locator('#technical-values').check();
    await expect(page.locator('[data-position="14"] input[type=number]')).toBeVisible();
    await page.locator('#technical-values').uncheck();
    expect(await messages(page)).toEqual([]);
  }
});
for (const pedal of pedals) {
  test(`${pedal.name}: metadata persists locally and PC/save use the selected hardware slot`, async ({ page }) => {
    await open(page, pedal.id);
    await page.locator('#open-presets').click();
    await editor(page, 122, 'Final do concerto', 'Aumentar mix no refrão', true);
    expect(await messages(page)).toEqual([]);
    await page.locator('#preset-search').fill('refrão');
    await expect(page.locator('#preset-grid .preset-tile')).toHaveCount(1);
    await expect(page.locator('#preset-grid .preset-tile')).toContainText('Final do concerto');
    await page.locator('#preset-only-favorites').check();
    await expect(page.locator('#preset-grid .preset-tile')).toHaveCount(1);
    await page.locator('#recall-preset').click();
    expect(await messages(page)).toEqual([[193, 122]]);
    await expect(page.locator('#current-preset-name')).toHaveText('Final do concerto');
    await expect(page.locator('#physical-preset option:checked')).toHaveText('Final do concerto');
    await clearMessages(page);
    await page.locator('#cc-111').click();
    await expect(page.locator('#confirm-text')).toContainText('Slot 122');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(await messages(page)).toEqual([]);
    await page.locator('#cc-111').click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    expect(await messages(page)).toEqual([[177, 111, 122]]);
    await page.reload(); await page.locator('#open-presets').click();
    await page.locator('#preset-slot').fill('122'); await page.locator('#preset-slot').press('Tab');
    await expect(page.locator('#preset-name')).toHaveValue('Final do concerto');
    await expect(page.locator('#preset-notes')).toHaveValue('Aumentar mix no refrão');
    await expect(page.locator('#preset-favorite')).toBeChecked();
    await open(page, pedals.find((item) => item.id !== pedal.id).id);
    await page.locator('#open-presets').click();
    await page.locator('#preset-slot').fill('122'); await page.locator('#preset-slot').press('Tab');
    await expect(page.locator('#preset-name')).toHaveValue('');
  });
}
test('setlist supports repeated slots, reordering, direct play and failure-safe next/previous', async ({ page }) => {
  await open(page);
  await page.locator('#open-presets').click();
  for (const slot of [4, 122, 4]) await add(page, slot);
  expect(await messages(page)).toEqual([]);
  await page.locator('#preset-next').click();
  await expect(page.locator('#current-preset-position')).toHaveText('Atuação · 1 / 3');
  await page.evaluate(() => { window.failAll = true; });
  await page.locator('#preset-next').click();
  await expect(page.locator('#current-preset-position')).toHaveText('Atuação · 1 / 3');
  expect(await messages(page)).toEqual([[193, 4]]);
  await page.evaluate(() => { window.failAll = false; });
  await page.locator('#preset-next').click(); await page.locator('#preset-next').click();
  await expect(page.locator('#current-preset-position')).toHaveText('Atuação · 3 / 3');
  await expect(page.locator('#preset-next')).toBeDisabled();
  await page.locator('#preset-previous').click();
  expect(await messages(page)).toEqual([[193, 4], [193, 122], [193, 4], [193, 122]]);
  await page.getByRole('button', { name: 'Subir entrada 2', exact: true }).click();
  await expect(page.locator('#preset-setlist li').first()).toContainText('Preset 122');
  await page.getByRole('button', { name: 'Remover entrada 3', exact: true }).click();
  await expect(page.locator('#preset-setlist li')).toHaveCount(2);
  await clearMessages(page);
  await page.getByRole('button', { name: 'Carregar entrada 2: Preset 4', exact: true }).click();
  expect(await messages(page)).toEqual([[193, 4]]);
  await page.locator('#channel').selectOption('3');
  await expect(page.locator('#current-preset-name')).toHaveText('Live');
  await page.locator('#preset-next').click();
  expect(await messages(page)).toEqual([[193, 4], [194, 122]]);
  await page.locator('#channel').selectOption('2');
  await expect(page.locator('#current-preset-name')).toHaveText('Preset 4');
  await expect(page.locator('#current-preset-position')).toHaveText('Atuação · 2 / 2');
});
test('import/export validates model, preserves library on errors and never sends MIDI', async ({ page }) => {
  await open(page, 'lost-found'); await page.locator('#open-presets').click();
  await editor(page, 1, 'Eco', 'Solo', true); await add(page, 1);
  const downloaded = page.waitForEvent('download');
  await page.locator('#preset-export').click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('lost-found-presets.json');
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.presets['1'].name).toBe('Eco'); expect(exported.setlist).toEqual([1]);
  async function upload(value) {
    await page.locator('#preset-file').setInputFiles({ name: 'presets.json', mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
  }
  await upload({ ...exported, pedalId: 'bad-mood' });
  await expect(page.locator('#notification')).toContainText('Não foi possível importar');
  await upload('{wrong');
  await expect(page.locator('#notification')).toContainText('Não foi possível importar');
  const next = { ...exported, presets: { 2: { name: '<img src=x onerror=alert(1)>', notes: '', favorite: false } }, setlist: [2, 2] };
  await upload(next);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('#preset-name')).toHaveValue('Eco');
  await upload(next);
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('#preset-grid')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#preset-grid img')).toHaveCount(0);
  await expect(page.locator('#preset-setlist li')).toHaveCount(2);
  expect(await messages(page)).toEqual([]);
});
test('storage errors are explicit and never masquerade as saved metadata', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage quota test'); };
  });
  await open(page); await page.locator('#open-presets').click();
  await editor(page, 1, 'Não guardado');
  await expect(page.locator('#notification')).toContainText('Storage quota test');
  await expect(page.locator('#preset-local-status')).toBeEmpty();
  await expect(page.locator('#preset-grid [data-slot="1"]')).not.toContainText('Não guardado');
  expect(await page.evaluate((key) => localStorage.getItem(key), libraryKey('mood-mkii'))).toBeNull();
});
test('help works on hover, keyboard and touch; mode and Classic changes refresh descriptions', async ({ page }) => {
  await open(page, 'bad-mood');
  await page.locator('[data-position="16"]').hover();
  await expect(page.locator('#control-tooltip')).toBeVisible();
  await expect(page.locator('#control-tooltip')).toContainText('oito passos');
  await page.keyboard.press('Escape');
  await expect(page.locator('#control-tooltip')).toBeHidden();
  await page.getByRole('button', { name: 'Selecionar RADIO', exact: true }).click();
  await page.locator('#station-select').selectOption('97');
  await page.locator('[data-position="16"] .control-help').focus();
  await expect(page.locator('#control-tooltip')).toContainText('Shoegaze');
  expect(await messages(page)).toEqual([[177, 23, 2], [177, 19, 97]]);
  await clearMessages(page);
  await page.locator('[data-position="16"] .control-help').click();
  await expect(page.locator('#control-tooltip')).toBeVisible();
  expect(await messages(page)).toEqual([]);
  await open(page, 'generation-loss-mkii');
  await page.locator('#classic-shortcut').click();
  await page.locator('[data-position="18"] .control-help').focus();
  await expect(page.locator('#control-tooltip')).toContainText('amostragem');
});
test('touch help opens and closes without sending a control command', async ({ browser }) => {
  const page = await browser.newPage({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  await mockMidi(page); await open(page, 'bad-mood');
  await page.locator('[data-position="14"] .control-help').tap();
  await expect(page.locator('#control-tooltip')).toBeVisible();
  await page.locator('[data-position="14"] .control-help').tap();
  await expect(page.locator('#control-tooltip')).toBeHidden();
  expect(await messages(page)).toEqual([]);
  await page.close();
});
test('Lost swap labels and Generation Classic Freeze reflect the effective sound', async ({ page }) => {
  await open(page, 'lost-found');
  await page.locator('#tab-dips').click(); await page.locator('#cc-74').click();
  await page.locator('#tab-performance').click();
  await expect(page.locator('#pedal-cc-21 option:checked')).toHaveText('DELAY');
  await open(page, 'generation-loss-mkii');
  await page.locator('#tab-dips').click();
  for (const cc of [72, 76, 77]) await page.locator(`#cc-${cc}`).click();
  await page.locator('#tab-performance').click();
  await page.getByRole('button', { name: 'Selecionar FREEZE', exact: true }).click();
  await expect(page.locator('#pedal-cc-21 option:checked')).toHaveText('FREEZE');
  await expect(page.locator('#mode-description-21')).toContainText('FREEZE captura');
});
test('library pagination reaches slot 122 and the manager fits mobile through desktop', async ({ page }) => {
  await open(page); await page.locator('#open-presets').click();
  for (let index = 0; index < 10; index++) await page.locator('#preset-page-next').click();
  await expect(page.locator('#preset-grid [data-slot="122"]')).toBeVisible();
  await page.locator('#preset-grid [data-slot="122"]').click();
  await expect(page.locator('#preset-slot')).toHaveValue('122');
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
