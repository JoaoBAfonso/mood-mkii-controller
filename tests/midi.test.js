import test from 'node:test';
import assert from 'node:assert/strict';
import { controls, controlValueLabel, controlEndpoints, hiddenPedalMap } from '../controls.js';
import { ccMessage, pcMessage, noteMessage, sendMessage } from '../midi.js';

test('every documented CC appears exactly once, including legacy tap and synth CC0', () => {
  const expected = [0,1,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,31,32,33,51,52,53,54,55,56,57,58,59,61,62,63,64,65,66,67,68,71,72,73,74,75,76,77,78,80,81,82,83,84,93,100,102,103,104,105,106,107,110,111];
  assert.deepEqual(controls.map((c) => c.cc).sort((a,b) => a-b), expected);
});
test('CC encoding works on every MIDI channel and value boundary', () => {
  for (let ch = 1; ch <= 16; ch++) {
    assert.deepEqual(ccMessage(ch, 14, 0), [0xb0 + ch - 1, 14, 0]);
    assert.deepEqual(ccMessage(ch, 106, 127), [0xb0 + ch - 1, 106, 127]);
  }
  assert.deepEqual(ccMessage(2, 0, 64), [0xb1, 0, 64]);
});
test('invalid channels, values and presets cannot reach hardware', () => {
  for (const value of [-1, 128, 1.5, NaN, '64']) assert.throws(() => ccMessage(2, 14, value), RangeError);
  for (const ch of [0, 17, 2.5]) assert.throws(() => ccMessage(ch, 14, 64), RangeError);
  assert.throws(() => pcMessage(2, 123), RangeError);
  assert.deepEqual(pcMessage(2, 0), [0xc1, 0]);
  assert.deepEqual(pcMessage(2, 122), [0xc1, 122]);
});
test('routing, sync and buffer use the exact manual values, not generic booleans', () => {
  assert.deepEqual(controls.find((c) => c.cc === 31).choices, [
    { value: 0, label: 'Loop → Wet' }, { value: 2, label: 'No sync' }, { value: 3, label: 'Wet → Loop' },
  ]);
  assert.deepEqual(controls.find((c) => c.cc === 33).choices.map((o) => o.value), [0, 2]);
  assert.deepEqual(controls.find((c) => c.cc === 22).choices.map((o) => o.value), [0, 2, 3]);
});
test('demo never sends and missing/disconnected ports fail explicitly', () => {
  const sent = [];
  const port = { state: 'connected', send: (message) => sent.push(message) };
  const message = ccMessage(2, 14, 64);
  assert.equal(sendMessage(port, message, true), 'demo');
  assert.equal(sent.length, 0);
  assert.throws(() => sendMessage(null, message));
  assert.throws(() => sendMessage({ state: 'disconnected' }, message));
  assert.equal(sendMessage(port, message), 'sent');
  assert.deepEqual(sent, [message]);
  assert.throws(() => sendMessage({ state: 'connected', send() { throw new Error('hardware failure'); } }, message), /hardware failure/);
});
test('note on and note off are paired on the requested channel', () => {
  assert.deepEqual(noteMessage(2, 60, 100), [0x91, 60, 100]);
  assert.deepEqual(noteMessage(2, 60, 0, false), [0x81, 60, 0]);
});
test('destructive operations require confirmation and never form part of connection', () => {
  for (const cc of [56, 110, 111]) assert.ok(controls.find((c) => c.cc === cc).confirmation);
});
test('stepped sample rate and mode-dependent speed labels cover all CC values', () => {
  for (let value = 0; value <= 127; value++) {
    assert.ok(controlValueLabel(18, value, {}));
    assert.ok(controlValueLabel(19, value, { 23: 2 }));
    assert.ok(controlValueLabel(19, value, { 23: 3 }));
  }
  assert.equal(controlValueLabel(18, 127, {}), '64k Hz');
  assert.equal(controlValueLabel(19, 70, { 23: 3 }), 'Stalled');
});
test('Hidden maps each physical position to its dedicated CC from the manual', () => {
  assert.deepEqual(hiddenPedalMap, { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 21: 31, 22: 32, 23: 33 });
  for (const cc of Object.values(hiddenPedalMap)) assert.ok(controls.some((control) => control.cc === cc));
  assert.equal(controlValueLabel(25, 54, {}), 'Square');
  assert.equal(controlValueLabel(25, 55, {}), 'Sine');
  assert.equal(controlValueLabel(25, 127, {}), 'Random');
});
test('MOOD endpoint labels retain musical modes and documented sample-rate steps', () => {
  assert.deepEqual(controlEndpoints(19, { 23: 2 }), ['−4×', '+4×']);
  assert.deepEqual(controlEndpoints(19, { 23: 3 }), ['Reverse', 'Forward']);
  assert.equal(controlValueLabel(15, 0, {}), 'Dry');
  assert.equal(controlValueLabel(15, 64, {}), 'Mid');
  assert.equal(controlValueLabel(15, 127, {}), 'Wet');
  assert.equal(controlValueLabel(18, 5, {}), '3k Hz');
  assert.equal(controlValueLabel(18, 16, {}), '4k Hz');
  assert.equal(controlValueLabel(14, 61, { 51: 1 }), '1/8 triplet');
  assert.equal(controlValueLabel(16, 110, { 51: 1, 23: 2 }), '/2');
});
