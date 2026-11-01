import test from 'node:test';
import assert from 'node:assert/strict';
import { instruments } from '../instruments.js';
import { instrumentPanels, panelControlIds, menuControls } from '../instrument-panels.js';

for (const instrument of instruments) {
  test(`${instrument.name}: physical actuators and contextual menus cover the verified MIDI catalog`, () => {
    const panel = instrumentPanels[instrument.id];
    assert.ok(panel.source.startsWith('https://'));
    assert.ok(panel.width > 0 && panel.ratio > 0);
    const controls = new Set(instrument.controls.map((control) => control.id));
    const bindings = panel.slots.flatMap((slot) => slot.ids || []);
    assert.equal(new Set(bindings).size, bindings.length);
    for (const id of panelControlIds(panel)) assert.ok(controls.has(id), id);
    for (const slot of panel.slots) {
      assert.ok(slot.x >= 0 && slot.y >= 0 && slot.x + slot.w <= 100 && slot.y <= 110, slot.label);
      if (slot.reference) assert.equal(slot.ids, undefined);
      if (slot.bank) assert.equal(slot.ids.length, panel.banks.find((bank) => bank.id === slot.bank).labels.length);
    }
    for (const control of instrument.controls) {
      assert.ok(panelControlIds(panel).has(control.id) || panel.menus.some((menu) => menuControls(instrument, panel, menu).includes(control)), control.id);
    }
    for (const menu of panel.menus) assert.ok(menu.library && instrument.presets || menuControls(instrument, panel, menu).length, menu.id);
  });
}
test('shared hardware blocks reproduce actual actuator counts rather than catalog parameter counts', () => {
  const slots = (id, bank) => instrumentPanels[id].slots.filter((slot) => slot.bank === bank);
  assert.equal(slots('deepmind-12', 'envelope').length, 4);
  assert.equal(slots('pro-vs-mini', 'envelope').length, 4);
  assert.equal(slots('pro-vs-mini', 'oscillator').length, 2);
  assert.equal(slots('pro-vs-mini', 'lfo').length, 2);
  assert.equal(instrumentPanels['tr-8s'].slots.filter((slot) => slot.visual === 'fader').length, 11);
  assert.equal(instrumentPanels['boss-sl-2'].slots.every((slot) => slot.reference), true);
  assert.equal(instrumentPanels['deepmind-12'].notes.count, 49);
  assert.equal(instrumentPanels.microfreak.notes.count, 25);
  assert.equal(instrumentPanels['pro-vs-mini'].notes.count, 27);
});
