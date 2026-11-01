import { getInstrument } from './instruments.js?v=3.3.0';
import { controlMessages, presetMessages, noteMessage, pitchBendMessage, sendMessage } from './midi.js?v=3.3.0';
import { createPresetManager } from './presets.js?v=3.3.0';
import { createHelpTooltip } from './tooltip.js?v=3.3.0';
import { instrumentPanels, menuControls, panelControlIds } from './instrument-panels.js?v=3.3.0';

const $ = (id) => document.getElementById(id);
const controlName = (control) => control.name.replace(/\s*·\s*MIDI Value/gi, '');
const instrument = getInstrument(new URLSearchParams(location.search).get('instrument'));
if (!instrument) {
  const error = document.createElement('p');
  error.textContent = 'Unknown instrument. Return to the hub to choose a device.';
  document.querySelector('main').replaceChildren(error);
  throw new Error('Invalid instrument.');
}
document.title = `${instrument.name} · MIDI Studio`;
document.body.dataset.instrument = instrument.id;
document.body.dataset.category = instrument.category;
document.body.classList.add(`layout-${instrument.appearance.layout}`);
for (const [key, value] of Object.entries(instrument.appearance)) {
  if (key !== 'layout') document.body.style.setProperty(`--device-${key}`, value);
}
$('instrument-title').textContent = instrument.name;
$('instrument-subtitle').textContent = instrument.subtitle;
$('instrument-brand').textContent = instrument.brand;
$('hardware-brand').textContent = instrument.brand;
$('hardware-name').textContent = instrument.name;
const panel = instrumentPanels[instrument.id];
if (!panel) throw new Error(`Missing physical panel for ${instrument.name}.`);
document.body.classList.add('replica-page');
for (const [name, value] of Object.entries({ surface: panel.surface, ink: panel.ink, accent: panel.accent })) {
  document.body.style.setProperty(`--device-${name}`, value);
}
$('hardware').style.setProperty('--panel-width', `${panel.width}px`);
$('hardware').style.setProperty('--panel-min-width', `${panel.minWidth || 0}px`);
$('physical-controls').style.aspectRatio = String(panel.ratio);
$('panel-navigation-hint').hidden = !panel.minWidth;
const viewport = document.createElement('div'); viewport.className = 'hardware-viewport';
$('hardware').before(viewport); viewport.append($('hardware'));
const screen = document.createElement('output'); screen.id = 'hardware-screen'; screen.className = `device-display display-${panel.screen?.style || 'status'}`;
screen.textContent = instrument.name;
if (panel.screen) { position(screen, panel.screen); $('physical-controls').append(screen); }
else { screen.classList.add('external-display'); viewport.after(screen); }
$('instrument-edition').textContent = instrument.edition || 'MIDI STUDIO';
$('main-manual-link').href = instrument.mainManualUrl;
$('manual-link').href = instrument.manualUrl;
$('back-label').textContent = instrument.category === 'synths' ? 'Synthesizers' : 'Pedals';
$('back-instruments').href = `./?section=${instrument.category}`;
$('connection-guide').textContent = instrument.connection;
for (const description of instrument.limitations || []) {
  const item = document.createElement('li'); item.textContent = description; $('device-notes').append(item);
}
for (let channel = 1; channel <= 16; channel++) $('channel').add(new Option(String(channel), String(channel)));
$('channel').value = String(instrument.defaultChannel);
let access;
let manager;
let resetBend = () => true;
const help = createHelpTooltip();
const views = new Map();
const contexts = new Map();
const notes = new Map();
const eqBars = new Map();
const localBanks = new Map();
let refreshEq = () => {};
const channel = () => Number($('channel').value);
const output = () => access?.outputs.get($('output').value);
const demo = () => $('demo').checked;
const targetKey = () => demo() ? 'demo' : JSON.stringify([$('output').value, channel()]);
const initial = () => ({
  values: Object.fromEntries(instrument.controls.filter((control) => control.kind !== 'action').map((control) => [control.id, control.initial])),
  preset: '', stale: new Set(),
});
let context = initial();
contexts.set(targetKey(), context);
const notify = (message) => { $('notification').textContent = message; $('notification').hidden = !message; };
function connection() {
  const ready = output()?.state === 'connected';
  $('connection-status').textContent = demo() ? 'Demo' : ready ? 'MIDI output ready' : 'Not connected';
  $('connection-detail').textContent = demo() ? 'Explore without hardware' : ready ? `${output().name || 'MIDI interface'} · channel ${channel()}` : 'Choose an output and channel';
  $('status-dot').classList.toggle('ready', ready && !demo());
  $('status-dot').classList.toggle('demo', demo());
}
function transmit(messages, name, destination = { output: output(), demo: demo() }) {
  try {
    const bytes = messages.flat();
    const result = sendMessage(destination.output, bytes, destination.demo);
    const row = document.createElement('li');
    const title = document.createElement('strong'); title.textContent = name;
    const data = document.createElement('code'); data.textContent = `${result === 'demo' ? 'DEMO' : 'OUT'} · ${bytes.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`;
    row.append(title, data); $('log').prepend(row);
    while ($('log').children.length > 8) $('log').lastChild.remove();
    $('monitor-empty').hidden = true;
    if (![...notes.values()].some((note) => note.pending)) notify('');
    return true;
  } catch (error) { notify(`Could not send: ${error.message}`); return false; }
}
function update(control) {
  const value = context.values[control.id];
  if (eqBars.has(control.id)) {
    const bar = eqBars.get(control.id);
    const center = control.initial;
    const gain = (value - center) / Math.max(1, center - control.min, control.max - center);
    bar.style.setProperty('--gain', String(gain)); bar.classList.toggle('negative', gain < 0);
    bar.classList.toggle('stale', context.stale.has(control.id));
  }
  for (const view of views.get(control.id) || []) {
    view.root.classList.toggle('stale', context.stale.has(control.id));
    if (view.input) view.input.value = value;
    if (view.numeric) view.numeric.value = value;
    if (view.knob) view.knob.style.setProperty('--rotation', `${-135 + (value - control.min) / Math.max(1, control.max - control.min) * 270}deg`);
    if (view.dial && control.choices) {
      const index = control.choices.findIndex((choice) => choice.value === value);
      view.dial.style.setProperty('--rotation', `${-135 + (view.packedModes ? Math.floor(value / 8) / 11 : index / Math.max(1, control.choices.length - 1)) * 270}deg`);
      view.choice.textContent = control.choices[index]?.label || '';
    }
    if (view.readout) {
      const label = control.label?.(value, context.values);
      view.readout.textContent = label || (value === control.min ? control.endpoints?.[0] || 'Minimum' : value === control.max ? control.endpoints?.[1] || 'Maximum' : '');
      view.input?.setAttribute('aria-valuetext', view.readout.textContent || `Between ${(control.endpoints || ['Minimum', 'Maximum']).join(' and ')}`);
    }
    if (view.button && control.kind === 'toggle') {
      const on = value === (control.onValue ?? 127);
      view.button.setAttribute('aria-pressed', String(on)); view.button.classList.toggle('active', on);
      view.button.textContent = on ? 'ON' : 'OFF';
    }
    if (control.eqBand) refreshEq();
  }
}
function change(control, value, confirmed = false, messages) {
  if (control.confirmation && !confirmed) {
    update(control);
    confirm(control.confirmation, () => { if (release()) change(control, value, true, messages); });
    return;
  }
  try {
    if (transmit(messages || controlMessages(channel(), control, value), control.name)) {
      const before = control.apply ? { ...context.values } : undefined;
      const beforeStale = control.apply ? new Set(context.stale) : undefined;
      if (control.kind !== 'action') context.values[control.id] = value;
      if (control.apply) control.apply(context.values, value, context.stale);
      if (control.invalidatesState) {
        context.preset = '';
        context.stale = new Set(instrument.controls.filter((item) => item.kind !== 'action').map((item) => item.id));
        manager?.update();
        instrument.controls.forEach(update);
      } else {
        context.stale.delete(control.id);
        update(control);
        if (before) for (const other of instrument.controls) {
          if (before[other.id] !== context.values[other.id]) { context.stale.delete(other.id); update(other); }
          else if (beforeStale.has(other.id) !== context.stale.has(other.id)) update(other);
        }
      }
      $('state-note').hidden = !context.stale.size;
      const display = control.kind === 'select' ? control.choices.find((choice) => choice.value === value).label : control.label?.(value, context.values);
      $('hardware-screen').textContent = `${controlName(control)}${display ? ` · ${display}` : ''}`;
      help.refresh();
    } else update(control);
  } catch (error) { notify(error.message); update(control); }
}
function confirm(message, callback) {
  const key = targetKey();
  help.hide();
  $('confirm-text').textContent = `${demo() ? 'DEMO MODE: simulation only. ' : ''}${message}`;
  $('confirm-dialog').querySelector('form').onsubmit = (event) => {
    event.preventDefault(); const result = event.submitter?.value;
    $('confirm-dialog').close(result);
    if (result !== 'confirm') return;
    if (key !== targetKey()) { notify('MIDI destination changed. Confirm the command again.'); return; }
    callback();
  };
  $('confirm-dialog').showModal();
}
function makeControl(control, physical = false, surface = physical ? 'hardware' : '', visual = control.visual, faceLabel, printedLegend, packedModes = false, tapSwitch = false) {
  const root = document.createElement('div');
  root.className = `control ${physical ? 'physical-control' : ''} ${control.kind} visual-${visual || 'knob'}`;
  root.dataset.parameter = control.id; root.dataset.protocol = control.protocol; root.dataset.number = control.number;
  root.dataset.search = `${control.name} ${control.hint || ''}`.toLocaleLowerCase('en');
  const id = `${surface ? `${surface}-` : ''}${control.id}`;
  const label = document.createElement('label'); label.htmlFor = id; label.textContent = faceLabel || controlName(control);
  root.append(label);
  const view = { root };
  if (control.kind === 'range') {
    const input = document.createElement('input'); input.type = 'range';
    input.id = id; input.min = control.min; input.max = control.max; input.step = 1;
    input.oninput = () => change(control, Number(input.value));
    const numeric = document.createElement('input'); numeric.type = 'number';
    numeric.min = control.min; numeric.max = control.max; numeric.step = 1;
    numeric.setAttribute('aria-label', `${controlName(control)} MIDI value`);
    numeric.onchange = () => {
      if (!numeric.value || !numeric.validity.valid) { notify(`Choose a whole number from ${control.min} to ${control.max}.`); update(control); return; }
      change(control, Number(numeric.value));
    };
    const readout = document.createElement('output'); readout.className = 'readout';
    const row = document.createElement('div'); row.className = 'value-row'; row.append(readout, numeric);
    root.append(input, row); Object.assign(view, { input, numeric, readout });
    if (physical && visual !== 'fader' && visual !== 'touch') {
      const knob = document.createElement('div'); knob.className = 'knob'; knob.setAttribute('aria-hidden', 'true');
      const mark = document.createElement('span'); mark.className = 'knob-mark'; knob.append(mark);
      knob.onpointerdown = (event) => {
        if (event.button !== 0) return;
        help.hide(); knob.setPointerCapture(event.pointerId);
        const start = context.values[control.id], x = event.clientX, y = event.clientY, key = targetKey();
        const move = (pointer) => {
          if (targetKey() !== key) return;
          const value = Math.round(start + (pointer.clientX - x + y - pointer.clientY) * (control.max - control.min) / 190);
          change(control, Math.max(control.min, Math.min(control.max, value)));
        };
        const stop = () => { knob.removeEventListener('pointermove', move); knob.removeEventListener('lostpointercapture', stop); };
        knob.addEventListener('pointermove', move); knob.addEventListener('lostpointercapture', stop);
      };
      root.prepend(knob); view.knob = knob;
    }
    if (control.kind === 'range') {
      const bounds = document.createElement('div'); bounds.className = 'control-bounds';
      for (const text of control.endpoints || ['Minimum', 'Maximum']) {
        const endpoint = document.createElement('span'); endpoint.textContent = text; bounds.append(endpoint);
      }
      root.append(bounds);
      if (control.optionsHint) {
        const possibilities = document.createElement('p'); possibilities.className = 'control-possibilities'; possibilities.textContent = control.optionsHint; root.append(possibilities);
      }
    }
  } else if (control.kind === 'select') {
    const input = document.createElement('select'); input.id = id;
    for (const choice of control.choices) input.add(new Option(choice.label, String(choice.value)));
    input.onchange = () => change(control, Number(input.value)); root.append(input); view.input = input;
    if (physical && !['toggle', 'button', 'footswitch'].includes(visual)) {
      const dial = document.createElement('div'); dial.className = 'knob selector-dial'; dial.setAttribute('aria-hidden', 'true');
      const mark = document.createElement('span'); mark.className = 'knob-mark'; dial.append(mark); root.prepend(dial);
      const choice = document.createElement('output'); choice.className = 'selected-choice'; root.append(choice);
      Object.assign(view, { dial, choice, packedModes });
      if (visual === 'algorithm') {
        const legend = document.createElement('div'); legend.className = 'algorithm-legend'; legend.setAttribute('aria-hidden', 'true');
        const labels = printedLegend || [...new Set(control.choices.map((choice) => choice.label))].slice(0, 12);
        for (const [index, text] of labels.entries()) {
          const entry = document.createElement('span'); entry.textContent = text;
          entry.style.left = packedModes ? index < 4 ? '12%' : '61%' : index < 6 ? '28%' : '72%';
          entry.style.top = packedModes ? `${index < 4 ? 47 + index * 13 : 4 + (index - 4) * 11}%` : `${10 + index % 6 * 14}%`;
          entry.style.transform = !packedModes && index < 6 ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
          legend.append(entry);
        }
        root.append(legend);
      }
    }
  } else {
    const button = document.createElement('button'); button.type = 'button'; button.id = id;
    button.textContent = control.name; button.setAttribute('aria-label', control.name);
    if (tapSwitch) button.setAttribute('aria-label', `Tap ${faceLabel} footswitch`);
    button.onclick = () => {
      if (tapSwitch) {
        const off = control.offValue ?? 0;
        change(control, off, false, [
          ...controlMessages(channel(), control, control.onValue ?? 127),
          ...controlMessages(channel(), control, off),
        ]);
        return;
      }
      const value = control.kind === 'toggle' ? context.values[control.id] === (control.onValue ?? 127) ? control.offValue ?? 0 : control.onValue ?? 127 : control.value;
      change(control, value);
    };
    root.append(button); view.button = button;
  }
  help.attach(root, () => tapSwitch ? `Tap the ${faceLabel} footswitch. Hold commands are available in Global / Routing.` : control.help ? control.help(context.values) : control.hint || '', control.name);
  if (!views.has(control.id)) views.set(control.id, []);
  views.get(control.id).push(view); update(control);
  return root;
}
const sections = [...new Set(instrument.controls.map((control) => control.section))];
function activate(button) {
  help.hide();
  if (!release()) return;
  for (const tab of $('sections').querySelectorAll('[role=tab]')) {
    const selected = button === tab;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !selected;
  }
  $('search-empty').hidden = true;
}
for (const [index, section] of sections.entries()) {
  const tab = document.createElement('button'); tab.type = 'button'; tab.setAttribute('role', 'tab');
  tab.id = `tab-section-${index}`; tab.setAttribute('aria-controls', `panel-section-${index}`);
  tab.setAttribute('aria-selected', String(index === 0)); tab.tabIndex = index === 0 ? 0 : -1; tab.textContent = section;
  const panel = document.createElement('section'); panel.id = `panel-section-${index}`;
  panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); panel.hidden = index !== 0;
  const heading = document.createElement('h3'); heading.textContent = section;
  const grid = document.createElement('div'); grid.className = 'control-grid';
  for (const control of instrument.controls.filter((item) => item.section === section)) grid.append(makeControl(control));
  panel.append(heading, grid); $('parameter-panels').append(panel);
  tab.onclick = () => { $('control-search').value = ''; filter(); activate(tab); };
  $('sections').append(tab);
}
const eqControls = instrument.controls.filter((control) => control.eqBand);
if (eqControls.length) {
  const eq = document.createElement('section'); eq.className = 'eq-screen';
  position(eq, panel.eq);
  const channelLabel = document.createElement('label'); channelLabel.textContent = 'EQ channel';
  const eqChannel = document.createElement('select'); eqChannel.id = 'eq-channel';
  eqChannel.add(new Option('A', '1')); eqChannel.add(new Option('B', '2')); channelLabel.append(eqChannel);
  const bandLabel = document.createElement('label'); bandLabel.textContent = 'Band';
  const eqBand = document.createElement('select'); eqBand.id = 'eq-band';
  for (let band = 1; band <= 10; band++) eqBand.add(new Option(String(band), String(band)));
  bandLabel.append(eqBand);
  const selectors = document.createElement('div'); selectors.className = 'eq-selectors'; selectors.append(channelLabel, bandLabel);
  const chart = document.createElement('div'); chart.className = 'eq-bars';
  const encoder = document.createElement('div'); encoder.className = 'eq-encoder';
  position(encoder, { x: 34, y: 36, w: 32, h: 20 });
  for (const control of eqControls) {
    const bar = document.createElement('button'); bar.type = 'button'; bar.dataset.parameter = control.id;
    bar.setAttribute('aria-label', `Select band ${control.eqBand.band}, channel ${control.eqBand.channel === 1 ? 'A' : 'B'}`);
    const indicator = document.createElement('i');
    const label = document.createElement('small'); label.textContent = control.eqBand.frequency ? `${control.eqBand.frequency >= 1000 ? `${control.eqBand.frequency / 1000}k` : control.eqBand.frequency}` : String(control.eqBand.band);
    bar.append(indicator, label); bar.onclick = () => { eqBand.value = String(control.eqBand.band); refreshEq(); };
    eqBars.set(control.id, bar); chart.append(bar);
    encoder.append(makeControl(control, true, 'hardware', 'encoder'));
  }
  refreshEq = () => {
    for (const control of eqControls) {
      const channelVisible = Number(eqChannel.value) === control.eqBand.channel;
      const selected = Number(eqBand.value) === control.eqBand.band && channelVisible;
      const bar = eqBars.get(control.id); bar.hidden = !channelVisible; bar.setAttribute('aria-pressed', String(selected));
      for (const view of views.get(control.id) || []) if (view.root.closest('.eq-encoder')) view.root.hidden = !selected;
    }
  };
  eqChannel.onchange = eqBand.onchange = () => { help.hide(); refreshEq(); };
  eq.append(chart, selectors); $('physical-controls').append(eq, encoder);
  eqControls.forEach(update);
}
function position(element, { x, y, w, h }) {
  element.classList.add('panel-position');
  for (const [name, value] of Object.entries({ x, y, w, h })) {
    if (value !== undefined) element.style.setProperty(`--${name}`, `${value}%`);
  }
}
function renderReference(entry) {
  const root = document.createElement('div'); root.className = `hardware-reference reference-${entry.visual}`;
  root.dataset.reference = entry.label; root.setAttribute('role', 'img'); root.setAttribute('aria-label', `${entry.label}: hardware only`);
  const shape = document.createElement('i'); shape.className = 'reference-shape';
  const label = document.createElement('span'); label.textContent = entry.visual === 'boss-treadle' ? 'BOSS' : `${entry.label} ◇`;
  root.append(shape, label); position(root, entry); $('physical-controls').append(root);
}
for (const entry of panel.slots) {
  if (entry.reference) { renderReference(entry); continue; }
  const root = document.createElement('div'); root.className = `actuator actuator-${entry.visual}`;
  if (entry.bank) root.dataset.bank = entry.bank;
  for (const [index, id] of entry.ids.entries()) {
    const control = instrument.controls.find((control) => control.id === id);
    if (!control) throw new Error(`Missing ${instrument.name} binding: ${id}.`);
    const view = makeControl(control, true, 'hardware', entry.visual, entry.label, entry.legend, entry.packedModes, entry.tapSwitch);
    view.dataset.variant = index; view.hidden = index !== 0; root.append(view);
    if (entry.visual === 'footswitch' && control.kind === 'select') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'physical-tap';
      button.textContent = entry.label; button.setAttribute('aria-label', `Tap ${entry.label}`);
      button.onclick = () => change(control, 64);
      view.append(button);
    }
  }
  position(root, entry); $('physical-controls').append(root);
}
for (const entry of panel.references || []) renderReference(entry);
for (const [text, x, y, w, style = 'label'] of panel.markings || []) {
  const label = document.createElement('span'); label.className = `panel-marking marking-${style}`; label.textContent = text;
  position(label, { x, y, w }); $('physical-controls').append(label);
}
for (const entry of panel.banks || []) {
  localBanks.set(entry.id, 0);
  const group = document.createElement('div'); group.className = 'panel-bank'; group.setAttribute('role', 'group');
  group.setAttribute('aria-label', `${entry.id} view`);
  for (const [index, text] of entry.labels.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
    button.dataset.bankChoice = entry.id; button.dataset.variant = index; button.setAttribute('aria-pressed', String(index === 0));
    button.onclick = () => {
      help.hide();
      if (!release()) return;
      localBanks.set(entry.id, index);
      for (const other of group.children) other.setAttribute('aria-pressed', String(other === button));
      for (const view of document.querySelectorAll(`.actuator[data-bank="${entry.id}"]>.control`)) view.hidden = Number(view.dataset.variant) !== index;
    };
    group.append(button);
  }
  position(group, entry); $('physical-controls').append(group);
}
const menuViews = new Map();
function currentMenuPage(entry, page) {
  if (entry.id === 'mobius-machine') {
    const type = instrument.controls.find((control) => control.id === 'cc-19');
    const machine = type.choices.find((choice) => choice.value === context.values[type.id]).label;
    return page.section.toLowerCase() === machine.toLowerCase();
  }
  if (entry.id === 'eq-band') return page.channel === Number($('eq-channel').value) && page.band === Number($('eq-band').value);
  if (entry.id === 'pro-osc') return page.section === `Oscillator ${'ABCD'[localBanks.get('oscillator')]}`;
  if (entry.id === 'deep-curves') return page.section === `${['VCA', 'VCF', 'MOD'][localBanks.get('envelope')]} Envelope`;
  if (entry.id === 'pro-functions' && page.section.startsWith('LFO ')) return page.section === `LFO ${localBanks.get('lfo') + 1}`;
  return true;
}
function openHardwareMenu(entry) {
  help.hide();
  if (!release()) return;
  restoreLibrary();
  $('hardware-menu-title').textContent = entry.title;
  $('hardware-menu-device').textContent = instrument.name;
  $('hardware-menu-pages').replaceChildren();
  for (const container of $('hardware-menu-body').children) container.hidden = true;
  const pages = menuViews.get(entry.id).filter((page) => currentMenuPage(entry, page));
  for (const [index, page] of pages.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = page.title;
    button.setAttribute('aria-pressed', String(index === 0));
    button.onclick = () => {
      help.hide();
      restoreLibrary();
      $('hardware-menu-title').textContent = entry.title;
      for (const container of $('hardware-menu-body').children) container.hidden = container !== page.root;
      for (const other of $('hardware-menu-pages').children) other.setAttribute('aria-pressed', String(other === button));
    };
    $('hardware-menu-pages').append(button);
    page.root.hidden = index !== 0;
  }
  if (!pages.length) {
    $('hardware-menu-empty').hidden = false;
  }
  if (entry.library && instrument.presets) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Preset library';
    button.onclick = () => {
      showHardwareLibrary();
      for (const other of $('hardware-menu-pages').children) other.setAttribute('aria-pressed', String(other === button));
    }; $('hardware-menu-pages').prepend(button);
    if (!pages.length) showHardwareLibrary();
  }
  $('hardware-menu').showModal();
}
const emptyMenu = document.createElement('p'); emptyMenu.id = 'hardware-menu-empty';
emptyMenu.textContent = 'These settings are available on the physical panel. Use the controls on the instrument to change them.';
emptyMenu.hidden = true; $('hardware-menu-body').append(emptyMenu);
for (const entry of panel.menus) {
  const controls = menuControls(instrument, panel, entry);
  const pages = [];
  for (const section of entry.sections) {
    const sectionControls = controls.filter((control) => control.section === section);
    const groups = entry.id === 'eq-band' ? Array.from({ length: 10 }, (_, index) => ({
      controls: sectionControls.filter((control) => [23, 43].some((base) => control.number === base + (section === 'Channel 2' ? 10 : 0) + index)),
      title: `Channel ${section === 'Channel 2' ? 'B' : 'A'} · Band ${index + 1}`,
      channel: section === 'Channel 2' ? 2 : 1, band: index + 1,
    })) : Array.from({ length: Math.ceil(sectionControls.length / 6) }, (_, index) => ({
      controls: sectionControls.slice(index * 6, index * 6 + 6),
      title: sectionControls.length > 6 ? `${section} · ${index + 1}` : section,
    }));
    for (const group of groups) {
      if (!group.controls.length) continue;
      const root = document.createElement('div'); root.className = 'control-grid'; root.hidden = true;
      for (const control of group.controls) root.append(makeControl(control, false, `menu-${entry.id}`));
      $('hardware-menu-body').append(root);
      pages.push({ ...group, section, root });
    }
  }
  menuViews.set(entry.id, pages);
  const button = document.createElement('button'); button.type = 'button'; button.className = 'panel-menu-button';
  button.dataset.menu = entry.id; button.textContent = entry.title;
  button.onclick = () => openHardwareMenu(entry); position(button, entry); $('physical-controls').append(button);
}
function restoreLibrary() {
  if ($('panel-presets').parentElement === $('hardware-menu-body')) {
    $('panel-presets').hidden = $('tab-presets')?.getAttribute('aria-selected') !== 'true';
    $('parameter-inspector').append($('panel-presets'));
    $('panel-presets').setAttribute('role', 'tabpanel');
    $('panel-presets').setAttribute('aria-labelledby', 'tab-presets');
  }
}
function showHardwareLibrary() {
  help.hide();
  if (!release()) return;
  for (const container of $('hardware-menu-body').children) container.hidden = true;
  $('hardware-menu-body').append($('panel-presets')); $('panel-presets').hidden = false;
  $('panel-presets').setAttribute('role', 'region');
  $('panel-presets').removeAttribute('aria-labelledby');
  $('hardware-menu-title').textContent = 'Preset library';
}
$('hardware-menu-close').onclick = () => { help.hide(); $('hardware-menu').close(); };
$('hardware-menu').addEventListener('close', () => { help.hide(); restoreLibrary(); });
$('hardware-menu').addEventListener('cancel', () => help.hide());
if (instrument.presets) {
  $('preset-quick').hidden = false;
  const tab = document.createElement('button'); tab.type = 'button'; tab.id = 'tab-presets'; tab.textContent = 'Presets';
  tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'panel-presets'); tab.setAttribute('aria-selected', 'false'); tab.tabIndex = -1;
  tab.onclick = () => { $('control-search').value = ''; filter(); activate(tab); }; $('sections').append(tab);
  manager = createPresetManager({
    pedal: instrument, panel: $('panel-presets'), quick: $('preset-quick'), current: () => context.preset,
    targetKey, confirm, notify, onChange: () => manager?.update(),
    recall: (slot) => {
      if (!release()) return false;
      try {
        const messages = instrument.presetMessages ? instrument.presetMessages(channel(), slot) : presetMessages(channel(), slot, instrument.presets);
        if (!transmit(messages, slot ? `Load preset ${slot}` : 'Live')) return false;
        context.preset = String(slot);
        context.stale = new Set(instrument.controls.filter((control) => control.kind !== 'action').map((control) => control.id));
        instrument.controls.forEach(update); $('state-note').hidden = false;
        $('hardware-screen').textContent = slot ? `Preset ${slot}` : 'Live';
        return true;
      } catch (error) { notify(error.message); return false; }
    },
  });
  $('open-presets').onclick = () => { $('parameter-inspector').open = true; tab.onclick(); tab.focus(); };
}
$('sections').onkeydown = (event) => {
  const tabs = [...$('sections').querySelectorAll('[role=tab]')];
  const index = tabs.indexOf(document.activeElement);
  let target;
  if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
  if (event.key === 'ArrowLeft') target = tabs[(index - 1 + tabs.length) % tabs.length];
  if (event.key === 'Home') target = tabs[0];
  if (event.key === 'End') target = tabs.at(-1);
  if (target) { event.preventDefault(); target.click(); target.focus(); }
};
function filter() {
  help.hide();
  const query = $('control-search').value.trim().toLocaleLowerCase('en');
  let matches = 0;
  for (const panel of $('parameter-panels').children) {
    let count = 0;
    for (const root of panel.querySelectorAll('.control')) {
      root.hidden = !root.dataset.search.includes(query); if (!root.hidden) count++;
    }
    panel.hidden = query ? count === 0 : $('sections').querySelector('[aria-selected=true]')?.getAttribute('aria-controls') !== panel.id;
    matches += count;
  }
  if (instrument.presets) $('panel-presets').hidden = query ? true : $('tab-presets').getAttribute('aria-selected') !== 'true';
  $('search-empty').hidden = !query || matches > 0;
}
$('control-search').oninput = filter;
$('technical-values').onchange = () => document.body.classList.toggle('technical-view', $('technical-values').checked);
function switchContext() {
  if (!contexts.has(targetKey())) contexts.set(targetKey(), initial());
  context = contexts.get(targetKey()); help.hide(); instrument.controls.forEach(update);
  $('state-note').hidden = !context.stale.size; $('hardware-screen').textContent = context.preset ? `Preset ${context.preset}` : 'MIDI STUDIO';
  manager?.update(); connection();
}
function stopNotes() {
  const hadNotes = notes.size > 0;
  let success = true;
  for (const [key, note] of notes) {
    if (transmit([noteMessage(note.channel, note.note, 0, false)], `Note Off ${note.note}`, note)) {
      notes.delete(key); note.button?.classList.remove('active');
    } else { note.pending = true; success = false; }
  }
  if (success && hadNotes) notify('');
  return success;
}
function noteOn(key, note, button) {
  if (notes.has(key)) return;
  const destination = { channel: channel(), output: output(), demo: demo(), note, button };
  if (transmit([noteMessage(destination.channel, note, Number($('velocity').value))], `Note On ${note}`, destination)) {
    notes.set(key, destination); button.classList.add('active');
  }
}
function noteOff(key) {
  const note = notes.get(key); if (!note) return;
  if (transmit([noteMessage(note.channel, note.note, 0, false)], `Note Off ${note.note}`, note)) { notes.delete(key); note.button.classList.remove('active'); }
  else note.pending = true;
}
if (instrument.notes?.enabled) {
  $('stop-notes').hidden = false;
  const options = document.createElement('div'); options.className = 'note-options';
  const velocityLabel = document.createElement('label'); velocityLabel.textContent = 'Velocity';
  const velocity = document.createElement('input'); velocity.type = 'range'; velocity.min = 1; velocity.max = 127; velocity.value = 100; velocity.id = 'velocity'; velocityLabel.append(velocity);
  const performance = document.createElement('div'); performance.className = 'keyboard-performance'; performance.hidden = true;
  const heading = document.createElement('h3'); heading.textContent = instrument.notes.pads ? 'Instrument hits' : 'Keyboard';
  performance.append(heading, velocityLabel); $('hardware-menu-body').append(performance);
  for (const entry of panel.menus.filter((entry) => entry.keyboard)) {
    menuViews.get(entry.id).push({ root: performance, section: 'Keyboard', title: 'Velocity' });
  }
  const noteGrid = document.createElement('div'); noteGrid.className = instrument.notes.pads ? 'drum-pads' : 'instrument-keys';
  const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteConfiguration = panel.notes || instrument.notes;
  const noteList = instrument.notes.pads || Array.from({ length: noteConfiguration.count }, (_, index) => {
    const note = noteConfiguration.first + index; return { note, name: `${noteNames[note % 12]}${Math.floor(note / 12) - 1}` };
  });
  const buttons = [];
  const whiteCount = noteList.filter((item) => ![1, 3, 6, 8, 10].includes(item.note % 12)).length;
  let whiteIndex = 0;
  for (const [index, item] of noteList.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = instrument.notes.pads ? item.name.split(/[ ·]/)[0] : item.name;
    button.dataset.note = item.note;
    if (instrument.notes.pads) button.dataset.hit = item.name.includes('ALT') ? 'alt' : 'main';
    button.setAttribute('aria-label', `Play ${item.name}`);
    const black = [1, 3, 6, 8, 10].includes(item.note % 12);
    button.classList.toggle('black-key', !instrument.notes.pads && black);
    if (!instrument.notes.pads) {
      button.style.width = `${100 / whiteCount * (black ? .62 : 1)}%`;
      button.style.left = `${100 / whiteCount * (black ? whiteIndex - .31 : whiteIndex)}%`;
      if (!black) whiteIndex++;
    }
    button.onpointerdown = (event) => { if (event.button !== 0) return; event.preventDefault(); button.setPointerCapture(event.pointerId); noteOn(`pointer:${event.pointerId}`, item.note, button); };
    button.onlostpointercapture = (event) => noteOff(`pointer:${event.pointerId}`);
    button.onkeydown = (event) => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); noteOn(`button:${index}`, item.note, button); } };
    button.onkeyup = (event) => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); noteOff(`button:${index}`); } };
    noteGrid.append(button); buttons.push(button);
  }
  const keyboard = 'awsedftgyhujkolp;';
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,select,textarea,button,dialog')) return;
    const playable = buttons.filter((button) => !button.hidden);
    const index = keyboard.indexOf(event.key.toLowerCase());
    if (index >= 0 && playable[index]) { event.preventDefault(); noteOn(`key:${event.code}`, Number(playable[index].dataset.note), playable[index]); }
  });
  document.addEventListener('keyup', (event) => noteOff(`key:${event.code}`));
  if (instrument.notes.pads) {
    const hitToggle = document.createElement('button'); hitToggle.type = 'button'; hitToggle.id = 'alternate-hits';
    hitToggle.textContent = 'ALT hits'; hitToggle.setAttribute('aria-pressed', 'false');
    const setHits = (alternate) => { for (const button of noteGrid.children) button.hidden = button.dataset.hit !== (alternate ? 'alt' : 'main'); };
    setHits(false);
    hitToggle.onclick = () => {
      if (!release()) return;
      const alternate = hitToggle.getAttribute('aria-pressed') !== 'true';
      hitToggle.setAttribute('aria-pressed', String(alternate)); setHits(alternate);
    };
    options.append(hitToggle);
  }
  $('note-controls').append(options, noteGrid);
  if (panel.steps) {
    const steps = document.createElement('div'); steps.className = 'hardware-steps'; steps.setAttribute('role', 'img');
    steps.setAttribute('aria-label', '16 sequencer steps: hardware only');
    for (let index = 1; index <= 16; index++) {
      const step = document.createElement('span'); step.textContent = String(index); steps.append(step);
    }
    $('note-controls').append(steps);
  }
}
if (instrument.pitchBend) {
  const label = document.createElement('label'); label.textContent = 'Pitch bend';
  const bend = document.createElement('input'); bend.type = 'range'; bend.min = 0; bend.max = 16383; bend.value = 8192; bend.id = 'pitch-bend';
  let bendDestination;
  bend.oninput = () => {
    bendDestination ||= { channel: channel(), output: output(), demo: demo() };
    transmit([pitchBendMessage(bendDestination.channel, Number(bend.value))], 'Pitch bend', bendDestination);
  };
  const reset = () => {
    if (!bendDestination) return true;
    if (!transmit([pitchBendMessage(bendDestination.channel, 8192)], 'Pitch bend · center', bendDestination)) return false;
    bend.value = 8192; bendDestination = undefined; return true;
  };
  bend.onchange = reset; bend.onblur = reset; bend.onpointercancel = reset; label.append(bend); $('note-controls').append(label);
  resetBend = reset;
}
for (const [name, byte, title] of [['start', 0xfa, 'Start'], ['continue', 0xfb, 'Continue'], ['stop', 0xfc, 'Stop']]) {
  if (!instrument.transport?.[name]) continue;
  const button = document.createElement('button'); button.type = 'button'; button.id = `transport-${name}`; button.textContent = title;
  button.onclick = () => { if (name === 'stop' && !stopNotes()) return; transmit([[byte]], title); }; $('transport-controls').append(button);
}
if (instrument.category === 'pedals') viewport.after($('transport-controls'));
const release = () => { const success = stopNotes(); return resetBend() && success; };
$('stop-notes').onclick = release;
let previousOutput = $('output').value, previousChannel = $('channel').value, previousDemo = demo();
$('output').onchange = () => { if (!release()) { $('output').value = previousOutput; return; } previousOutput = $('output').value; switchContext(); };
$('channel').onchange = () => { if (!release()) { $('channel').value = previousChannel; return; } previousChannel = $('channel').value; switchContext(); };
$('demo').onchange = () => { if (!release()) { $('demo').checked = previousDemo; return; } previousDemo = demo(); switchContext(); };
function ports() {
  const selected = $('output').value;
  $('output').replaceChildren(new Option('Select output', ''));
  for (const port of access.outputs.values()) if (port.state === 'connected') $('output').add(new Option(port.name || 'MIDI interface', port.id));
  if (selected && ![...$('output').options].some((option) => option.value === selected)) $('output').add(new Option('Disconnected output', selected));
  $('output').value = selected; connection(); release();
}
$('connect').onclick = async () => {
  try {
    if (!navigator.requestMIDIAccess) throw new Error('Web MIDI unavailable. Use Chrome or Edge with HTTPS.');
    access = await navigator.requestMIDIAccess({ sysex: false });
    access.onstatechange = ports; ports();
  } catch (error) { notify(`Could not connect MIDI: ${error.message}`); }
};
$('back-instruments').onclick = (event) => { if (!release()) event.preventDefault(); };
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
window.addEventListener('beforeunload', (event) => { if (!release()) { event.preventDefault(); event.returnValue = ''; } });
$('clear-log').onclick = () => { $('log').replaceChildren(); $('monitor-empty').hidden = false; };
connection();
