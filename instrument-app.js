import { getInstrument } from './instruments.js?v=3.0.0';
import { controlMessages, presetMessages, noteMessage, pitchBendMessage, sendMessage } from './midi.js?v=3.0.0';
import { createPresetManager } from './presets.js?v=3.0.0';
import { createHelpTooltip } from './tooltip.js?v=3.0.0';

const $ = (id) => document.getElementById(id);
const instrument = getInstrument(new URLSearchParams(location.search).get('instrument'));
if (!instrument) {
  const error = document.createElement('p');
  error.textContent = 'Instrumento desconhecido. Volta ao hub para escolher um equipamento.';
  document.querySelector('main').replaceChildren(error);
  throw new Error('Instrumento inválido.');
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
const diagrams = {
  slicer: '<path d="M8 52V14h13v38h12V14h13v38h12V14h13v38h12V14h13v38h16"/>',
  tape: '<circle cx="32" cy="34" r="22"/><circle cx="87" cy="34" r="22"/><circle cx="32" cy="34" r="6"/><circle cx="87" cy="34" r="6"/><path d="M32 12h55M32 56h55"/>',
  eq: '<path d="M8 49Q18 48 26 24T44 30T65 36T85 17T113 45M8 58h105M20 53v10m20-10v10m20-10v10m20-10v10m20-10v10"/>',
  modulation: '<path d="M8 35Q20 2 34 35T60 35T86 35T112 35M8 51Q20 25 34 51T60 51T86 51T112 51"/>',
  delay: '<path d="M10 55V10h10v45h14V20h10v35h14V30h10v25h14V40h10v15h18"/>',
  reverb: '<path d="M18 33h14m10-14q20 14 0 28m17-38q34 24 0 48m18-54q38 30 0 60"/><circle cx="24" cy="33" r="5"/>',
  synthesis: '<path d="M8 52V15l24 37V15l24 37V15l24 37V15l24 37M8 61h96"/>',
  rhythm: '<path d="M8 48h104M16 48V16h8v32m18 0V28h8v20m18 0V10h8v38m18 0V28h8v20"/>',
};
const drawing = diagrams[instrument.visualization || (instrument.notes?.pads ? 'rhythm' : instrument.category === 'synths' ? 'synthesis' : '')];
if (drawing) {
  const art = document.createElement('div'); art.className = 'instrument-art'; art.setAttribute('aria-hidden', 'true');
  art.innerHTML = `<svg viewBox="0 0 120 72" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawing}</svg>`;
  $('hardware').insertBefore(art, $('physical-controls'));
}
$('instrument-edition').textContent = instrument.edition || 'MIDI STUDIO';
$('main-manual-link').href = instrument.mainManualUrl;
$('manual-link').href = instrument.manualUrl;
$('back-label').textContent = instrument.category === 'synths' ? 'Sintetizadores' : 'Pedais';
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
  $('connection-status').textContent = demo() ? 'Demonstração' : ready ? 'Saída MIDI pronta' : 'Não ligado';
  $('connection-detail').textContent = demo() ? 'Explorar em simulação' : ready ? `${output().name || 'Interface MIDI'} · canal ${channel()}` : 'Escolhe a saída e o canal';
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
  } catch (error) { notify(`Não foi possível enviar: ${error.message}`); return false; }
}
function update(control) {
  const value = context.values[control.id];
  if (eqBars.has(control.id)) {
    const bar = eqBars.get(control.id);
    bar.style.setProperty('--level', `${(value - control.min) / (control.max - control.min) * 100}%`);
    bar.classList.toggle('stale', context.stale.has(control.id));
  }
  for (const view of views.get(control.id) || []) {
    view.root.classList.toggle('stale', context.stale.has(control.id));
    if (view.input) view.input.value = value;
    if (view.numeric) view.numeric.value = value;
    if (view.knob) view.knob.style.setProperty('--rotation', `${-135 + (value - control.min) / Math.max(1, control.max - control.min) * 270}deg`);
    if (view.readout) view.readout.textContent = control.label ? control.label(value, context.values) : `${Math.round((value - control.min) / Math.max(1, control.max - control.min) * 100)}%`;
    if (view.button && control.kind === 'toggle') {
      const on = value === (control.onValue ?? 127);
      view.button.setAttribute('aria-pressed', String(on)); view.button.classList.toggle('active', on);
      view.button.textContent = on ? 'ON' : 'OFF';
    }
    if (control.eqBand) refreshEq();
  }
}
function change(control, value, confirmed = false) {
  if (control.confirmation && !confirmed) {
    update(control);
    confirm(control.confirmation, () => { if (release()) change(control, value, true); });
    return;
  }
  try {
    if (transmit(controlMessages(channel(), control, value), control.name)) {
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
      $('hardware-screen').textContent = `${control.name} · ${control.kind === 'select' ? control.choices.find((choice) => choice.value === value).label : control.label ? control.label(value, context.values) : value}`;
      help.refresh();
    } else update(control);
  } catch (error) { notify(error.message); update(control); }
}
function confirm(message, callback) {
  const key = targetKey();
  help.hide();
  $('confirm-text').textContent = `${demo() ? 'MODO DEMO: apenas simulação. ' : ''}${message}`;
  $('confirm-dialog').querySelector('form').onsubmit = (event) => {
    event.preventDefault(); const result = event.submitter?.value;
    $('confirm-dialog').close(result);
    if (result !== 'confirm') return;
    if (key !== targetKey()) { notify('Destino MIDI alterado. Volta a confirmar o comando.'); return; }
    callback();
  };
  $('confirm-dialog').showModal();
}
function makeControl(control, physical = false) {
  const root = document.createElement('div');
  root.className = `control ${physical ? 'physical-control' : ''} ${control.kind}`;
  root.dataset.parameter = control.id; root.dataset.protocol = control.protocol; root.dataset.number = control.number;
  root.dataset.search = `${control.name} ${control.hint || ''}`.toLocaleLowerCase('pt-PT');
  const id = `${physical ? 'hardware-' : ''}${control.id}`;
  const label = document.createElement('label'); label.htmlFor = id; label.textContent = control.name.replace(/\s*·\s*valor MIDI/gi, '');
  root.append(label);
  const view = { root };
  if (control.kind === 'range') {
    const input = document.createElement('input'); input.type = 'range';
    input.id = id; input.min = control.min; input.max = control.max; input.step = 1;
    input.oninput = () => change(control, Number(input.value));
    const numeric = document.createElement('input'); numeric.type = 'number';
    numeric.min = control.min; numeric.max = control.max; numeric.step = 1;
    numeric.setAttribute('aria-label', `${control.name} valor MIDI`);
    numeric.onchange = () => {
      if (!numeric.value || !numeric.validity.valid) { notify(`Escolhe um inteiro entre ${control.min} e ${control.max}.`); update(control); return; }
      change(control, Number(numeric.value));
    };
    const readout = document.createElement('output'); readout.className = 'readout';
    const row = document.createElement('div'); row.className = 'value-row'; row.append(readout, numeric);
    root.append(input, row); Object.assign(view, { input, numeric, readout });
    if (physical) {
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
  } else if (control.kind === 'select') {
    const input = document.createElement('select'); input.id = id;
    for (const choice of control.choices) input.add(new Option(choice.label, String(choice.value)));
    input.onchange = () => change(control, Number(input.value)); root.append(input); view.input = input;
  } else {
    const button = document.createElement('button'); button.type = 'button'; button.id = id;
    button.textContent = control.name; button.setAttribute('aria-label', control.name);
    button.onclick = () => {
      const value = control.kind === 'toggle' ? context.values[control.id] === (control.onValue ?? 127) ? control.offValue ?? 0 : control.onValue ?? 127 : control.value;
      change(control, value);
    };
    root.append(button); view.button = button;
  }
  help.attach(root, () => control.help ? control.help(context.values) : control.hint || '', control.name);
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
  const channelLabel = document.createElement('label'); channelLabel.textContent = 'Canal EQ';
  const eqChannel = document.createElement('select'); eqChannel.id = 'eq-channel';
  eqChannel.add(new Option('A', '1')); eqChannel.add(new Option('B', '2')); channelLabel.append(eqChannel);
  const bandLabel = document.createElement('label'); bandLabel.textContent = 'Banda';
  const eqBand = document.createElement('select'); eqBand.id = 'eq-band';
  for (let band = 1; band <= 10; band++) eqBand.add(new Option(String(band), String(band)));
  bandLabel.append(eqBand);
  const selectors = document.createElement('div'); selectors.className = 'eq-selectors'; selectors.append(channelLabel, bandLabel);
  const chart = document.createElement('div'); chart.className = 'eq-bars';
  const encoder = document.createElement('div'); encoder.className = 'eq-encoder';
  for (const control of eqControls) {
    const bar = document.createElement('button'); bar.type = 'button'; bar.dataset.parameter = control.id;
    bar.setAttribute('aria-label', `Selecionar banda ${control.eqBand.band}, canal ${control.eqBand.channel === 1 ? 'A' : 'B'}`);
    const indicator = document.createElement('i');
    const label = document.createElement('small'); label.textContent = control.eqBand.frequency ? `${control.eqBand.frequency >= 1000 ? `${control.eqBand.frequency / 1000}k` : control.eqBand.frequency}` : String(control.eqBand.band);
    bar.append(indicator, label); bar.onclick = () => { eqBand.value = String(control.eqBand.band); refreshEq(); };
    eqBars.set(control.id, bar); chart.append(bar);
    encoder.append(makeControl(control, true));
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
  eq.append(selectors, chart, encoder); $('physical-controls').append(eq);
  eqControls.forEach(update);
}
for (const section of sections) {
  const controls = instrument.controls.filter((control) => control.section === section && control.physical && !control.eqBand).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  if (!controls.length) continue;
  const group = document.createElement('section'); group.className = 'hardware-section';
  const heading = document.createElement('h3'); heading.textContent = section; group.append(heading);
  const grid = document.createElement('div'); grid.className = 'hardware-grid';
  for (const control of controls) grid.append(makeControl(control, true));
  group.append(grid); $('physical-controls').append(group);
}
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
        if (!transmit(messages, slot ? `Carregar preset ${slot}` : 'Live')) return false;
        context.preset = String(slot);
        context.stale = new Set(instrument.controls.filter((control) => control.kind !== 'action').map((control) => control.id));
        instrument.controls.forEach(update); $('state-note').hidden = false;
        $('hardware-screen').textContent = slot ? `Preset ${slot}` : 'Live';
        return true;
      } catch (error) { notify(error.message); return false; }
    },
  });
  $('open-presets').onclick = () => { tab.onclick(); tab.focus(); };
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
  const query = $('control-search').value.trim().toLocaleLowerCase('pt-PT');
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
  const velocityLabel = document.createElement('label'); velocityLabel.textContent = 'Velocidade';
  const velocity = document.createElement('input'); velocity.type = 'range'; velocity.min = 1; velocity.max = 127; velocity.value = 100; velocity.id = 'velocity'; velocityLabel.append(velocity);
  options.append(velocityLabel);
  const noteGrid = document.createElement('div'); noteGrid.className = instrument.notes.pads ? 'drum-pads' : 'instrument-keys';
  const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteList = instrument.notes.pads || Array.from({ length: instrument.notes.count }, (_, index) => {
    const note = instrument.notes.first + index; return { note, name: `${noteNames[note % 12]}${Math.floor(note / 12) - 1}` };
  });
  const buttons = [];
  const whiteCount = noteList.filter((item) => ![1, 3, 6, 8, 10].includes(item.note % 12)).length;
  let whiteIndex = 0;
  for (const [index, item] of noteList.entries()) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = item.name;
    button.dataset.note = item.note;
    button.setAttribute('aria-label', `Tocar ${item.name}`);
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
    const index = keyboard.indexOf(event.key.toLowerCase());
    if (index >= 0 && buttons[index]) { event.preventDefault(); noteOn(`key:${event.code}`, noteList[index].note, buttons[index]); }
  });
  document.addEventListener('keyup', (event) => noteOff(`key:${event.code}`));
  $('note-controls').append(options, noteGrid);
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
    if (!transmit([pitchBendMessage(bendDestination.channel, 8192)], 'Pitch bend · centro', bendDestination)) return false;
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
const release = () => { const success = stopNotes(); return resetBend() && success; };
$('stop-notes').onclick = release;
let previousOutput = $('output').value, previousChannel = $('channel').value, previousDemo = demo();
$('output').onchange = () => { if (!release()) { $('output').value = previousOutput; return; } previousOutput = $('output').value; switchContext(); };
$('channel').onchange = () => { if (!release()) { $('channel').value = previousChannel; return; } previousChannel = $('channel').value; switchContext(); };
$('demo').onchange = () => { if (!release()) { $('demo').checked = previousDemo; return; } previousDemo = demo(); switchContext(); };
function ports() {
  const selected = $('output').value;
  $('output').replaceChildren(new Option('Selecionar saída', ''));
  for (const port of access.outputs.values()) if (port.state === 'connected') $('output').add(new Option(port.name || 'Interface MIDI', port.id));
  if (selected && ![...$('output').options].some((option) => option.value === selected)) $('output').add(new Option('Saída desligada', selected));
  $('output').value = selected; connection(); release();
}
$('connect').onclick = async () => {
  try {
    if (!navigator.requestMIDIAccess) throw new Error('Web MIDI indisponível. Usa Chrome ou Edge com HTTPS.');
    access = await navigator.requestMIDIAccess({ sysex: false });
    access.onstatechange = ports; ports();
  } catch (error) { notify(`Não foi possível ligar MIDI: ${error.message}`); }
};
$('back-instruments').onclick = (event) => { if (!release()) event.preventDefault(); };
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
window.addEventListener('beforeunload', (event) => { if (!release()) { event.preventDefault(); event.returnValue = ''; } });
$('clear-log').onclick = () => { $('log').replaceChildren(); $('monitor-empty').hidden = false; };
connection();
