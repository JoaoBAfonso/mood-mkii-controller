import test from 'node:test';
import assert from 'node:assert/strict';
import { controlMessages, nrpnMessages, presetMessages, programMessage, pitchBendMessage } from '../midi.js';
import { validateLibrary, emptyLibrary } from '../presets.js';

test('NRPN preserves selector/data boundaries and distinguishes 7-bit data entry', () => {
  assert.deepEqual(nrpnMessages(3, 259, 16383), [[178, 99, 2], [178, 98, 3], [178, 6, 127], [178, 38, 127]]);
  assert.deepEqual(nrpnMessages(16, 16383, 0), [[191, 99, 127], [191, 98, 127], [191, 6, 0], [191, 38, 0]]);
  assert.deepEqual(nrpnMessages(1, 130, 127, 7), [[176, 99, 1], [176, 98, 2], [176, 6, 127]]);
  for (const value of [-1, 16384, NaN, 1.5]) assert.throws(() => nrpnMessages(1, 1, value), RangeError);
  assert.throws(() => nrpnMessages(1, 1, 128, 7), RangeError);
  assert.throws(() => nrpnMessages(1, 1, 127, 8), RangeError);
});
test('generic programs and pitch bend use full MIDI ranges without changing Chase Bliss slots', () => {
  assert.deepEqual(programMessage(10, 127), [201, 127]);
  assert.deepEqual(pitchBendMessage(1, 0), [224, 0, 0]);
  assert.deepEqual(pitchBendMessage(16, 8192), [239, 0, 64]);
  assert.deepEqual(pitchBendMessage(2, 16383), [225, 127, 127]);
  assert.throws(() => programMessage(1, 128), RangeError);
  assert.throws(() => pitchBendMessage(0, 8192), RangeError);
});
test('banked preset recall emits bank selection before PC and rejects unsupported banks', () => {
  assert.deepEqual(presetMessages(1, 1, { count: 128, offset: 0 }), [[192, 0]]);
  assert.deepEqual(presetMessages(2, 122, { count: 122, offset: 1, live: 0 }), [[193, 122]]);
  assert.deepEqual(presetMessages(1, 256, { count: 256, offset: 0, bankMsb: 0, bankLsb: 32 }), [[176, 0, 0], [176, 32, 1], [192, 127]]);
  assert.throws(() => presetMessages(1, 129, { count: 256, offset: 0 }), RangeError);
  assert.throws(() => presetMessages(1, 0, { count: 128, offset: 0 }), RangeError);
});
test('controls enforce documented ranges, choices and 14-bit CC order', () => {
  const control = { name: 'Fine cutoff', protocol: 'cc14', number: 16, fineNumber: 48, kind: 'range', min: 0, max: 16383 };
  assert.deepEqual(controlMessages(1, control, 129), [[176, 16, 1], [176, 48, 1]]);
  assert.throws(() => controlMessages(1, { ...control, max: 100 }, 129), RangeError);
  assert.throws(() => controlMessages(1, { ...control, kind: 'select', choices: [{ value: 0, label: 'Off' }] }, 1), RangeError);
  assert.throws(() => controlMessages(1, { ...control, kind: 'toggle', onValue: 127, offValue: 0 }, 1), RangeError);
});
test('preset metadata respects device-specific slot counts and keeps original 122-slot default', () => {
  const library = emptyLibrary('small');
  library.presets['128'] = { name: 'Final', notes: '', favorite: true };
  assert.throws(() => validateLibrary(library, 'small'));
  assert.equal(validateLibrary(library, 'small', 128).presets['128'].name, 'Final');
  library.setlist = [128, 128];
  assert.throws(() => validateLibrary(library, 'small', 64));
});
