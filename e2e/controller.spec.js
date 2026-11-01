import { test, expect } from '@playwright/test';

async function messages(page) { return page.evaluate(() => window.sent); }
async function clearMessages(page) { await page.evaluate(() => { window.sent = []; }); }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sent = [];
    window.failNoteOff = false;
    window.failAll = false;
    const port = {
      id: 'test-out', name: 'Test MIDI', state: 'connected',
      send(message) {
        if (window.failAll || (window.failNoteOff && (message[0] & 0xf0) === 0x80)) throw new Error('Test send failure');
        window.sent.push([...message]);
      },
    };
    window.port = port;
    window.midiAccess = { outputs: new Map([[port.id, port]]) };
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      value: async (options) => {
        if (options.sysex !== false) throw new Error('Unexpected SysEx permission');
        return window.midiAccess;
      },
    });
  });
  await page.goto('/');
  await page.locator('#connect').click();
  await page.locator('#output').selectOption('test-out');
});

test('connection sends nothing and normal controls send the exact CC bytes', async ({ page }) => {
  expect(await messages(page)).toEqual([]);
  await page.locator('#pedal-cc-14').fill('127');
  await page.locator('#pedal-cc-103').click();
  expect(await messages(page)).toEqual([[177, 14, 127], [177, 103, 1]]);
});

