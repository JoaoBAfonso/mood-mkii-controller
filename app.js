import { controls, controlValueLabel, manualUrl, hiddenPedalMap } from './controls.js?v=1.1.0';
import { ccMessage, pcMessage, noteMessage, sendMessage } from './midi.js?v=1.1.0';

const $ = (id) => document.getElementById(id);
const initialState = () => Object.fromEntries(controls.filter((c) => 'initial' in c).map((c) => [c.cc, c.initial]));
const contexts = new Map();
let context = { values: initialState(), stale: new Set(), preset: '0', reason: '' };
let state = context.values;
const views = new Map();
let access;
const notes = new Map();
$('manual-link').href = manualUrl;
for (let channel = 1; channel <= 16; channel++) $('channel').add(new Option(String(channel), String(channel)));
$('channel').value = '2';
const channel = () => Number($('channel').value);
const output = () => access?.outputs.get($('output').value);
const demo = () => $('demo').checked;

function contextKey() {
  return demo() ? 'demo' : JSON.stringify([$('output').value, channel()]);
}
contexts.set(contextKey(), context);
function updateStateNote() {
  document.querySelector('.state-note strong').textContent = context.reason || 'Valores da interface, não telemetria.';
}
function switchContext() {
  const key = contextKey();
  if (!contexts.has(key)) {
    contexts.set(key, { values: initialState(), stale: new Set(), preset: '0', reason: '' });
  }
  context = contexts.get(key);
  state = context.values;
  renderPedal();
  controls.forEach(updateControl);
  updatePreset();
  updateStateNote();
}
function notify(message) {
  $('notification').textContent = message;
  $('notification').hidden = !message;
}
function updateConnection() {
  const connected = output()?.state === 'connected';
  $('connection-status').textContent = demo() ? 'Demonstração' : connected ? 'Saída MIDI pronta' : 'Não ligado';
  $('connection-detail').textContent = demo() ? 'Simulação · nada é enviado ao hardware' : connected ? 'Interface ligada · resposta do pedal não verificada' : 'Nenhum comando enviado ao pedal';
  $('status-dot').classList.toggle('ready', connected && !demo());
  $('status-dot').classList.toggle('demo', demo());
  document.body.classList.toggle('demo-mode', demo());
}
function transmit(message, name, target = { output: output(), demo: demo() }) {
  try {
    const result = sendMessage(target.output, message, target.demo);
    const entry = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = name;
    const bytes = document.createElement('code');
    bytes.textContent = `${result === 'demo' ? 'DEMO' : 'OUT'} · ${message.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`;
    entry.append(title, bytes);
    $('log').prepend(entry);
    while ($('log').children.length > 8) $('log').lastChild.remove();
    $('monitor-empty').hidden = true;
    if (![...notes.values()].some((note) => note.pending)) notify('');
    return true;
  } catch (error) {
    notify(`Não foi possível enviar: ${error.message}`);
    return false;
  }
}
function updateControl(control) {
  const controlViews = views.get(control.cc);
  if (!controlViews) return;
  const value = state[control.cc];
  for (const view of controlViews) {
    view.root.classList.toggle('stale', context.stale.has(control.cc));
    if (view.input) {
      view.input.value = control.cc === 25 && view.input.tagName === 'SELECT'
        ? [...control.choices].reverse().find((option) => value >= option.value).value : value;
    }
    if (view.numeric) view.numeric.value = value;
    if (view.knob) view.knob.style.setProperty('--rotation', `${-135 + value / 127 * 270}deg`);
    if (view.readout) view.readout.textContent = `${controlValueLabel(control.cc, value, state)} · ${value}`;
    if (view.button) {
      view.button.setAttribute('aria-pressed', String(value > 0));
      view.button.classList.toggle('active', value > 0);
      view.button.querySelector('.toggle-state').textContent = value > 0 ? 'ON' : 'OFF';
    }
  }
}
function change(control, value) {
  if (control.cc === 18 && !stopNotes()) { updateControl(control); return; }
  if (transmit(ccMessage(channel(), control.cc, value), `${control.name} · CC${control.cc} = ${value}`)) {
    state[control.cc] = value;
    context.stale.delete(control.cc);
    updateControl(control);
    if (control.cc === 23) updateControl(controls.find((c) => c.cc === 19));
    if (control.cc === 104) renderPedal();
  } else updateControl(control);
}
function confirmCommand(message, callback) {
  const key = contextKey();
  $('confirm-text').textContent = `${demo() ? 'MODO DEMO: apenas simulação. ' : ''}${message}`;
  $('confirm-dialog').returnValue = 'cancel';
  $('confirm-dialog').querySelector('form').onsubmit = (event) => {
    event.preventDefault();
    const result = event.submitter?.value || 'cancel';
    $('confirm-dialog').close(result);
    if (result !== 'confirm') return;
    if (contextKey() !== key) { notify('Destino MIDI alterado. Volta a confirmar o comando para o novo destino.'); return; }
    callback();
  };
  $('confirm-dialog').showModal();
}
function makeControl(control, physical = false) {
  const root = document.createElement('div');
  root.className = `control ${physical ? 'physical-control' : ''} ${control.kind}`;
  root.dataset.cc = control.cc;
  const label = document.createElement('label');
  const id = `${physical ? 'pedal-' : ''}cc-${control.cc}`;
  label.htmlFor = id;
  const name = document.createElement('span');
  name.textContent = control.name;
  const badge = document.createElement('small');
  badge.className = 'cc-badge';
  badge.textContent = `CC ${control.cc}`;
  label.append(name, badge);
  root.append(label);
  const view = { root, physical };
  const steppedKnob = physical && control.cc === 25;
  if (control.kind === 'range' || steppedKnob) {
    if (physical) {
      const knob = document.createElement('div');
      knob.className = 'knob';
      knob.title = 'Arrastar para cima/direita para aumentar; slider e teclas também disponíveis.';
      knob.setAttribute('aria-hidden', 'true');
      knob.innerHTML = '<span class="knob-mark"></span>';
      knob.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const startX = event.clientX, startY = event.clientY, start = state[control.cc];
        knob.setPointerCapture(event.pointerId);
        const move = (e) => change(control, Math.max(0, Math.min(127, Math.round(start + (e.clientX - startX + startY - e.clientY) / 1.5))));
        const stop = () => {
          knob.removeEventListener('pointermove', move);
          knob.removeEventListener('lostpointercapture', stop);
        };
        knob.addEventListener('pointermove', move);
        knob.addEventListener('lostpointercapture', stop);
      });
      root.prepend(knob);
      view.knob = knob;
    }
    const input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 127; input.id = id;
    input.addEventListener('input', () => change(control, Number(input.value)));
    const numeric = document.createElement('input');
    numeric.type = 'number'; numeric.min = 0; numeric.max = 127; numeric.step = 1;
    numeric.setAttribute('aria-label', `${control.name} valor CC`);
    numeric.addEventListener('change', () => {
      if (!numeric.validity.valid || numeric.value === '') {
        notify('O valor CC tem de ser um número inteiro entre 0 e 127.');
        updateControl(control);
        return;
      }
      change(control, Number(numeric.value));
    });
    const readout = document.createElement('output');
    readout.className = 'readout';
    const valueRow = document.createElement('div');
    valueRow.className = 'value-row';
    valueRow.append(readout, numeric);
    root.append(input, valueRow);
    Object.assign(view, { input, numeric, readout });
  } else if (control.kind === 'select') {
    const input = document.createElement('select');
    input.id = id;
    for (const option of control.choices) input.add(new Option(option.label, String(option.value)));
    input.addEventListener('change', () => change(control, Number(input.value)));
    root.append(input);
    view.input = input;
  } else if (control.kind === 'toggle') {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.setAttribute('aria-label', `${control.name} CC${control.cc}`);
    button.innerHTML = physical ? '<span class="led"></span><span class="metal-switch"></span><span class="toggle-state">OFF</span>' : '<span class="switch-track"></span><span class="toggle-state">OFF</span>';
    button.addEventListener('click', () => change(control, state[control.cc] ? 0 : 1));
    root.append(button);
    view.button = button;
  } else {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = control.name;
    button.className = control.confirmation ? 'danger-outline' : 'action-button';
    button.addEventListener('click', () => {
      const slot = control.kind === 'save' ? readSlot() : null;
      if (control.kind === 'save' && slot === null) return;
      const run = () => {
        if (control.kind === 'save') {
          transmit(ccMessage(channel(), 111, slot), `Guardar preset ${slot} · CC111`);
        } else {
          if ([59, 56, 110].includes(control.cc) && !stopNotes()) return;
          if (transmit(ccMessage(channel(), control.cc, control.value), `${control.name} · CC${control.cc}`) && [56, 110].includes(control.cc)) markUnknown();
        }
      };
      if (control.confirmation) {
        confirmCommand(`${control.kind === 'save' ? `Slot ${slot}. ` : ''}${control.confirmation}`, run);
      } else run();
    });
    root.append(button);
  }
  if (control.hint && !physical) {
    const hint = document.createElement('p');
    hint.className = 'hint'; hint.textContent = control.hint; root.append(hint);
  }
  if (control.hint) root.title = control.hint;
  if (!views.has(control.cc)) views.set(control.cc, new Set());
  views.get(control.cc).add(view);
  updateControl(control);
  return root;
}
const panelDescriptions = {
  performance: ['Toca no momento.', 'Freeze, overdub e tap tempo sem procurar nos menus.'],
  hidden: ['O outro lado do MOOD.', 'Hidden menu troca o banco do pedal virtual. Os controlos abaixo também permitem acesso direto, sem ativar Hidden.'],
  dips: ['Movimento e personalidade.', 'Os DIP switches correspondem à ordem física, vistos por cima do pedal.'],
  synth: ['Transforma texturas em notas.', 'Note On entra no modo Synth. Usa o teclado abaixo; o pedal precisa de áudio/loop capturado. Estes parâmetros são globais.'],
  settings: ['O teu ponto de partida.', 'Presets no pedal e configurações globais. Operações destrutivas pedem confirmação.'],
};
for (const [id, [title, description]] of Object.entries(panelDescriptions)) {
  const panel = document.createElement('section');
  panel.id = `panel-${id}`;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', `tab-${id}`);
  panel.hidden = id !== 'performance';
  const heading = document.createElement('h3'); heading.textContent = title;
  const text = document.createElement('p'); text.className = 'panel-description'; text.textContent = description;
  panel.append(heading, text);
  $('panels').append(panel);
}
function group(name, title, panelId) {
  const container = document.createElement('div');
  container.className = 'control-group';
  if (title) {
    const heading = document.createElement('h4'); heading.textContent = title; container.append(heading);
  }
  const grid = document.createElement('div'); grid.className = 'control-grid';
  controls.filter((c) => c.group === name).forEach((c) => grid.append(makeControl(c)));
  container.append(grid); $(`panel-${panelId}`).append(container);
}
function renderPedal() {
  for (const controlViews of views.values()) {
    for (const view of controlViews) {
      if (view.physical && view.root.closest('#pedal-knobs, #pedal-toggles')) controlViews.delete(view);
    }
  }
  $('pedal-knobs').replaceChildren();
  $('pedal-toggles').replaceChildren();
  const hidden = state[104] > 0;
  document.querySelector('.pedal').classList.toggle('hidden-mode', hidden);
  $('pedal-bank').textContent = `${context.stale.has(104) ? '~ ' : ''}${hidden ? 'HIDDEN · banco alternativo' : 'NORMAL · banco principal'}`;
  controls.filter((c) => c.group === 'pedal').forEach((c) => {
    const mapped = hidden ? controls.find((candidate) => candidate.cc === hiddenPedalMap[c.cc]) : c;
    (c.kind === 'range' ? $('pedal-knobs') : $('pedal-toggles')).append(makeControl(mapped, true));
  });
}
renderPedal();
controls.filter((c) => c.group === 'footswitch').forEach((c) => $('footswitches').append(makeControl(c, true)));
group('performance', '', 'performance');
group('hidden', '', 'hidden');
group('ramping', 'Ramping', 'dips');
group('dip-left', 'Banco esquerdo · Ramping / Expression', 'dips');
group('dip-right', 'Banco direito · Customize', 'dips');
group('synth', '', 'synth');
group('global', 'Configurações globais', 'settings');

