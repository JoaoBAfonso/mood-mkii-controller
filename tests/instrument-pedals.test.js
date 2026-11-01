import test from 'node:test';
import assert from 'node:assert/strict';
import { additionalPedals } from '../instrument-pedals.js';

const pedal = (id) => additionalPedals.find((entry) => entry.id === id);
const control = (id, number) => pedal(id).controls.find((entry) => entry.number === number);
const ccNumbers = (id) => [...new Set(pedal(id).controls.map((entry) => entry.number))].sort((a, b) => a - b);

test('six verified pedal descriptors have safe data, references and local help', () => {
  assert.equal(additionalPedals.length, 6);
  assert.deepEqual(additionalPedals.map(({ visualization }) => visualization), ['slicer', 'tape', 'modulation', 'eq', 'delay', 'reverb']);
  assert.equal(new Set(additionalPedals.map(({ id }) => id)).size, 6);
  for (const entry of additionalPedals) {
    assert.equal(entry.category, 'pedals');
    assert.ok(entry.manualUrl.startsWith('https://'));
    assert.ok(entry.mainManualUrl.startsWith('https://'));
    assert.ok(entry.connection.length > 80);
    assert.ok(entry.defaultChannel >= 1 && entry.defaultChannel <= 16);
    assert.equal(new Set(entry.controls.map(({ id }) => id)).size, entry.controls.length);
    assert.equal(entry.notes, undefined);
    assert.equal(entry.pads, undefined);
    assert.ok(entry.controls.some(({ physical }) => physical === true));
    for (const item of entry.controls) {
      assert.equal(item.protocol, 'cc');
      assert.ok(Number.isInteger(item.number) && item.number >= 0 && item.number <= 127);
      assert.ok(item.min >= 0 && item.max <= 127 && item.max >= item.min);
      assert.ok(Number.isInteger(item.min) && Number.isInteger(item.max));
      assert.ok(item.section && item.hint);
      if (item.kind === 'action') {
        assert.equal('initial' in item, false);
        assert.ok(item.value >= item.min && item.value <= item.max);
      } else assert.ok(Number.isInteger(item.initial) && item.initial >= item.min && item.initial <= item.max);
      for (const option of item.choices || []) assert.ok(option.value >= item.min && option.value <= item.max);
    }
  }
});

test('SL-2 only exposes three documented CCs, clock transport, no phantom presets', () => {
  assert.deepEqual(ccNumbers('boss-sl-2'), [16, 80, 81]);
  assert.equal(pedal('boss-sl-2').presets, undefined);
  assert.deepEqual(pedal('boss-sl-2').transport, { start: true, stop: true, continue: true });
  assert.equal(control('boss-sl-2', 80).kind, 'range');
  assert.match(pedal('boss-sl-2').limitations.join(' '), /no threshold of 64 is assumed/);
});

test('Deco v2 exact map, one-based switches, clock division and 299 writable slots', () => {
  const id = 'strymon-deco-v2';
  assert.deepEqual(ccNumbers(id), [0,10,11,12,13,14,15,16,17,18,19,20,21,22,23,25,33,60,63,93,97,100]);
  assert.deepEqual(control(id, 11).choices.map(({ value }) => value), [1, 2]);
  assert.deepEqual(control(id, 17).choices.map(({ value }) => value), [1, 2, 3]);
  assert.deepEqual(control(id, 25).choices.map(({ label }) => label), ['×2/3','×1','×2','×3','×4','×6','×8']);
  assert.equal(pedal(id).presets.count, 299);
  assert.deepEqual(pedal(id).presetMessages(2, 127), [[0xb1, 0, 0], [0xc1, 126]]);
  assert.deepEqual(pedal(id).presetMessages(2, 128), [[0xb1, 0, 1], [0xc1, 0]]);
  assert.deepEqual(pedal(id).presetMessages(16, 299), [[0xbf, 0, 2], [0xcf, 43]]);
  assert.deepEqual(pedal(id).controls.find(({ id }) => id === 'manual-mode').messages(1), [[0xb0, 0, 0], [0xc0, 127]]);
  assert.throws(() => pedal(id).presetMessages(1, 300), RangeError);
});

