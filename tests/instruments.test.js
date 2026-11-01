import test from 'node:test';
import assert from 'node:assert/strict';
import { instruments } from '../instruments.js';
import { controlMessages, presetMessages } from '../midi.js';

test('ten additional instruments have complete identities, hardware views and official manual URLs', () => {
  assert.equal(instruments.length, 10);
  assert.equal(instruments.filter((instrument) => instrument.category === 'pedals').length, 6);
  assert.equal(instruments.filter((instrument) => instrument.category === 'synths').length, 4);
  assert.equal(new Set(instruments.map((instrument) => instrument.id)).size, 10);
  for (const instrument of instruments) {
    for (const field of ['name', 'id', 'brand', 'subtitle', 'connection']) assert.ok(instrument[field]?.length, `${instrument.id}: ${field}`);
    for (const field of ['manualUrl', 'mainManualUrl']) assert.equal(new URL(instrument[field]).protocol, 'https:');
    assert.ok(Number.isInteger(instrument.defaultChannel) && instrument.defaultChannel >= 1 && instrument.defaultChannel <= 16);
    assert.ok(['compact', 'wide', 'keyboard', 'drum'].includes(instrument.appearance.layout));
    assert.ok(instrument.controls.some((control) => control.physical));
  }
});
test('every declared remote control has a unique address, valid documented values and MIDI-encodable boundaries', () => {
  for (const instrument of instruments) {
    assert.equal(new Set(instrument.controls.map((control) => control.id)).size, instrument.controls.length, instrument.id);
    for (const control of instrument.controls) {
      assert.ok(control.name && control.section && control.hint, `${instrument.id}/${control.id}: help`);
      assert.ok(Number.isInteger(control.min) && Number.isInteger(control.max) && control.min <= control.max, `${instrument.id}/${control.id}: range`);
      const values = control.kind === 'select' ? control.choices.map((choice) => choice.value) :
        control.kind === 'toggle' ? [control.offValue ?? 0, control.onValue ?? 127] :
          control.kind === 'action' ? [control.value] : [control.min, control.initial, control.max];
      if (control.kind !== 'action') assert.ok(values.includes(control.initial) || (control.initial >= control.min && control.initial <= control.max));
      for (const value of values) {
        for (const channel of [1, 16]) {
          const messages = controlMessages(channel, control, value);
          assert.ok(messages.length);
          for (const message of messages) {
            assert.ok(message[0] >= 0x80 && message[0] <= 0xef, `${instrument.id}/${control.id}: MIDI status`);
            assert.ok(message.slice(1).every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 127), `${instrument.id}/${control.id}: MIDI data`);
          }
        }
      }
    }
  }
});
test('all hardware preset limits encode valid bank/program bytes and no undisclosed Live is inherited', () => {
  for (const instrument of instruments.filter((item) => item.presets)) {
    for (const slot of [1, instrument.presets.count]) {
      const messages = instrument.presetMessages ? instrument.presetMessages(16, slot) : presetMessages(16, slot, instrument.presets);
      assert.equal(messages.at(-1)[0], 0xcf, instrument.id);
      assert.ok(messages.flat().every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255));
      assert.ok(messages.every((message) => message.slice(1).every((byte) => byte <= 127)));
    }
    if (instrument.presets.live === undefined && !instrument.presetMessages) assert.throws(() => presetMessages(1, 0, instrument.presets));
  }
});
