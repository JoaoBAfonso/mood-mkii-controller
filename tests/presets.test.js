import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, validateLibrary, presetTitle, libraryKey } from '../presets.js';
import { pedals } from '../pedals.js';
import { controlHelp, modeDetail } from '../help.js';

test('preset libraries validate version/model/slots and preserve repeated setlist entries', () => {
  const library = emptyLibrary('mood-mkii');
  library.presets[122] = { name: 'Final', notes: 'Slow fade', favorite: true };
  library.setlist = [1, 122, 1];
  const result = validateLibrary(library, 'mood-mkii');
  assert.deepEqual(result, library);
  assert.notEqual(result.presets, library.presets);
  assert.equal(presetTitle(result, 122), 'Final');
  assert.equal(presetTitle(result, 30), 'Preset 30');
  assert.equal(presetTitle(result, 0), 'Live');
  assert.notEqual(libraryKey('mood-mkii'), libraryKey('bad-mood'));
  for (const invalid of [
    null, {}, { ...library, version: 2 }, { ...library, pedalId: 'bad-mood' },
    { ...library, presets: [] }, { ...library, presets: { 0: library.presets[122] } },
    { ...library, presets: { 123: library.presets[122] } },
    { ...library, presets: { '01': library.presets[122] } },
    { ...library, presets: { 1: { name: 'a', notes: '', favorite: 1 } } },
    { ...library, presets: { 1: { name: 'x'.repeat(81), notes: '', favorite: false } } },
    { ...library, presets: { 1: { name: '', notes: 'x'.repeat(1001), favorite: false } } },
    { ...library, setlist: [0] }, { ...library, setlist: [123] }, { ...library, setlist: ['1'] },
    { ...library, setlist: Array(501).fill(1) },
  ]) assert.throws(() => validateLibrary(invalid, 'mood-mkii'));
});
test('every mode has substantial original performance help and dynamic controls follow the mode', () => {
  for (const pedal of pedals) {
    const state = Object.fromEntries(pedal.controls.filter((control) => 'initial' in control).map((control) => [control.cc, control.initial]));
    for (const mode of pedal.modes) {
      state[mode.cc] = mode.value;
      assert.ok(modeDetail(pedal, state, mode.cc).length > 60);
    }
  }
  const bad = pedals.find((pedal) => pedal.id === 'bad-mood');
  const length = bad.controls.find((control) => control.cc === 16);
  assert.match(controlHelp(bad, length, { 23: 2, 19: 97 }), /Shoegaze/);
  const gen = pedals.find((pedal) => pedal.id === 'generation-loss-mkii');
  assert.match(controlHelp(gen, gen.controls.find((control) => control.cc === 18), { 72: 1 }), /sample rate/);
});