const presetSection = document.createElement('div');
presetSection.className = 'preset-section';
presetSection.innerHTML = '<h4>Presets no pedal</h4><p class="hint">Slots 1–122. Slot 1 = toggle direito; slot 2 = esquerdo. LIVE (PC0) recupera as posições físicas. Os knobs na interface ficam sem sincronização após um PC.</p><div class="preset-actions"><label>Slot<input id="preset-slot" type="number" min="1" max="122" step="1" value="1"></label><button id="recall-preset">Carregar preset</button><button id="live-preset">LIVE · PC0</button></div>';
$('panel-settings').append(presetSection);
group('presets', '', 'settings');
group('maintenance', 'Zona de manutenção · cuidado', 'settings');
function readSlot() {
  const input = $('preset-slot');
  if (input.value === '' || !input.validity.valid) {
    notify('Escolhe um slot inteiro entre 1 e 122.');
    return null;
  }
  return Number(input.value);
}
function markUnknown() {
  context.reason = 'Estado não sincronizado após preset/reset. Valores ~ são anteriores ao comando.';
  context.stale = new Set(controls.filter((c) => 'initial' in c).map((c) => c.cc));
  context.preset = '';
  renderPedal();
  controls.forEach(updateControl);
  updatePreset();
  updateStateNote();
}
function updatePreset() {
  const select = $('physical-preset');
  for (const option of [...select.options]) {
    if (option.dataset.dynamic) option.remove();
  }
  if (!['0', '1', '2'].includes(context.preset)) {
    const option = new Option(context.preset ? `PC · ${context.preset}` : 'NÃO SINCRONIZADO', context.preset);
    option.dataset.dynamic = 'true';
    option.disabled = true;
    select.add(option);
  }
  select.value = context.preset;
}
function recall(slot) {
  if (!stopNotes()) { updatePreset(); return; }
  if (transmit(pcMessage(channel(), slot), slot ? `Carregar preset ${slot} · PC` : 'LIVE · PC0')) {
    markUnknown();
    context.preset = String(slot);
  }
  updatePreset();
}
$('recall-preset').onclick = () => { const slot = readSlot(); if (slot !== null) recall(slot); };
$('live-preset').onclick = () => recall(0);
$('physical-preset').onchange = () => recall(Number($('physical-preset').value));