test('Mobius complete revision F map, algorithm limits and inverted A/B footswitches', () => {
  const id = 'strymon-mobius';
  assert.deepEqual(ccNumbers(id), [0,9,15,16,17,18,19,21,22,24,25,26,28,29,30,31,32,34,35,36,37,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,80,81,82,93,100,102,105,106,107,108,109,110,111,112,113,114,115,125]);
  assert.equal(control(id, 19).choices[11].label, 'Quadrature');
  for (const [number, max] of [[24,5],[44,6],[46,3],[49,7],[57,22],[59,20],[105,17],[106,18],[115,4]]) {
    assert.equal(control(id, number).max, max);
  }
  assert.equal(control(id, 80).onValue, 0);
  assert.equal(control(id, 80).offValue, 127);
  assert.equal(control(id, 82).onValue, 0);
  assert.equal(control(id, 70).onValue, 1);
  assert.equal(control(id, 70).max, 1);
  assert.equal(control(id, 28).choices[4].label, 'Digital');
  assert.equal(control(id, 44).choices[6].label, 'Barber Pole');
  assert.equal(control(id, 59).choices[20].label, '32 bit');
  assert.equal(control(id, 61).choices[0].label, '750 Hz');
  assert.equal(control(id, 61).choices[20].label, '96 kHz');
  assert.deepEqual(pedal(id).presetMessages(1, 129), [[0xb0,0,1],[0xc0,0]]);
  assert.deepEqual(pedal(id).presetMessages(1, 200), [[0xb0,0,1],[0xc0,71]]);
  assert.deepEqual(pedal(id).transport, { start: true });
});

test('EQ2 factory map covers both channels without assigning undocumented custom CCs', () => {
  const id = 'source-audio-eq2';
  assert.equal(pedal(id).controls.filter(({ physical }) => physical).length, 21);
  for (let index = 0; index < 20; index++) {
    assert.deepEqual(control(id, 3 + index).eqBand, { channel: Math.floor(index / 10) + 1, band: index % 10 + 1 });
    assert.equal(control(id, 23 + index).physical, false);
    assert.equal(control(id, 43 + index).physical, false);
  }
  assert.deepEqual(ccNumbers(id), [...Array.from({ length: 63 }, (_, i) => i),69,70,71,72,73,80,82,83,94,100,101,102,103,104]);
  for (const number of [3,12,13,22,69,70]) {
    assert.equal(control(id, number).max, 36);
    assert.equal(control(id, number).initial, 18);
    assert.equal(control(id, number).label(0), '-18 dB');
    assert.equal(control(id, number).label(36), '18 dB');
  }
  for (const number of [43,52,53,62]) {
    assert.equal(control(id, number).max, 95);
    assert.equal(control(id, number).label(5), 'Q 1.0');
    assert.equal(control(id, number).label(95), 'Q 10.0');
    assert.equal(control(id, number).label(0), 'Q 0.5');
    assert.equal(control(id, number).label(42), 'Between documented Q points');
  }
  assert.equal(control(id, 71).max, 28);
  assert.equal(control(id, 73).choices[4].label, 'Cascade');
  assert.equal(control(id, 83).kind, 'action');
  assert.match(control(id, 83).hint, /any number/);
  assert.match(pedal(id).limitations.join(' '), /have no factory CCs/);
});

test('Nemesis ADT excludes conflicting legacy engine indices and reserved CC4', () => {
  const id = 'source-audio-nemesis-adt';
  assert.deepEqual(ccNumbers(id), [1,2,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,39,40,41,42,50,51,80,82,93,97,101,102,103,104]);
  assert.equal(control(id, 38), undefined);
  assert.match(pedal(id).limitations.join(' '), /CC38 is a bypass alias/);
  assert.match(pedal(id).mainManualUrl, /nemesis_adt_user_manual/);
  assert.deepEqual(control(id, 1).choices.map(({ value }) => value), [0,1,2,3,4,6,7,8,11,13,14,15,16,17,18,19,20,21,22]);
  const pitch = control(id, 24);
  assert.equal(pitch.choices.length, 126);
  assert.equal(pitch.choices[0].label, '31 semitones');
  assert.equal(pitch.choices[31].label, '0 semitones');
  assert.equal(pitch.choices[62].label, '-31 semitones');
  assert.equal(pitch.choices[63].label, 'Reverse · -31 semitones');
  assert.equal(pitch.choices[94].label, 'Reverse · 0 semitones');
  assert.equal(pitch.choices[125].label, 'Reverse · 31 semitones');
  assert.equal(control(id, 35).max, 6);
  assert.equal(control(id, 50).max, 125);
  assert.equal(control(id, 42).choices.length, 15);
  assert.equal(control(id, 42).initial, 6);
  assert.equal(control(id, 39).choices.length, 15);
  assert.equal(pedal(id).transport, undefined);
});

