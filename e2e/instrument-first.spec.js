import { test, expect } from '@playwright/test';
import { instruments } from '../instruments.js';
import { pedals } from '../pedals.js';
import { controlMessages } from '../midi.js';
import { mockMidi, connect, messages, clearMessages } from './helpers.js';

for (const instrument of instruments) {
  test(`${instrument.name}: onboard editor exposes every parameter and mirrors the optional browser`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mockMidi(page);
    await page.goto(`/instrument.html?instrument=${instrument.id}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.locator('body').textContent()).not.toMatch(/Não ligado|Escolhe|Selecionar|Guardar|Configurações|Controlos|Ligação|Velocidade/);
    await expect(page.locator('#parameter-inspector')).not.toHaveAttribute('open', '');
    for (const section of new Set(instrument.controls.map((control) => control.section))) {
      await page.locator('#onboard-section').selectOption(section);
      const expected = instrument.controls.filter((control) => control.section === section).map((control) => control.id);
      expect(await page.locator('#onboard-parameter option').evaluateAll((options) => options.map((option) => option.value))).toEqual(expected);
    }
    expect(await messages(page)).toEqual([]);
    await connect(page);
    await page.locator('#parameter-inspector').evaluate((details) => { details.open = false; });
    const control = instrument.controls.find((item) => item.kind === 'range');
    await page.locator('#onboard-section').selectOption(control.section);
    await page.locator('#onboard-parameter').selectOption(control.id);
    await page.locator(`[id="screen-${control.id}"]`).fill(String(control.max));
    expect(await messages(page)).toEqual([controlMessages(instrument.defaultChannel, control, control.max).flat()]);
    await expect(page.locator(`[id="${control.id}"]`)).toHaveValue(String(control.max));
    await page.evaluate(() => { window.failAll = true; });
    await page.locator(`[id="screen-${control.id}"]`).fill(String(control.min));
    await expect(page.locator(`[id="screen-${control.id}"]`)).toHaveValue(String(control.max));
    await expect(page.locator('#notification')).toContainText('Test send failure');
    await page.locator('#channel').selectOption(String(instrument.defaultChannel === 1 ? 2 : 1));
    await expect(page.locator(`[id="screen-${control.id}"]`)).toHaveValue(String(control.initial));
    expect(errors).toEqual([]);
  });
}

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
