import { test, expect } from '@playwright/test';
import { pedals, getPedal } from '../pedals.js';
import { mockMidi, connect, messages, clearMessages } from './helpers.js';

test.beforeEach(async ({ page }) => { await mockMidi(page); });
const open = async (page, id) => {
  await page.goto(`/controller.html?pedal=${id}`);
  await connect(page);
};
test('landing has four dedicated routes; selection and browser history send nothing', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Selecionar pedal' }).getByRole('link')).toHaveCount(4);
  for (const pedal of pedals) {
    await page.getByRole('link', { name: `Controlar ${pedal.name} · ${pedal.variant}`, exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-pedal', pedal.id);
    expect(await messages(page)).toEqual([]);
    await expect(page).toHaveURL(new RegExp(`pedal=${pedal.id}$`));
    await page.locator('#back-pedals').click();
    await expect(page.locator('#pedal-library')).toBeVisible();
  }
  await page.getByRole('link', { name: 'Controlar Lost + Found · Verde', exact: true }).click();
  await page.goBack();
  await expect(page.locator('#pedal-library')).toBeVisible();
  await page.goForward();
  await expect(page.locator('body')).toHaveAttribute('data-pedal', 'lost-found');
  expect(await messages(page)).toEqual([]);
});
for (const pedal of pedals.filter((item) => item.id !== 'mood-mkii')) {
  test(`${pedal.name}: every CC is reachable, unique IDs, correct sends and isolated ALT banks`, async ({ page }) => {
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await open(page, pedal.id);
    expect(await messages(page)).toEqual([]);
    const ccList = await page.locator('[data-cc]').evaluateAll((elements) => [...new Set(elements.map((element) => Number(element.dataset.cc)))].sort((a, b) => a - b));
    expect(ccList).toEqual(pedal.controls.map((control) => control.cc).sort((a, b) => a - b));
    await page.locator('#pedal-cc-14').fill('23');
    await clearMessages(page);
    await page.locator('#tab-hidden').click();
    await expect(page.locator('#pedal-cc-24')).toHaveValue(String(pedal.controls.find((control) => control.cc === 24).initial));
    expect(await messages(page)).toEqual([]);
    await page.locator('#pedal-cc-24').fill('107');
    await page.locator('#cc-104').click();
    await expect(page.locator('#cc-104')).toHaveAttribute('aria-pressed', 'true');
    expect(await messages(page)).toEqual([[177, 24, 107], [177, 104, pedal.hiddenOn]]);
    await clearMessages(page);
    await page.locator('#cc-104').click();
    await expect(page.locator('#pedal-cc-14')).toHaveValue('23');
    expect(await messages(page)).toEqual([[177, 104, pedal.hiddenOff]]);
    await clearMessages(page);
    await page.locator('#tab-hidden').click();
    await expect(page.locator('#pedal-cc-24')).toHaveValue('107');
    await page.evaluate(() => { window.failAll = true; });
    await page.locator('#cc-104').click();
    await expect(page.locator('#cc-104')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#notification')).toContainText('Test send failure');
    await expect(page.locator('#pedal-cc-24')).toHaveValue('107');
    expect(await messages(page)).toEqual([]);
    const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(errors).toEqual([]);
  });
  test(`${pedal.name}: exact documented select and DIP/action bytes in every panel`, async ({ page }) => {
    await open(page, pedal.id);
    for (const control of pedal.controls.filter((item) => ['pedal', 'footswitch'].includes(item.group))) {
      const input = page.locator(`#pedal-cc-${control.cc}`);
      if (control.kind === 'range') {
        for (const value of [0, 127]) {
          await clearMessages(page); await input.fill(String(value));
          expect(await messages(page)).toEqual([[177, control.cc, value]]);
        }
      } else if (control.kind === 'select') {
        for (const choice of control.choices) {
          await clearMessages(page); await input.selectOption(String(choice.value));
          expect(await messages(page)).toEqual([[177, control.cc, choice.value]]);
        }
      } else {
        await clearMessages(page); await input.click(); await input.click();
        expect(await messages(page)).toEqual([[177, control.cc, 1], [177, control.cc, 0]]);
      }
    }
    for (const tab of ['performance', 'hidden', 'dips', 'settings', ...(pedal.synth ? ['synth'] : [])]) {
      await page.locator(`#tab-${tab}`).click();
      const groups = { performance: ['performance'], hidden: ['hidden'], dips: ['ramping', 'dip-left', 'dip-right'], settings: ['global'], synth: ['synth'] }[tab];
      for (const control of pedal.controls.filter((item) => groups.includes(item.group))) {
        const input = page.locator(`#cc-${control.cc}`);
        if (control.kind === 'range') {
          await clearMessages(page); await input.fill('125');
          expect(await messages(page)).toEqual([[177, control.cc, 125]]);
        } else if (control.kind === 'select') {
          for (const choice of control.choices) {
            await clearMessages(page); await input.selectOption(String(choice.value));
            expect(await messages(page)).toEqual([[177, control.cc, choice.value]]);
          }
        } else if (control.kind === 'toggle') {
          const wasOn = await input.getAttribute('aria-pressed') === 'true';
          await clearMessages(page); await input.click();
          expect(await messages(page)).toEqual([[177, control.cc, wasOn ? control.offValue ?? 0 : control.onValue ?? 1]]);
        } else if (!control.confirmation) {
          await clearMessages(page); await input.click();
          expect(await messages(page)).toEqual([[177, control.cc, control.value]]);
        }
      }
    }
  });
  test(`${pedal.name}: views fit mobile, tablet and desktop at every bank/tab`, async ({ page }) => {
    await open(page, pedal.id);
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const tab of ['performance', 'hidden', 'dips', 'settings', ...(pedal.synth ? ['synth'] : [])]) {
        await page.locator(`#tab-${tab}`).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const box = await page.locator('.pedal').boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
  });
}
test('Generation Loss model menu, Classic labels and AUX use documented commands only', async ({ page }) => {
  await open(page, 'generation-loss-mkii');
  await expect(page.locator('#tab-synth')).toHaveCount(0);
  await expect(page.locator('#cc-51,#cc-56,#cc-59,#cc-93')).toHaveCount(0);
  for (const model of getPedal('generation-loss-mkii').models) {
    await clearMessages(page); await page.locator('#model-select').selectOption(String(model.value));
    expect(await messages(page)).toEqual([[177, 16, model.value]]);
    await expect(page.locator('#pedal-cc-16')).toHaveValue(String(model.value));
  }
  await clearMessages(page); await page.locator('#classic-shortcut').click();
  expect(await messages(page)).toEqual([[177, 72, 1]]);
  await expect(page.locator('#model-select')).toBeDisabled();
  await expect(page.locator('[data-position="16"] label')).toContainText('LOW PASS');
  await expect(page.locator('[data-position="18"] label')).toContainText('GENERATION');
  await expect(page.locator('[data-position="19"] label')).toContainText('HIGH PASS');
  await clearMessages(page);
  await page.locator('#pedal-cc-18').fill('90');
  expect(await messages(page)).toEqual([[177, 18, 90]]);
  await page.locator('#tab-hidden').click();
  await expect(page.locator('#pedal-cc-20')).toBeVisible();
  await page.locator('#pedal-cc-26').fill('127');
  await expect(page.locator('#cc-26')).toHaveValue('127');
  await page.locator('#tab-dips').click();
  await page.locator('#cc-72').click();
  await page.locator('#tab-performance').click();
  await expect(page.locator('[data-position="16"] label')).toContainText('MODEL / LP');
});
test('Lost + Found A/B selection, channel swaps, presets bank and random state', async ({ page }) => {
  await open(page, 'lost-found');
  await page.getByRole('button', { name: 'Selecionar PITCH · L', exact: true }).click();
  await page.getByRole('button', { name: 'B · Pitch Repeater', exact: true }).click();
  await expect(page.locator('#pedal-cc-17')).toHaveValue('127');
  await expect(page.locator('#effect-title-21')).toContainText('Pitch Repeater');
  await clearMessages(page);
  await page.locator('#tab-dips').click();
  await page.locator('#cc-74').click();
  await page.locator('#cc-78').click();
  await page.locator('#tab-performance').click();
  await page.getByRole('button', { name: 'B · Sympathetic Resonator', exact: true }).click();
  expect(await messages(page)).toEqual([[177, 74, 1], [177, 78, 1], [177, 17, 127]]);
  await page.locator('#physical-preset').selectOption('3');
  await expect(page.locator('#physical-preset option:checked')).toHaveText('RIGHT · 3');
  await clearMessages(page);
  await page.locator('#cc-114').click();
  expect(await messages(page)).toEqual([[177, 114, 1]]);
  await expect(page.locator('#physical-preset option:checked')).toHaveText('NÃO SINCRONIZADO');
  await expect(page.locator('#pedal-knobs [data-cc="14"]')).toHaveClass(/stale/);
  await page.locator('#tab-hidden').click();
  await page.locator('#pedal-cc-25').fill('60');
  await expect(page.locator('#cc-25')).toHaveValue('60');
  await expect(page.locator('#ramp-wave')).toHaveCount(0);
});
test('BAD MOOD station/chord menus synchronize raw knobs without MOOD waveform/buffer labels', async ({ page }) => {
  await open(page, 'bad-mood');
  await expect(page.locator('#station-select')).toBeDisabled();
  await expect(page.locator('#chord-select')).toBeDisabled();
  await page.getByRole('button', { name: 'Selecionar RADIO', exact: true }).click();
  await clearMessages(page); await page.locator('#station-select').selectOption('97');
  expect(await messages(page)).toEqual([[177, 19, 97]]);
  await expect(page.locator('#pedal-cc-19')).toHaveValue('97');
  await page.getByRole('button', { name: 'Selecionar FLIP', exact: true }).click();
  await clearMessages(page); await page.locator('#chord-select').selectOption('43');
  expect(await messages(page)).toEqual([[177, 17, 43]]);
  await page.locator('#pedal-cc-17').fill('44');
  await expect(page.locator('#chord-select')).toHaveValue('43');
  await expect(page.locator('[data-position="17"] output')).toContainText('Acorde 17');
  await page.locator('#tab-hidden').click(); await page.locator('#pedal-cc-25').fill('60');
  await expect(page.locator('#cc-25')).toHaveValue('60');
  await expect(page.locator('[data-position="15"] label')).toContainText('BALANCE');
  await expect(page.locator('[data-position="23"] label')).toContainText('CROSS input');
  await expect(page.locator('#ramp-wave')).toHaveCount(0);
});
test('changing pedal releases notes first, rejects failed releases and never migrates settings', async ({ page }) => {
  await open(page, 'bad-mood');
  await page.locator('#pedal-cc-14').fill('29');
  await page.locator('#tab-synth').click();
  await page.getByRole('button', { name: 'Nota C4', exact: true }).focus();
  await page.keyboard.down('Enter');
  await page.evaluate(() => { window.failNoteOff = true; });
  await page.locator('#back-pedals').click();
  await expect(page.locator('body')).toHaveAttribute('data-pedal', 'bad-mood');
  await expect(page.locator('#notification')).toContainText('Não foi possível parar');
  await page.evaluate(() => { window.failNoteOff = false; });
  const released = page.waitForFunction(() => window.sent.some((message) => message[0] === 129 && message[1] === 60));
  await page.locator('#stop-notes').click(); await released;
  await page.locator('#back-pedals').click();
  await page.getByRole('link', { name: 'Controlar Lost + Found · Verde', exact: true }).click();
  await expect(page.locator('#pedal-cc-14')).toHaveValue('64');
  await expect(page.locator('#output')).toHaveValue('');
  expect(await messages(page)).toEqual([]);
});
test('unknown pedal fails safely and landing fits small screens', async ({ page }) => {
  await page.goto('/controller.html?pedal=wrong');
  await expect(page.locator('main')).toContainText('Pedal desconhecido');
  await expect(page.locator('#connect')).toHaveCount(0);
  expect(await messages(page)).toEqual([]);
  await page.getByRole('link', { name: '← Selecionar pedal', exact: true }).click();
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
test('pedal-specific surfaces are applied and Hidden labels retain contrast', async ({ page }) => {
  for (const id of ['lost-found', 'generation-loss-mkii', 'bad-mood']) {
    await open(page, id);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const image = await page.locator('.pedal').evaluate((element) => getComputedStyle(element).backgroundImage);
    if (id === 'generation-loss-mkii') expect(image).toContain('linear-gradient');
    if (id === 'bad-mood') expect(image).toContain('repeating-radial-gradient');
    await page.locator('#tab-hidden').click();
    await expect(page.locator('.pedal')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const label = await page.locator('[data-position="14"] label').evaluate((element) => getComputedStyle(element).color);
    const ink = await page.locator('body').evaluate((element) => getComputedStyle(element).color);
    expect(label).toBe(ink);
  }
});
