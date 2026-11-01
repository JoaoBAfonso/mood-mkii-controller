import { test, expect } from '@playwright/test';
import { instruments } from '../instruments.js';
import { controlMessages, presetMessages } from '../midi.js';
import { mockMidi, connect, clearMessages, messages } from './helpers.js';

test.beforeEach(async ({ page }) => { await mockMidi(page); });
const open = async (page, instrument) => {
  await page.goto(`/instrument.html?instrument=${instrument.id}`);
  await connect(page);
};
test('root hub separates ten pedals and four synths and all routes send nothing on entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Escolher categoria' }).getByRole('link')).toHaveCount(2);
  await expect(page.locator('#pedal-library')).toBeHidden();
  await page.getByRole('link', { name: /Abrir pedais/ }).click();
  await expect(page.locator('.pedal-choice')).toHaveCount(10);
  await page.locator('#category-return').click();
  await page.getByRole('link', { name: /Abrir sintetizadores/ }).click();
  await expect(page.locator('.pedal-choice')).toHaveCount(4);
  for (const instrument of instruments.filter((item) => item.category === 'synths')) {
    await page.getByRole('link', { name: `Controlar ${instrument.name}`, exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-instrument', instrument.id);
    expect(await messages(page)).toEqual([]);
    await page.locator('#back-instruments').click();
    await expect(page).toHaveURL(/section=synths$/);
  }
  await page.goto('/instrument.html?instrument=unknown');
  await expect(page.locator('main')).toContainText('Instrumento desconhecido');
  expect(await messages(page)).toEqual([]);
});
for (const instrument of instruments) {
  test(`${instrument.name}: every remote parameter is reachable, exact messages and state isolation`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await open(page, instrument);
    expect(await messages(page)).toEqual([]);
    await expect(page.locator('#main-manual-link')).toHaveAttribute('href', instrument.mainManualUrl);
    await expect(page.locator('#manual-link')).toHaveAttribute('href', instrument.manualUrl);
    expect(await page.locator('#parameter-panels .control').count()).toBe(instrument.controls.length);
    const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const [index, section] of [...new Set(instrument.controls.map((control) => control.section))].entries()) {
      await page.locator(`#tab-section-${index}`).click();
      await expect(page.locator(`#panel-section-${index}`)).toBeVisible();
      const controls = instrument.controls.filter((control) => control.section === section);
      for (const kind of ['range', 'select', 'toggle', 'action']) {
        const control = controls.find((item) => item.kind === kind && !item.confirmation);
        if (!control) continue;
        const input = page.locator(`[id="${control.id}"]`);
        await clearMessages(page);
        const wasOn = kind === 'toggle' && await input.getAttribute('aria-pressed') === 'true';
        const value = kind === 'range' ? control.max : kind === 'select' ? control.choices.at(-1).value : kind === 'toggle' ? wasOn ? control.offValue ?? 0 : control.onValue ?? 127 : control.value;
        if (kind === 'range') await input.fill(String(value));
        else if (kind === 'select') await input.selectOption(String(value));
        else await input.click();
        expect(await messages(page)).toEqual([controlMessages(instrument.defaultChannel, control, value).flat()]);
        if (control.physical && ['range', 'select'].includes(kind)) await expect(page.locator(`[id="hardware-${control.id}"]`)).toHaveValue(String(value));
      }
    }
    const range = instrument.controls.find((control) => control.kind === 'range');
    if (range) {
      await page.locator('#control-search').fill(range.name);
      const input = page.locator(`[id="${range.id}"]`);
      await input.fill(String(range.min));
      await page.locator('#channel').selectOption(String(instrument.defaultChannel === 16 ? 1 : instrument.defaultChannel + 1));
      await expect(input).toHaveValue(String(range.initial));
      await page.locator('#channel').selectOption(String(instrument.defaultChannel));
      await expect(input).toHaveValue(String(range.min));
      await page.locator('#demo').check();
      await expect(input).toHaveValue(String(range.initial));
      await clearMessages(page); await input.fill(String(range.max));
      expect(await messages(page)).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
  test(`${instrument.name}: responsive design, contextual help and device-specific preset limits`, async ({ page }) => {
    await open(page, instrument);
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const physical = instrument.controls.find((control) => control.physical && control.hint);
    if (physical) {
      await page.locator(`[data-parameter="${physical.id}"].physical-control .control-help`).focus();
      await expect(page.locator('#control-tooltip')).toContainText(physical.hint);
      await page.keyboard.press('Escape');
      await expect(page.locator('#control-tooltip')).toBeHidden();
    }
    if (!instrument.presets) {
      await expect(page.locator('#preset-quick')).toBeHidden();
      await expect(page.locator('#tab-presets')).toHaveCount(0);
      return;
    }
    await page.locator('#open-presets').click();
    await expect(page.locator('#preset-slot')).toHaveAttribute('max', String(instrument.presets.count));
    await page.locator('#preset-slot').fill(String(instrument.presets.count));
    await clearMessages(page); await page.locator('#recall-preset').click();
    const expected = instrument.presetMessages ? instrument.presetMessages(instrument.defaultChannel, instrument.presets.count) : presetMessages(instrument.defaultChannel, instrument.presets.count, instrument.presets);
    expect(await messages(page)).toEqual([expected.flat()]);
    await expect(page.locator('#current-preset-name')).toHaveText(`Preset ${instrument.presets.count}`);
    await expect(page.locator('#state-note')).toBeVisible();
    if (instrument.presets.live === undefined) await expect(page.locator('#live-preset')).toHaveCount(0);
    await page.locator('#preset-slot').fill(String(instrument.presets.count + 1));
    await clearMessages(page); await page.locator('#recall-preset').click();
    expect(await messages(page)).toEqual([]);
    await expect(page.locator('#notification')).toContainText('Escolhe um slot');
  });
}
test('new keyboard notes release on original destination; failed Note Off blocks channel and preset changes', async ({ page }) => {
  const instrument = instruments.find((item) => item.notes?.enabled && item.presets);
  await open(page, instrument);
  const key = page.locator('[data-note]').first();
  const note = Number(await key.getAttribute('data-note'));
  await key.focus(); await page.keyboard.down('Enter');
  await page.evaluate(() => { window.failNoteOff = true; });
  await page.locator('#channel').selectOption('16');
  await expect(page.locator('#channel')).toHaveValue(String(instrument.defaultChannel));
  await page.locator('#preset-next').click();
  expect(await messages(page)).toEqual([[0x90 + instrument.defaultChannel - 1, note, 100]]);
  await page.evaluate(() => { window.failNoteOff = false; });
  await page.locator('#stop-notes').click();
  expect((await messages(page)).at(-1)).toEqual([0x80 + instrument.defaultChannel - 1, note, 0]);
  await page.keyboard.up('Enter');
  await page.locator('#preset-next').click();
  await expect(page.locator('#current-preset-name')).toHaveText('Preset 1');
});
test('physical knob drag sends only its parameter and numeric inputs reject non-integers', async ({ page }) => {
  const instrument = instruments.find((item) => item.controls.some((control) => control.kind === 'range' && control.physical));
  await open(page, instrument);
  const control = instrument.controls.find((item) => item.kind === 'range' && item.physical);
  const root = page.locator(`.physical-control[data-parameter="${control.id}"]`);
  await root.locator('.knob').scrollIntoViewIfNeeded();
  const box = await root.locator('.knob').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 - 20, { steps: 3 }); await page.mouse.up();
  expect((await messages(page)).length).toBeGreaterThan(0);
  await page.locator('#technical-values').check();
  await clearMessages(page);
  await root.locator('input[type=number]').fill('1.5'); await root.locator('input[type=number]').press('Tab');
  expect(await messages(page)).toEqual([]);
  await expect(page.locator('#notification')).toContainText('inteiro');
});
test('documented synth transport and pitch bend send standard messages, recentering on original channel', async ({ page }) => {
  const transport = instruments.find((instrument) => instrument.transport?.start && instrument.transport?.stop);
  if (transport) {
    await open(page, transport); await page.locator('#transport-start').click(); await page.locator('#transport-stop').click();
    expect(await messages(page)).toEqual([[250], [252]]);
  }
  const bend = instruments.find((instrument) => instrument.pitchBend);
  expect(bend).toBeTruthy();
  await open(page, bend);
  await page.locator('#pitch-bend').fill('16383');
  await page.locator('#pitch-bend').press('Tab');
  expect(await messages(page)).toEqual([[224 + bend.defaultChannel - 1, 127, 127], [224 + bend.defaultChannel - 1, 0, 64]]);
});
test('EQ2 band/channel navigation sends nothing; the shared encoder addresses the selected band', async ({ page }) => {
  const instrument = instruments.find((item) => item.id === 'source-audio-eq2');
  await open(page, instrument);
  await expect(page.locator('.eq-encoder .control:visible')).toHaveCount(1);
  await page.locator('#eq-channel').selectOption('2'); await page.locator('#eq-band').selectOption('10');
  expect(await messages(page)).toEqual([]);
  await page.locator('#hardware-cc-22').fill('36');
  expect(await messages(page)).toEqual([[176, 22, 36]]);
  const bypass = page.locator('#cc-101');
  const bypassControl = instrument.controls.find((control) => control.id === 'cc-101');
  const sections = [...new Set(instrument.controls.map((control) => control.section))];
  await page.locator(`#tab-section-${sections.indexOf(bypassControl.section)}`).click();
  if (bypassControl.kind === 'select') await bypass.selectOption('127');
  else if (bypassControl.kind === 'range') await bypass.fill('127');
  else await bypass.click();
  await page.locator('#cc-102').click();
  if (bypassControl.kind === 'toggle') await expect(bypass).toHaveAttribute('aria-pressed', 'false');
  else await expect(bypass).toHaveValue('0');
  await page.locator('#preset-next').click();
  await page.locator('#cc-102').click();
  await expect(page.locator('[data-parameter="cc-101"]').first()).toHaveClass(/stale/);
});
test('Empress save selectors are protected and confirmation retains the exact slot', async ({ page }) => {
  const instrument = instruments.find((item) => item.id === 'empress-reverb');
  await open(page, instrument);
  const control = instrument.controls.find((item) => item.confirmation && item.kind === 'select');
  expect(control).toBeTruthy();
  await page.locator('#control-search').fill(control.name);
  const value = control.choices.at(-1).value;
  await page.locator(`[id="${control.id}"]`).selectOption(String(value));
  await expect(page.locator('#confirm-dialog')).toBeVisible();
  expect(await messages(page)).toEqual([]);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await messages(page)).toEqual([]);
  await page.locator(`[id="${control.id}"]`).selectOption(String(value));
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  expect(await messages(page)).toEqual([controlMessages(instrument.defaultChannel, control, value).flat()]);
});
test('DeepMind effect algorithm changes invalidate only affected slot values, not the entire instrument', async ({ page }) => {
  const instrument = instruments.find((item) => item.id === 'deepmind-12');
  await open(page, instrument);
  const control = instrument.controls.find((item) => item.protocol === 'nrpn' && item.apply);
  expect(control).toBeTruthy();
  await page.locator('#control-search').fill(control.name);
  const input = page.locator(`[id="${control.id}"]`);
  if (control.kind === 'select') await input.selectOption(String(control.choices.at(-1).value));
  else await input.fill(String(control.max));
  const stale = await page.locator('#parameter-panels .control.stale').count();
  expect(stale).toBeGreaterThan(0);
  expect(stale).toBeLessThan(instrument.controls.length);
  await expect(page.locator('#state-note')).toBeVisible();
});
