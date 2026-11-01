import test from 'node:test';
import assert from 'node:assert/strict';
import { pedals, getPedal } from '../pedals.js';
import { ccMessage } from '../midi.js';

const expected = {
  'lost-found': [14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32,51,52,53,54,56,57,61,62,63,64,65,66,67,68,71,72,73,74,75,76,77,78,93,100,102,103,104,105,106,111,112,113,114],
  'generation-loss-mkii': [14,15,16,17,18,19,20,21,22,23,24,26,27,28,29,32,52,61,62,63,64,65,66,67,68,71,72,73,74,75,76,77,78,100,102,103,104,105,106,107,111],
  'bad-mood': [0,1,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,51,52,53,54,55,56,57,58,59,61,62,63,64,65,66,67,68,71,72,73,74,75,76,77,78,80,81,82,83,84,85,93,100,102,103,104,105,106,110,111],
};
for (const [id, ccList] of Object.entries(expected)) {
  test(`${id}: exact official CC coverage, no duplicates or inherited commands`, () => {
    assert.deepEqual(getPedal(id).controls.map((control) => control.cc).sort((a, b) => a - b), ccList);
  });
}
test('all per-pedal values, ALT mappings and mode selections are valid MIDI data', () => {
  for (const pedal of pedals) {
    for (const control of pedal.controls) {
      if ('initial' in control) assert.doesNotThrow(() => ccMessage(2, control.cc, control.initial));
      for (const choice of control.choices || []) assert.doesNotThrow(() => ccMessage(2, control.cc, choice.value));
      if (control.kind === 'action') assert.doesNotThrow(() => ccMessage(2, control.cc, control.value));
      if ([56, 110, 111].includes(control.cc)) assert.ok(control.confirmation);
    }
    for (const [position, cc] of Object.entries(pedal.hiddenMap)) {
      assert.ok(pedal.controls.some((control) => control.cc === Number(position) && control.group === 'pedal'));
      assert.ok(pedal.controls.some((control) => control.cc === cc));
    }
    for (const mode of pedal.modes) assert.ok(pedal.controls.find((control) => control.cc === mode.cc).choices.some((choice) => choice.value === mode.value));
    assert.ok(pedal.manualUrl.startsWith('https://'));
  }
  assert.equal(getPedal('unknown'), undefined);
});
test('Generation Loss has inverted ALT, exact model points, 1/2/3 toggles and no Synth/Clock', () => {
  const pedal = getPedal('generation-loss-mkii');
  assert.equal(pedal.hiddenOn, 0); assert.equal(pedal.hiddenOff, 1);
  const hidden = pedal.controls.find((control) => control.cc === 104);
  assert.equal(hidden.initial, 1); assert.equal(hidden.onValue, 0); assert.equal(hidden.offValue, 1);
  for (const cc of [21, 22, 23, 32]) assert.deepEqual(pedal.controls.find((control) => control.cc === cc).choices.map((choice) => choice.value), [1, 2, 3]);
  assert.deepEqual(pedal.models.map((model) => model.value), [0,15,24,33,43,53,62,72,82,91,101,111,127]);
  assert.equal(pedal.models.find((model) => model.value === 62).label, 'CAM-8');
  assert.equal(pedal.models.find((model) => model.value === 72).label, 'DICTATRON-EX');
  assert.equal(pedal.synth, false); assert.equal(pedal.clockCc, undefined);
  assert.deepEqual(pedal.controls.find((control) => control.cc === 26).choices.map((choice) => choice.value), [0, 127]);
  assert.equal(pedal.hiddenMap[15], 20); assert.equal(pedal.hiddenMap[22], 32);
});
test('Lost + Found exposes all twelve effects and swaps each channel independently', () => {
  const pedal = getPedal('lost-found');
  const names = new Set();
  for (const cc of [21, 23]) {
    for (const value of [0, 2, 3]) {
      const family = pedal.effects({ [cc]: value }, cc);
      names.add(family[1]); names.add(family[2]);
    }
  }
  assert.equal(names.size, 12);
  assert.equal(pedal.effects({ 21: 2, 74: 1 }, 21)[0], 'SYNTH');
  assert.equal(pedal.effects({ 23: 3, 75: 1 }, 23)[0], 'WARP');
  assert.equal(pedal.effects({ 21: 0, 78: 1 }, 21)[0], 'REVERB');
  for (const cc of [25, 28]) assert.equal(pedal.controls.find((control) => control.cc === cc).kind, 'range');
  assert.equal(pedal.controls.find((control) => control.cc === 53).choices.length, 13);
});
test('BAD MOOD chord labels follow all 48 documented intervals exactly', () => {
  const pedal = getPedal('bad-mood');
  assert.equal(pedal.chords.length, 48);
  for (let index = 0; index < pedal.chords.length; index++) {
    const start = pedal.chords[index].value;
    const end = (pedal.chords[index + 1]?.value ?? 128) - 1;
    for (let value = start; value <= end; value++) assert.equal(pedal.label(17, value, { 21: 3 }), `Acorde ${index + 1}`);
  }
  assert.equal(pedal.label(17, 43, { 21: 3 }), 'Acorde 17');
  assert.deepEqual(pedal.stations.map((station) => station.value), [0,32,63,97,127]);
  assert.equal(pedal.controls.find((control) => control.cc === 25).kind, 'range');
  assert.deepEqual(pedal.controls.find((control) => control.cc === 53).choices.map((choice) => choice.label), ['1/32','1/16','1/8 tercina','1/8','1/4','1/2','1/2 pontuada','1','2']);
  assert.equal(pedal.controls.find((control) => control.cc === 33).name, 'CROSS input');
});
