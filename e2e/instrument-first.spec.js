import { test, expect } from '@playwright/test';
import { instruments } from '../instruments.js';
import { pedals } from '../pedals.js';
import { controlMessages } from '../midi.js';
import { instrumentPanels } from '../instrument-panels.js';
import { mockMidi, connect, messages, clearMessages } from './helpers.js';

for (const instrument of instruments) {
  test(`${instrument.name}: compact physical panel and secondary edits mirror the optional browser`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mockMidi(page);
    await page.goto(`/instrument.html?instrument=${instrument.id}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.locator('body').textContent()).not.toMatch(/Não ligado|Escolhe|Selecionar|Guardar|Configurações|Controlos|Ligação|Velocidade/);
    await expect(page.locator('#parameter-inspector')).not.toHaveAttribute('open', '');
    await expect(page.locator('#onboard-section, #onboard-parameter')).toHaveCount(0);
    const panel = instrumentPanels[instrument.id];
    await expect(page.locator('.actuator')).toHaveCount(panel.slots.filter((slot) => !slot.reference).length);
    await expect(page.locator('.hardware-reference input, .hardware-reference select, .hardware-reference button')).toHaveCount(0);
    const maxHeights = { 'boss-sl-2': 600, 'strymon-deco-v2': 540, 'strymon-mobius': 550, 'source-audio-eq2': 600,
      'source-audio-nemesis-adt': 550, 'empress-reverb': 460, 'deepmind-12': 420, microfreak: 520, 'tr-8s': 650, 'pro-vs-mini': 470 };
    await page.setViewportSize({ width: 1280, height: 900 });
    expect((await page.locator('#hardware').boundingBox()).height).toBeLessThanOrEqual(maxHeights[instrument.id]);
    expect(await messages(page)).toEqual([]);
    await connect(page);
    await page.locator('#parameter-inspector').evaluate((details) => { details.open = false; });
    let input;
    for (const entry of panel.menus) {
      await page.locator(`[data-menu="${entry.id}"]`).click();
      input = page.locator('#hardware-menu-body .control:visible input[type=range]').first();
      if (await input.count()) break;
      await page.locator('#hardware-menu-close').click();
    }
    const id = await input.evaluate((element) => element.closest('[data-parameter]').dataset.parameter);
    input = page.locator(`[id="${await input.getAttribute('id')}"]`);
    const control = instrument.controls.find((item) => item.id === id);
    await input.fill(String(control.max));
    expect(await messages(page)).toEqual([controlMessages(instrument.defaultChannel, control, control.max).flat()]);
    await expect(page.locator(`[id="${control.id}"]`)).toHaveValue(String(control.max));
    await page.evaluate(() => { window.failAll = true; });
    await input.fill(String(control.min));
    await expect(input).toHaveValue(String(control.max));
    await expect(page.locator('#notification')).toContainText('Test send failure');
    await page.locator('#hardware-menu-close').click();
    await page.locator('#channel').selectOption(String(instrument.defaultChannel === 1 ? 2 : 1));
    await expect(input).toHaveValue(String(control.initial));
    expect(errors).toEqual([]);
  });
}

for (const [id, bank, choices, parameters] of [
  ['deepmind-12', 'envelope', ['VCA', 'VCF'], ['nrpn-53', 'nrpn-62']],
  ['pro-vs-mini', 'envelope', ['FIL', 'AMP'], ['cc-85', 'cc-81']],
  ['pro-vs-mini', 'oscillator', ['A', 'D'], ['cc-24', 'cc-27']],
  ['microfreak', 'lfo-rate', ['Free', 'Sync'], ['cc-93', 'cc-94']],
]) {
  test(`${id}: shared ${bank} actuator retains separate values without replaying MIDI`, async ({ page }) => {
    await mockMidi(page); await page.goto(`/instrument.html?instrument=${id}`); await connect(page);
    const first = page.locator(`[id="hardware-${parameters[0]}"]`);
    const second = page.locator(`[id="hardware-${parameters[1]}"]`);
    const instrument = instruments.find((instrument) => instrument.id === id);
    const firstControl = instrument.controls.find((control) => control.id === parameters[0]);
    const secondControl = instrument.controls.find((control) => control.id === parameters[1]);
    const firstValue = String(firstControl.choices?.[1].value ?? 30);
    const secondValue = String(secondControl.choices?.at(-1).value ?? 70);
    if (firstControl.kind === 'select') await first.selectOption(firstValue); else await first.fill(firstValue);
    await clearMessages(page);
    await page.getByRole('group', { name: `${bank} view`, exact: true }).getByRole('button', { name: choices[1], exact: true }).click();
    await expect(second).toBeVisible(); expect(await messages(page)).toEqual([]);
    if (secondControl.kind === 'select') await second.selectOption(secondValue); else await second.fill(secondValue);
    await clearMessages(page);
    await page.getByRole('group', { name: `${bank} view`, exact: true }).getByRole('button', { name: choices[0], exact: true }).click();
    await expect(first).toHaveValue(firstValue); expect(await messages(page)).toEqual([]);
  });
}

test('EQ2 band menu addresses only the selected band and channel', async ({ page }) => {
  await mockMidi(page); await page.goto('/instrument.html?instrument=source-audio-eq2'); await connect(page);
  await page.locator('#eq-channel').selectOption('2'); await page.locator('#eq-band').selectOption('7');
  await page.locator('[data-menu=eq-band]').click();
  const controls = page.locator('#hardware-menu-body .control:visible');
  expect(await controls.evaluateAll((elements) => elements.map((element) => element.dataset.parameter))).toEqual(['cc-39', 'cc-59']);
  expect(await messages(page)).toEqual([]);
  await controls.first().locator('input[type=range]').fill('100');
  await expect(page.locator('[id="cc-39"]')).toHaveValue('100');
});

test('secondary-menu help stays above the modal and note velocity remains editable', async ({ page }) => {
  await mockMidi(page); await page.goto('/instrument.html?instrument=microfreak'); await connect(page);
  await page.locator('[data-menu=micro-utility]').click();
  await page.locator('#hardware-menu-body .control:visible .control-help').first().click();
  await expect(page.locator('#hardware-menu #control-tooltip')).toBeVisible();
  await page.getByRole('navigation', { name: 'Menu pages' }).getByRole('button', { name: 'Velocity', exact: true }).click();
  await page.locator('#velocity').fill('55');
  expect(await messages(page)).toEqual([]);
  await page.locator('#hardware-menu-close').click();
  await expect(page.locator('#control-tooltip')).toBeHidden();
  const key = page.locator('[data-note]').first(); await key.focus(); await page.keyboard.down('Enter');
  expect((await messages(page)).at(-1)).toEqual([144, 48, 55]);
  await page.keyboard.up('Enter');
});

test('Mobius VALUE follows the selected machine; PRO-VS tuning follows its shared oscillator', async ({ page }) => {
  await mockMidi(page); await page.goto('/instrument.html?instrument=strymon-mobius'); await connect(page);
  await page.locator('[id="hardware-cc-19"]').selectOption('10'); await clearMessages(page);
  await page.locator('[data-menu=mobius-machine]').click();
  await expect(page.locator('#hardware-menu-pages')).toContainText('Destroyer');
  await expect(page.locator('#hardware-menu-pages')).not.toContainText('Chorus');
  expect(await messages(page)).toEqual([]);
  await page.goto('/instrument.html?instrument=pro-vs-mini'); await connect(page);
  await page.getByRole('group', { name: 'oscillator view' }).getByRole('button', { name: 'C', exact: true }).click();
  await page.locator('[data-menu=pro-osc]').click();
  await expect(page.locator('#hardware-menu-pages')).toContainText('Oscillator C');
  await expect(page.locator('#hardware-menu-pages')).not.toContainText('Oscillator A');
});

test('Mobius physical switches send complete taps, not persistent holds', async ({ page }) => {
  await mockMidi(page); await page.goto('/instrument.html?instrument=strymon-mobius'); await connect(page);
  for (const [number, press, released] of [[80, 0, 127], [82, 0, 127], [81, 127, 0]]) {
    await clearMessages(page); await page.locator(`[id="hardware-cc-${number}"]`).click();
    expect(await messages(page)).toEqual([[176, number, press, 176, number, released]]);
    await expect(page.locator(`[id="hardware-cc-${number}"]`)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('physical PRESET menu reuses and restores the same library, with failure-safe note release', async ({ page }) => {
  await mockMidi(page); await page.goto('/instrument.html?instrument=microfreak'); await connect(page);
  const key = page.locator('[data-note]').first(); await key.focus(); await page.keyboard.down('Enter');
  await page.evaluate(() => { window.failNoteOff = true; });
  await page.locator('[data-menu=micro-preset]').click();
  await expect(page.locator('#hardware-menu')).not.toBeVisible();
  await expect(page.locator('#notification')).toContainText('Test');
  await page.evaluate(() => { window.failNoteOff = false; });
  await page.locator('[data-menu=micro-preset]').click(); await page.keyboard.up('Enter');
  await expect(page.locator('#hardware-menu #panel-presets')).toBeVisible();
  await expect(page.locator('#preset-slot')).toHaveCount(1);
  await page.locator('#preset-slot').fill('12'); await clearMessages(page);
  await page.locator('#recall-preset').click(); expect(await messages(page)).toEqual([[192, 11]]);
  await page.locator('#hardware-menu-close').click();
  await expect(page.locator('#parameter-inspector #panel-presets')).toHaveCount(1);
  await page.locator('#open-presets').click(); await expect(page.locator('#panel-presets')).toBeVisible();
});

for (const pedal of pedals) {
  test(`${pedal.name}: performance deck switches viewed banks without MIDI and edits alternate controls`, async ({ page }) => {
    await mockMidi(page);
    await page.goto(`/controller.html?pedal=${pedal.id}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await connect(page);
    await page.locator('#pedal-cc-14').fill('30');
    await clearMessages(page);
    await page.locator('#face-hidden').click();
    await expect(page.locator('#pedal-cc-24')).toBeVisible();
    await page.locator('#pedal-cc-24').fill('100');
    await clearMessages(page);
    await page.locator('#face-normal').click();
    await expect(page.locator('#pedal-cc-14')).toHaveValue('30');
    expect(await messages(page)).toEqual([]);
    await page.locator('#face-parameter').selectOption('24');
    await expect(page.locator('#face-cc-24')).toHaveValue('100');
    await page.locator('#face-cc-24').fill('90');
    expect(await messages(page)).toEqual([[177, 24, 90]]);
    await page.locator('#face-hidden').click();
    await expect(page.locator('#pedal-cc-24')).toHaveValue('90');
  });
}