function activateTab(button) {
  if (button.dataset.tab !== 'synth') stopNotes();
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    const selected = tab === button;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    $(`panel-${tab.dataset.tab}`).hidden = !selected;
  });
}
const tabs = [...document.querySelectorAll('[data-tab]')];
tabs.forEach((button, index) => {
  button.onclick = () => activateTab(button);
  button.onkeydown = (event) => {
    let target;
    if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') target = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') target = tabs[0];
    if (event.key === 'End') target = tabs.at(-1);
    if (target) { event.preventDefault(); activateTab(target); target.focus(); }
  };
});
const keyboard = document.createElement('div');
keyboard.className = 'keyboard-section';
keyboard.innerHTML = '<h4>Teclado · C4–C5</h4><label class="velocity-label">Velocidade <input id="velocity" type="range" min="1" max="127" value="100"></label><div class="keyboard" id="keyboard"></div><button id="stop-notes" class="text-button">Parar notas ativas</button><p class="hint">Clica e mantém premido, ou usa Espaço/Enter com uma tecla focada. Sem síntese de áudio no navegador.</p>';
$('panel-synth').prepend(keyboard);
function noteOn(note, key) {
  if (notes.has(note)) return;
  const context = { output: output(), channel: channel(), demo: demo(), key };
  if (transmit(noteMessage(context.channel, note, Number($('velocity').value)), `Note On ${note}`)) {
    notes.set(note, context); key.classList.add('playing');
  }
}
function noteOff(note) {
  const context = notes.get(note);
  if (!context) return true;
  if (!transmit(noteMessage(context.channel, note, 0, false), `Note Off ${note}`, context)) {
    context.pending = true;
    notify(`Não foi possível parar a nota ${note}. Volta a ligar a interface e usa “Parar notas ativas”, ou para a nota no pedal.`);
    return false;
  }
  context.key.classList.remove('playing'); notes.delete(note);
  if (![...notes.values()].some((note) => note.pending)) notify('');
  return true;
}
function stopNotes() {
  let stopped = true;
  for (const note of [...notes.keys()]) if (!noteOff(note)) stopped = false;
  return stopped;
}
const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B', 'C'];
noteNames.forEach((name, index) => {
  const key = document.createElement('button');
  const note = 60 + index;
  key.className = name.includes('♯') ? 'black-key' : 'white-key';
  key.textContent = name; key.setAttribute('aria-label', `Nota ${name}${index === 12 ? 5 : 4}`);
  key.onpointerdown = (event) => {
    if (event.button !== 0) return;
    key.setPointerCapture(event.pointerId); noteOn(note, key);
  };
  key.onpointerup = key.onpointercancel = key.onlostpointercapture = () => noteOff(note);
  key.onkeydown = (event) => {
    if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); if (!event.repeat) noteOn(note, key); }
  };
  key.onkeyup = (event) => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); noteOff(note); } };
  key.onblur = () => noteOff(note);
  $('keyboard').append(key);
});
$('stop-notes').onclick = stopNotes;
window.addEventListener('blur', stopNotes);
window.addEventListener('pagehide', stopNotes);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopNotes(); });
function refreshOutputs() {
  const previous = $('output').value;
  const available = [...access.outputs.values()].filter((port) => port.state === 'connected');
  const stopped = available.some((port) => port.id === previous) || stopNotes();
  $('output').replaceChildren(new Option('Selecionar saída', ''));
  for (const port of available) $('output').add(new Option(port.name || port.id, port.id));
  $('output').value = available.some((port) => port.id === previous) ? previous : '';
  if (previous && !$('output').value && stopped) notify('A saída MIDI foi desligada. Seleciona novamente a interface.');
  if (previous !== $('output').value) switchContext();
  updateConnection();
}
$('connect').onclick = async () => {
  if (!navigator.requestMIDIAccess) {
    notify('Web MIDI indisponível. Usa Chrome/Edge num computador, por HTTPS, ou experimenta o modo demo.');
    return;
  }
  $('connect').disabled = true;
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
    access.onstatechange = refreshOutputs;
    refreshOutputs();
    if (![...notes.values()].some((note) => note.pending)) {
      notify($('output').options.length === 1 ? 'Nenhuma saída MIDI encontrada. Liga uma interface USB–MIDI e tenta novamente.' : 'Seleciona a saída MIDI. A ligação não envia valores automaticamente.');
    }
  } catch (error) {
    notify(`Acesso MIDI recusado ou indisponível: ${error.message}. Verifica as permissões do navegador.`);
  } finally { $('connect').disabled = false; }
};
$('output').onchange = () => { stopNotes(); switchContext(); updateConnection(); };
$('channel').onchange = () => { stopNotes(); switchContext(); };
$('demo').onchange = () => { stopNotes(); switchContext(); updateConnection(); };
$('clear-log').onclick = () => { $('log').replaceChildren(); $('monitor-empty').hidden = false; };
updateConnection();
