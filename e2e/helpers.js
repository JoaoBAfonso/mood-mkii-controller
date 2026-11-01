export async function mockMidi(page) {
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
}
export async function connect(page) {
  await page.locator('#connect').click();
  await page.locator('#output').selectOption('test-out');
}
export async function messages(page) { return page.evaluate(() => window.sent); }
export async function clearMessages(page) { await page.evaluate(() => { window.sent = []; }); }