test('Hidden uses independent values, restores normal bank and never replays it', async ({ page }) => {
  const normal = [[14, 30], [15, 80], [16, 110], [17, 11], [18, 52], [19, 120]];
  for (const [cc, value] of normal) await page.locator(`#pedal-cc-${cc}`).fill(String(value));
  await page.locator('#pedal-cc-21').selectOption('2');
  await page.locator('#pedal-cc-22').selectOption('3');
  await page.locator('#pedal-cc-23').selectOption('3');
  await page.locator('#tab-hidden').click();
  await page.locator('#cc-104').click();
  await expect(page.locator('#pedal-bank')).toContainText('HIDDEN');
  const hidden = [[24, 10], [25, 60], [26, 20], [27, 30], [28, 40], [29, 50]];
  for (const [cc, value] of hidden) await page.locator(`#pedal-cc-${cc}`).fill(String(value));
  await expect(page.locator('#cc-25')).toHaveValue('55');
  await page.locator('#pedal-cc-31').selectOption('3');
  await page.locator('#pedal-cc-32').selectOption('0');
  await page.locator('#pedal-cc-33').selectOption('0');
  await clearMessages(page);
  await page.locator('#cc-104').click();
  expect(await messages(page)).toEqual([[177, 104, 0]]);
  for (const [cc, value] of normal) await expect(page.locator(`#pedal-cc-${cc}`)).toHaveValue(String(value));
  await expect(page.locator('#pedal-cc-21')).toHaveValue('2');
  await expect(page.locator('#pedal-cc-22')).toHaveValue('3');
  await expect(page.locator('#pedal-cc-23')).toHaveValue('3');
  await page.locator('#cc-104').click();
  for (const [cc, value] of hidden) await expect(page.locator(`#pedal-cc-${cc}`)).toHaveValue(String(value));
  const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((el) => el.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('dedicated Hidden controls synchronize the pedal view in both directions', async ({ page }) => {
  await page.locator('#tab-hidden').click();
  await page.locator('#cc-24').fill('100');
  await page.locator('#cc-104').click();
  await expect(page.locator('#pedal-cc-24')).toHaveValue('100');
  await page.locator('#pedal-cc-24').fill('20');
  await expect(page.locator('#cc-24')).toHaveValue('20');
  await page.locator('#cc-25').selectOption('127');
  await expect(page.locator('#pedal-cc-25')).toHaveValue('127');
});

test('failed hardware Hidden transition leaves the viewed bank and toggle unchanged', async ({ page }) => {
  await page.locator('#tab-hidden').click();
  await page.evaluate(() => { window.failAll = true; });
  await page.locator('#cc-104').click();
  await expect(page.locator('#cc-104')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#pedal-cc-24')).toBeVisible();
  await expect(page.locator('#notification')).toContainText('Test send failure');
});

test('demo and each hardware output/channel have independent state', async ({ page }) => {
  await page.locator('#pedal-cc-14').fill('30');
  await page.locator('#demo').check();
  await page.locator('#pedal-cc-14').fill('100');
  await page.locator('#tab-hidden').click();
  await page.locator('#cc-104').click();
  await clearMessages(page);
  await page.locator('#demo').uncheck();
  await page.locator('#tab-performance').click();
  await expect(page.locator('#pedal-cc-14')).toHaveValue('30');
  await expect(page.locator('#cc-104')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#channel').selectOption('3');
  await expect(page.locator('#pedal-cc-14')).toHaveValue('64');
  await page.locator('#pedal-cc-14').fill('90');
  await page.locator('#channel').selectOption('2');
  await expect(page.locator('#pedal-cc-14')).toHaveValue('30');
  await page.evaluate(() => {
    window.midiAccess.outputs.set('second', { ...window.port, id: 'second', name: 'Second MIDI' });
    window.midiAccess.onstatechange();
  });
  await page.locator('#output').selectOption('second');
  await expect(page.locator('#pedal-cc-14')).toHaveValue('64');
  await page.locator('#output').selectOption('test-out');
  await expect(page.locator('#pedal-cc-14')).toHaveValue('30');
  expect(await messages(page)).toEqual([[178, 14, 90]]);
});

test('failed preset recall restores the displayed preset; high slots have an explicit label', async ({ page }) => {
  await page.locator('#physical-preset').selectOption('1');
  await page.evaluate(() => { window.failAll = true; });
  await page.locator('#physical-preset').selectOption('2');
  await expect(page.locator('#physical-preset')).toHaveValue('1');
  await page.evaluate(() => { window.failAll = false; });
  await page.locator('#tab-settings').click();
  await page.locator('#preset-slot').fill('122');
  await page.locator('#recall-preset').click();
  await expect(page.locator('#physical-preset')).toHaveValue('122');
  await expect(page.locator('#physical-preset option:checked')).toHaveText('PC · 122');
  await expect(page.locator('#pedal-knobs [data-cc="14"]')).toHaveClass(/stale/);
  await page.locator('#pedal-cc-14').fill('25');
  await expect(page.locator('#pedal-knobs [data-cc="14"]')).not.toHaveClass(/stale/);
});

test('preset confirmation identifies and retains the slot; cancel sends nothing', async ({ page }) => {
  await page.locator('#tab-settings').click();
  await page.locator('#preset-slot').fill('122');
  await page.locator('#cc-111').click();
  await expect(page.locator('#confirm-text')).toContainText('Slot 122');
  await page.evaluate(() => { document.getElementById('preset-slot').value = '1'; });
  await page.getByRole('button', { name: 'Confirmar envio', exact: true }).click();
  expect(await messages(page)).toEqual([[177, 111, 122]]);
  await clearMessages(page);
  await page.locator('#cc-56').click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await messages(page)).toEqual([]);
});

test('pending confirmation cannot migrate to a different MIDI target', async ({ page }) => {
  await page.locator('#tab-settings').click();
  await page.locator('#cc-111').click();
  await page.evaluate(() => {
    const select = document.getElementById('channel');
    select.value = '3'; select.dispatchEvent(new Event('change'));
  });
  await page.getByRole('button', { name: 'Confirmar envio', exact: true }).click();
  expect(await messages(page)).toEqual([]);
  await expect(page.locator('#notification')).toContainText('Destino MIDI alterado');
});

test('Note Off failures remain retryable and block preset/reset/Clock operations', async ({ page }) => {
  await page.locator('#tab-synth').click();
  const key = page.getByRole('button', { name: 'Nota C4', exact: true });
  await key.focus();
  await page.keyboard.down('Space');
  await page.evaluate(() => { window.failNoteOff = true; });
  await page.keyboard.up('Space');
  await expect(key).toHaveClass(/playing/);
  await expect(page.locator('#notification')).toContainText('Não foi possível parar');
  await page.locator('#pedal-cc-18').fill('120');
  expect(await messages(page)).toEqual([[145, 60, 100]]);
  await expect(page.locator('#pedal-cc-18')).toHaveValue('64');
  await page.locator('#physical-preset').selectOption('1');
  expect(await messages(page)).toEqual([[145, 60, 100]]);
  await page.locator('#tab-settings').click();
  await page.locator('#cc-110').click();
  await page.getByRole('button', { name: 'Confirmar envio', exact: true }).click();
  expect(await messages(page)).toEqual([[145, 60, 100]]);
  await page.evaluate(() => { window.failNoteOff = false; });
  await page.locator('#tab-synth').click();
  await page.locator('#stop-notes').click();
  expect(await messages(page)).toEqual([[145, 60, 100], [129, 60, 0]]);
  await expect(key).not.toHaveClass(/playing/);
  await expect(page.locator('#log')).toContainText('Note Off 60');
});

test('notes release on their original channel and Clock exits with Note Off first', async ({ page }) => {
  await page.locator('#tab-synth').click();
  const key = page.getByRole('button', { name: 'Nota C4', exact: true });
  await key.focus();
  await page.keyboard.down('Space');
  await page.locator('#channel').selectOption('3');
  await page.keyboard.up('Space');
  expect(await messages(page)).toEqual([[145, 60, 100], [129, 60, 0]]);
  await clearMessages(page);
  await key.focus();
  await page.keyboard.down('Space');
  await page.locator('#pedal-cc-18').fill('120');
  await page.keyboard.up('Space');
  expect(await messages(page)).toEqual([[146, 60, 100], [130, 60, 0], [178, 18, 120]]);
});

test('numeric invalid input is rejected and all CCs remain reachable without duplicate IDs', async ({ page }) => {
  const numeric = page.getByRole('spinbutton', { name: 'TIME valor CC', exact: true });
  await numeric.fill('128'); await numeric.press('Tab');
  await expect(numeric).toHaveValue('64');
  expect(await messages(page)).toEqual([]);
  const ccs = await page.locator('[data-cc]').evaluateAll((elements) => [...new Set(elements.map((el) => Number(el.dataset.cc)))]);
  expect(ccs).toHaveLength(61);
});

test('all tabs and both banks fit mobile and desktop widths', async ({ page }) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const bank of [false, true]) {
      await page.locator('#tab-hidden').click();
      if ((await page.locator('#cc-104').getAttribute('aria-pressed') === 'true') !== bank) await page.locator('#cc-104').click();
      for (const tab of ['performance', 'hidden', 'dips', 'synth', 'settings']) {
        await page.locator(`#tab-${tab}`).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    }
  }
});

test('knob dragging uses the active bank and repeated Hidden changes do not duplicate handlers', async ({ page }) => {
  await page.locator('#tab-hidden').click();
  for (let cycle = 0; cycle < 4; cycle++) {
    await page.locator('#cc-104').click();
    await page.locator('#cc-104').click();
  }
  await page.locator('#cc-104').click();
  await clearMessages(page);
  const box = await page.locator('#pedal-knobs [data-cc="24"] .knob').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 30);
  await page.mouse.up();
  expect(await messages(page)).toEqual([[177, 24, 84]]);
  await expect(page.locator('#cc-24')).toHaveValue('84');
  await page.locator('#cc-104').click();
  await expect(page.locator('#pedal-cc-14')).toHaveValue('64');
});

test('disconnect retains failed notes and reconnect releases on the original target', async ({ page }) => {
  await page.locator('#pedal-cc-14').fill('30');
  await page.locator('#tab-synth').click();
  const key = page.getByRole('button', { name: 'Nota C4', exact: true });
  await key.focus();
  await page.keyboard.down('Space');
  await page.evaluate(() => {
    window.port.state = 'disconnected';
    window.midiAccess.onstatechange();
  });
  await expect(page.locator('#output')).toHaveValue('');
  await expect(page.locator('#notification')).toContainText('Não foi possível parar a nota 60');
  await page.keyboard.up('Space');
  await clearMessages(page);
  await page.evaluate(() => {
    window.port.state = 'connected';
    window.midiAccess.onstatechange();
  });
  await page.locator('#output').selectOption('test-out');
  expect(await messages(page)).toEqual([[129, 60, 0]]);
  await expect(key).not.toHaveClass(/playing/);
  await expect(page.locator('#pedal-cc-14')).toHaveValue('30');
});

test('Tocar/Hidden navigation restores both banks without sending CC104 or altering its state', async ({ page }) => {
  await page.locator('#pedal-cc-14').fill('23');
  await clearMessages(page);
  await page.locator('#tab-hidden').click();
  await expect(page.locator('#pedal-cc-24')).toBeVisible();
  await expect(page.locator('#pedal-bank')).toContainText('HIDDEN');
  await expect(page.locator('#cc-104')).toHaveAttribute('aria-pressed', 'false');
  expect(await messages(page)).toEqual([]);
  await page.locator('#pedal-cc-24').fill('101');
  await clearMessages(page);
  await page.locator('#tab-performance').click();
  await expect(page.locator('#pedal-cc-14')).toHaveValue('23');
  await expect(page.locator('#pedal-bank')).toContainText('NORMAL');
  await page.locator('#tab-hidden').click();
  await expect(page.locator('#pedal-cc-24')).toHaveValue('101');
  expect(await messages(page)).toEqual([]);
  await page.locator('#cc-104').click();
  await clearMessages(page);
  await page.locator('#tab-performance').click();
  await expect(page.locator('#pedal-cc-14')).toHaveValue('23');
  await page.locator('#tab-hidden').click();
  await expect(page.locator('#cc-104')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#pedal-cc-24')).toHaveValue('101');
  expect(await messages(page)).toEqual([]);
});

test('keyboard tab navigation changes the bank too, and other panels retain the current view', async ({ page }) => {
  await page.locator('#tab-performance').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#pedal-cc-24')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-dips')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#pedal-cc-24')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.locator('#pedal-cc-14')).toBeVisible();
  expect(await messages(page)).toEqual([]);
});

test('mode diagrams select exact CC values, mirror toggles and update routing and descriptions', async ({ page }) => {
  for (const [name, cc, value] of [['REVERB', 21, 0], ['DELAY', 21, 2], ['SLIP', 21, 3], ['ENV', 23, 0], ['TAPE', 23, 2], ['STRETCH', 23, 3]]) {
    await clearMessages(page);
    await page.getByRole('button', { name: `Selecionar ${name}`, exact: true }).click();
    expect(await messages(page)).toEqual([[177, cc, value]]);
    await expect(page.locator(`#pedal-cc-${cc}`)).toHaveValue(String(value));
    await expect(page.getByRole('button', { name: `Selecionar ${name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('#pedal-cc-21').selectOption('2');
  await expect(page.getByRole('button', { name: 'Selecionar DELAY', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#mode-description-21')).toContainText('feedback');
  await expect(page.locator('#signal-flow')).toContainText('WET (DELAY)');
  await expect(page.locator('#signal-flow')).toContainText('LOOP (STRETCH)');
  await page.evaluate(() => { window.failAll = true; });
  await page.getByRole('button', { name: 'Selecionar SLIP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Selecionar DELAY', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('ramping diagram follows its full CC range and font is loaded locally', async ({ page }) => {
  await page.locator('#tab-hidden').click();
  await page.locator('#pedal-cc-25').fill('60');
  await expect(page.locator('#ramp-wave-name')).toHaveText('Ramping · Senoidal');
  await expect(page.locator('#ramp-wave')).toHaveAttribute('d', /Q/);
  await page.locator('#cc-25').selectOption('127');
  await expect(page.locator('#ramp-wave-name')).toHaveText('Ramping · Random');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('14px Outfit'))).toBe(true);
  expect((await page.request.get('/assets/fonts/outfit-variable.ttf')).status()).toBe(200);
});