test('Empress sparse mode packing, real save CC and exact footswitch values', () => {
  const id = 'empress-reverb';
  assert.deepEqual(ccNumbers(id), [10,11,20,21,22,23,24,25,26,27,35,36,37,38,39,51,60]);
  const modes = control(id, 20).choices;
  assert.equal(modes.find(({ value }) => value === 9).label, 'Studio Plate');
  assert.equal(modes.find(({ value }) => value === 20).label, 'Spring + Trem');
  assert.equal(modes.find(({ value }) => value === 50).label, 'Freezification');
  assert.equal(modes.find(({ value }) => value === 90).label, 'Destroyer Pad');
  assert.equal(modes.some(({ value }) => value === 7), false);
  assert.equal(modes.length, 34);
  assert.deepEqual(control(id, 35).choices.map(({ value }) => value), [0,64,127]);
  assert.equal(control(id, 39).max, 35);
  assert.ok(control(id, 39).confirmation);
  assert.deepEqual(pedal(id).presets, { count: 35, offset: 1 });
});

test('CC102 reconciles canonical bypass once for any payload without guessing unknown state', () => {
  for (const id of ['source-audio-eq2', 'source-audio-nemesis-adt']) {
    const command = control(id, 102);
    for (const payload of [0, 63, 64, 127]) {
      for (const [before, after] of [[0,127],[63,127],[64,0],[127,0]]) {
        const state = { 'cc-101': before, 'cc-5': 19 };
        assert.equal(command.apply(state, payload), state);
        assert.deepEqual(state, { 'cc-101': after, 'cc-5': 19 });
      }
      const unknown = { 'cc-5': 19 };
      command.apply(unknown, payload);
      assert.deepEqual(unknown, { 'cc-5': 19 });
      const cached = { 'cc-101': 127, 'cc-5': 19 };
      const stale = new Set(['cc-101']);
      command.apply(cached, payload, stale);
      assert.deepEqual(cached, { 'cc-101': 127, 'cc-5': 19 });
      assert.deepEqual([...stale], ['cc-101']);
      const known = { 'cc-101': 127 };
      command.apply(known, payload, new Set(['cc-5']));
      assert.equal(known['cc-101'], 0);
    }
  }
  assert.equal(pedal('strymon-deco-v2').controls.find(({ id }) => id === 'manual-mode').invalidatesState, true);
  assert.equal(control('empress-reverb', 39).invalidatesState, undefined);
});

test('hardware panels and uncalibrated ranges expose meaningful endpoint metadata', () => {
  for (const entry of additionalPedals) {
    assert.ok(entry.panelOrder.length);
    for (const item of entry.controls) {
      assert.ok(entry.panelOrder.includes(item.section), `${entry.id}: ${item.section}`);
      if (item.kind === 'range') {
        assert.equal(item.endpoints.length, 2);
        assert.ok(item.endpoints.every((label) => label && !/%|CC\d|MIDI \d/.test(label)));
        assert.ok(item.optionsHint);
      }
    }
  }
  assert.deepEqual(control('strymon-deco-v2', 20).endpoints, ['Reference Deck', 'Lag Deck']);
  assert.deepEqual(control('source-audio-nemesis-adt', 26).endpoints, ['Left', 'Right']);
  assert.deepEqual(control('source-audio-eq2', 23).endpoints, ['20 Hz', '20 kHz']);
  assert.deepEqual(control('source-audio-eq2', 43).endpoints, ['Q 0.5', 'Q 10.0']);
  assert.equal(control('source-audio-eq2', 3).visual, 'fader');
  assert.equal(control('strymon-mobius', 19).visual, 'encoder');
  assert.equal(control('strymon-mobius', 80).visual, 'footswitch');
  assert.equal(control('strymon-deco-v2', 11).visual, 'toggle');
  assert.deepEqual(pedal('strymon-mobius').controls.filter(({ section }) => section === 'Knobs').map(({ number }) => number), [19,17,18,15,9,16]);
  assert.deepEqual(pedal('strymon-deco-v2').panelOrder.slice(0, 2), ['Tape Saturation', 'Doubletracker']);
  assert.deepEqual(ccNumbers('boss-sl-2'), [16,80,81]);
});
