import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizers } from '../instrument-synths.js';
import { controlMessages, noteMessage, presetMessages } from '../midi.js';

const synth = (id) => synthesizers.find((s) => s.id === id);
const parameter = (id, protocol, number) => synth(id).controls.find((c) => c.protocol === protocol && c.number === number);
const ccNumbers = (id) => synth(id).controls.filter((c) => c.protocol === 'cc').map((c) => c.number).sort((a, b) => a - b);

test('four model-specific surfaces have valid complete descriptors and safe wire ranges', () => {
  assert.deepEqual(synthesizers.map((s) => s.id), ['deepmind-12', 'microfreak', 'tr-8s', 'pro-vs-mini']);
  for (const s of synthesizers) {
    assert.equal(s.category, 'synths');
    assert.match(s.manualUrl, /^https:\/\//);
    assert.match(s.mainManualUrl, /^https:\/\//);
    assert.ok(s.connection && s.limitations.length && s.controls.some((c) => c.physical));
    assert.ok(Number.isInteger(s.defaultChannel) && s.defaultChannel >= 1 && s.defaultChannel <= 16);
    for (const key of ['surface', 'ink', 'accent', 'knob']) assert.match(s.appearance[key], /^#[a-f\d]{6}$/i);
    assert.ok(['keyboard', 'drum', 'wide'].includes(s.appearance.layout));
    assert.equal(new Set(s.controls.map((c) => c.id)).size, s.controls.length);
    assert.equal(new Set(s.controls.map((c) => `${c.protocol}-${c.number}`)).size, s.controls.length);
    for (const c of s.controls) {
      assert.ok(c.name && c.section && c.hint, c.id);
      assert.ok(Number.isInteger(c.number) && c.number >= 0 && c.number <= (c.protocol === 'nrpn' ? 16383 : 127));
      assert.ok(Number.isInteger(c.min) && Number.isInteger(c.max) && c.min <= c.max, c.id);
      assert.equal(typeof c.physical, 'boolean');
      if (c.kind !== 'action') assert.ok(Number.isInteger(c.initial) && c.initial >= c.min && c.initial <= c.max, c.id);
      if (c.kind === 'select') {
        assert.ok(c.choices.some((o) => o.value === c.initial), c.id);
        assert.equal(new Set(c.choices.map((o) => o.value)).size, c.choices.length);
        for (const o of c.choices) assert.ok(Number.isInteger(o.value) && o.value >= c.min && o.value <= c.max && o.label);
      }
      if (c.kind === 'toggle') assert.deepEqual([c.offValue, c.onValue], [0, c.max]);
      const values = c.kind === 'select' ? c.choices.map((o) => o.value)
        : c.kind === 'toggle' ? [c.offValue, c.onValue]
          : c.kind === 'action' ? [c.value] : [c.min, c.max];
      for (const channel of [1, 10, 16]) {
        for (const value of values) {
          const batch = controlMessages(channel, c, value);
          assert.ok(batch.length > 0);
          for (const bytes of batch) {
            assert.equal(bytes[0], 0xb0 + channel - 1);
            assert.equal(bytes.length, 3);
            for (const data of bytes.slice(1)) assert.ok(Number.isInteger(data) && data >= 0 && data <= 127);
          }
        }
      }
      assert.throws(() => controlMessages(1, c, c.max + 1), RangeError);
      assert.throws(() => controlMessages(1, c, c.min - 1), RangeError);
    }
  }
});

test('DeepMind §17 includes each of the 242 NRPN addresses without CC synthesis aliases', () => {
  const nrpns = synth('deepmind-12').controls.filter((c) => c.protocol === 'nrpn');
  assert.deepEqual(nrpns.map((c) => c.number).sort((a, b) => a - b), Array.from({ length: 242 }, (_, i) => i));
  assert.ok(nrpns.every((c) => c.dataBits === 14));
  assert.deepEqual(ccNumbers('deepmind-12'), [0, 1, 2, 4, 7, 8, 10, 11, 32, 64, 113, 115, 116, 117, 120, 121, 122, 123, 124, 125, 126, 127]);
  // Addresses 5 and 12 intentionally differ: the published range for LFO1 is contradictory.
  assert.equal(parameter('deepmind-12', 'nrpn', 5).max, 1);
  assert.equal(parameter('deepmind-12', 'nrpn', 12).max, 255);
  assert.equal(parameter('deepmind-12', 'nrpn', 39).max, 255);
  assert.equal(parameter('deepmind-12', 'nrpn', 85).choices.length, 13);
});

test('DeepMind narrow selectors require data-entry LSB and 8-bit parameters are not scaled', () => {
  assert.deepEqual(controlMessages(16, parameter('deepmind-12', 'nrpn', 155), 1), [
    [0xbf, 99, 1], [0xbf, 98, 27], [0xbf, 6, 0], [0xbf, 38, 1],
  ]);
  assert.deepEqual(controlMessages(2, parameter('deepmind-12', 'nrpn', 39), 255), [
    [0xb1, 99, 0], [0xb1, 98, 39], [0xb1, 6, 1], [0xb1, 38, 127],
  ]);
  assert.deepEqual(controlMessages(1, parameter('deepmind-12', 'nrpn', 241), 128), [
    [0xb0, 99, 1], [0xb0, 98, 113], [0xb0, 6, 1], [0xb0, 38, 0],
  ]);
  assert.equal(parameter('deepmind-12', 'nrpn', 241).min, 80);
  assert.throws(() => controlMessages(1, parameter('deepmind-12', 'nrpn', 241), 79), RangeError);
});

test('DeepMind matrix, sequence, FX and text parameter families have exact extents', () => {
  for (let bus = 0; bus < 8; bus++) {
    assert.equal(parameter('deepmind-12', 'nrpn', 93 + bus * 3).max, 22);
    const destinations = parameter('deepmind-12', 'nrpn', 94 + bus * 3).choices;
    assert.equal(destinations.length, 130);
    assert.equal(destinations[78].label, 'FX 1 · parâmetro 1');
    assert.equal(destinations[125].label, 'FX 4 · parâmetro 12');
    assert.equal(destinations[129].label, 'Nível FX 4');
    assert.equal(parameter('deepmind-12', 'nrpn', 95 + bus * 3).max, 255);
  }
  for (let n = 123; n <= 154; n++) assert.equal(parameter('deepmind-12', 'nrpn', n).max, 255);
  assert.equal(parameter('deepmind-12', 'nrpn', 118).choices.length, 16);
  assert.equal(parameter('deepmind-12', 'nrpn', 158).choices.length, 13);
  assert.equal(parameter('deepmind-12', 'nrpn', 119).choices[31].label, '32 passos');
  assert.equal(parameter('deepmind-12', 'nrpn', 162).choices[64].label, 'Utilizador 32');
  assert.equal(parameter('deepmind-12', 'nrpn', 165).choices.length, 10);
  for (let slot = 0; slot < 4; slot++) {
    const start = 166 + slot * 13;
    assert.equal(parameter('deepmind-12', 'nrpn', start).choices.length, 34);
    for (let n = start + 1; n <= start + 12; n++) assert.equal(parameter('deepmind-12', 'nrpn', n).max, 255);
    assert.equal(parameter('deepmind-12', 'nrpn', 218 + slot).max, 150);
  }
  for (let n = 223; n <= 239; n++) {
    assert.equal(parameter('deepmind-12', 'nrpn', n).max, 127);
    assert.equal(parameter('deepmind-12', 'nrpn', n).choices[0].label, 'Terminar nome');
  }
  assert.equal(parameter('deepmind-12', 'nrpn', 240).max, 16);
  assert.deepEqual(synth('deepmind-12').presets, { count: 128, offset: 0 });
});

test('MicroFreak appendix D exposes all 21 CCs without speculative NRPN or oscillator buckets', () => {
  assert.deepEqual(ccNumbers('microfreak'), [2, 5, 9, 10, 12, 13, 23, 24, 26, 28, 29, 64, 83, 91, 92, 93, 94, 102, 103, 105, 106]);
  assert.ok(synth('microfreak').controls.every((c) => c.protocol === 'cc' && c.max === 127));
  assert.equal(parameter('microfreak', 'cc', 9).kind, 'range');
  assert.equal(parameter('microfreak', 'cc', 92).kind, 'range');
  assert.equal(parameter('microfreak', 'cc', 64).onValue, 127);
  assert.equal(synth('microfreak').transport, undefined);
});

test('TR-8S receive chart covers precisely 53 CCs, excluding transmit-only fill controls', () => {
  assert.deepEqual(ccNumbers('tr-8s'), [9,12,15,16,17,18,19,20,23,24,25,28,29,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,71,80,81,82,83,84,85,86,87,88,91,96,97,102,103,104,105,106,107,108,109,110]);
  assert.equal(parameter('tr-8s', 'cc', 14), undefined);
  assert.equal(parameter('tr-8s', 'cc', 70), undefined);
  assert.equal(parameter('tr-8s', 'cc', 123), undefined);
  assert.equal(synth('tr-8s').pitchBend, undefined);
  assert.equal(synth('tr-8s').defaultChannel, 10);
  assert.deepEqual(synth('tr-8s').transport, { start: true, stop: true, continue: true });
  for (const n of [19,96,97,102,103,104,105,106,107,108,109,110]) assert.match(parameter('tr-8s', 'cc', n).hint, /atribui/);
  assert.deepEqual(presetMessages(10, 1, synth('tr-8s').presets), [[0xc9, 0]]);
  assert.deepEqual(presetMessages(10, 128, synth('tr-8s').presets), [[0xc9, 127]]);
});

test('TR-8S default main/ALT note pairs match official chart and remain configurable', () => {
  assert.deepEqual(synth('tr-8s').notes.pads.map((p) => p.note), [36,35,38,40,43,41,47,45,50,48,37,56,39,54,42,44,46,55,49,61,51,63]);
  for (const { note } of synth('tr-8s').notes.pads) {
    assert.deepEqual(noteMessage(10, note, 100), [0x99, note, 100]);
    assert.deepEqual(noteMessage(10, note, 0, false), [0x89, note, 0]);
  }
  assert.match(synth('tr-8s').connection, /reatribuíveis/);
  assert.ok(!synth('tr-8s').notes.pads.some((p) => p.name.includes('TRIGGER')));
});

test('PRO-VS v2 chart includes all 34 real CCs with exact effective ranges', () => {
  assert.deepEqual(ccNumbers('pro-vs-mini'), [1,5,9,24,25,26,27,28,47,54,55,70,71,72,73,74,81,82,83,84,85,86,87,88,91,92,111,112,113,114,115,116,117,118]);
  for (const c of synth('pro-vs-mini').controls) {
    assert.equal(c.protocol, 'cc');
    assert.equal(c.max, c.number === 5 ? 31 : [1,9,24,25,26,27,47,54,55].includes(c.number) ? 127 : 99);
  }
  assert.deepEqual(parameter('pro-vs-mini', 'cc', 9).choices.map((o) => o.value), [0,43,85]);
  assert.equal(parameter('pro-vs-mini', 'cc', 118).physical, false);
  assert.match(parameter('pro-vs-mini', 'cc', 118).hint, /repete/);
  assert.equal(parameter('pro-vs-mini', 'cc', 54).kind, 'range');
  assert.equal(synth('pro-vs-mini').transport, undefined);
  assert.equal(synth('pro-vs-mini').presets, undefined);
  assert.equal(parameter('pro-vs-mini', 'cc', 16), undefined); // no guessed joystick
  assert.equal(parameter('pro-vs-mini', 'cc', 7), undefined); // no guessed master volume
});

test('verified DeepMind and MicroFreak PC recall is bounded to the current bank without guessed selectors', () => {
  for (const id of ['deepmind-12', 'microfreak']) {
    const s = synth(id);
    assert.deepEqual(s.presets, { count: 128, offset: 0 });
    assert.equal(s.presetMessages, undefined);
    for (const ch of [1, 16]) {
      assert.deepEqual(presetMessages(ch, 1, s.presets), [[0xc0 + ch - 1, 0]]);
      assert.deepEqual(presetMessages(ch, 128, s.presets), [[0xc0 + ch - 1, 127]]);
      assert.throws(() => presetMessages(ch, 129, s.presets), RangeError);
    }
    assert.ok(s.limitations.some((text) => text.includes('banco atual')));
  }
  assert.equal(synth('microfreak').pitchBend, true);
  assert.equal(synth('microfreak').transport, undefined);
  assert.equal(synth('pro-vs-mini').presets, undefined);
});

test('DeepMind FX and controller-reset hooks only mark coupled values stale and never invent readback', () => {
  for (let slot = 0; slot < 4; slot++) {
    const start = 166 + slot * 13;
    const c = parameter('deepmind-12', 'nrpn', start);
    const state = { [`nrpn-${start + 1}`]: 42, 'nrpn-39': 99 };
    const original = { ...state }, stale = new Set(['nrpn-39']);
    c.apply(state, 1, stale);
    assert.deepEqual(state, original);
    assert.deepEqual([...stale], ['nrpn-39', ...Array.from({ length: 12 }, (_, i) => `nrpn-${start + 1 + i}`), `nrpn-${218 + slot}`]);
    assert.notEqual(c.invalidatesState, true);
  }
  const reset = parameter('deepmind-12', 'cc', 121);
  const state = { 'cc-1': 100, 'nrpn-39': 200 }, original = { ...state }, stale = new Set();
  reset.apply(state, 0, stale);
  assert.deepEqual(state, original);
  assert.deepEqual([...stale], [1,2,4,7,8,10,11,64,115,116,117].map((n) => `cc-${n}`));
  assert.ok(!stale.has('nrpn-39'));
  for (const s of synthesizers) assert.doesNotMatch(s.subtitle, /\b(?:CC|NRPN)\b/);
});
