import { controls, controlValueLabel, manualUrl } from './controls.js';
import { ccMessage, pcMessage, noteMessage, sendMessage } from './midi.js';

const $ = (id) => document.getElementById(id);
const state = Object.fromEntries(controls.filter((c) => 'initial' in c).map((c) => [c.cc, c.initial]));
const views = new Map();
let access;
const notes = new Map();
$('manual-link').href = manualUrl;
for (let channel = 1; channel <= 16; channel++) $('channel').add(new Option(String(channel), String(channel)));
$('channel').value = '2';
const channel = () => Number($('channel').value);
const output = () => access?.outputs.get($('output').value);
const demo = () => $('demo').checked;

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
function transmit(message, name) {
  try {
    const result = sendMessage(output(), message, demo());
    const entry = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = name;
    const bytes = document.createElement('code');
    bytes.textContent = `${result === 'demo' ? 'DEMO' : 'OUT'} · ${message.map((byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`;
    entry.append(title, bytes);
    $('log').prepend(entry);
    while ($('log').children.length > 8) $('log').lastChild.remove();
    $('monitor-empty').hidden = true;
    notify('');
    return true;
  } catch (error) {
    notify(`Não foi possível enviar: ${error.message}`);
    return false;
  }
}
function updateControl(control) {
  const view = views.get(control.cc);
  if (!view) return;
  const value = state[control.cc];
  if (view.input) view.input.value = value;
  if (view.numeric) view.numeric.value = value;
  if (view.knob) view.knob.style.setProperty('--rotation', `${-135 + value / 127 * 270}deg`);
  if (view.readout) view.readout.textContent = `${controlValueLabel(control.cc, value, state)} · ${value}`;
  if (view.button) {
    view.button.setAttribute('aria-pressed', String(value > 0));
    view.button.classList.toggle('active', value > 0);
    view.button.querySelector('.toggle-state').textContent = value > 0 ? 'ON' : 'OFF';
  }
}
function change(control, value) {
  if (transmit(ccMessage(channel(), control.cc, value), `${control.name} · CC${control.cc} = ${value}`)) {
    state[control.cc] = value;
    updateControl(control);
    if (control.cc === 23) updateControl(controls.find((c) => c.cc === 19));
  } else updateControl(control);
}
function confirmCommand(message, callback) {
  $('confirm-text').textContent = `${demo() ? 'MODO DEMO: apenas simulação. ' : ''}${message}`;
  $('confirm-dialog').returnValue = 'cancel';
  $('confirm-dialog').onclose = () => {
    if ($('confirm-dialog').returnValue === 'confirm') callback();
  };
  $('confirm-dialog').showModal();
}
function makeControl(control, physical = false) {
  const root = document.createElement('div');
  root.className = `control ${physical ? 'physical-control' : ''} ${control.kind}`;
  root.dataset.cc = control.cc;
  const label = document.createElement('label');
  label.htmlFor = `cc-${control.cc}`;
  const name = document.createElement('span');
  name.textContent = control.name;
  const badge = document.createElement('small');
  badge.className = 'cc-badge';
  badge.textContent = `CC ${control.cc}`;
  label.append(name, badge);
  root.append(label);
  const view = {};
  if (control.kind === 'range') {
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
    input.type = 'range'; input.min = 0; input.max = 127; input.id = `cc-${control.cc}`;
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
    input.id = `cc-${control.cc}`;
    for (const option of control.choices) input.add(new Option(option.label, String(option.value)));
    input.addEventListener('change', () => change(control, Number(input.value)));
    root.append(input);
    view.input = input;
  } else if (control.kind === 'toggle') {
    const button = document.createElement('button');
    button.id = `cc-${control.cc}`;
    button.type = 'button';
    button.setAttribute('aria-label', `${control.name} CC${control.cc}`);
    button.innerHTML = physical ? '<span class="led"></span><span class="metal-switch"></span><span class="toggle-state">OFF</span>' : '<span class="switch-track"></span><span class="toggle-state">OFF</span>';
    button.addEventListener('click', () => change(control, state[control.cc] ? 0 : 1));
    root.append(button);
    view.button = button;
  } else {
    const button = document.createElement('button');
    button.id = `cc-${control.cc}`;
    button.textContent = control.name;
    button.className = control.confirmation ? 'danger-outline' : 'action-button';
    button.addEventListener('click', () => {
      const run = () => {
        if (control.kind === 'save') {
          const slot = readSlot();
          if (slot !== null) transmit(ccMessage(channel(), 111, slot), `Guardar preset ${slot} · CC111`);
        } else {
          if (control.cc === 59) stopNotes();
          if (transmit(ccMessage(channel(), control.cc, control.value), `${control.name} · CC${control.cc}`) && [56, 110].includes(control.cc)) markUnknown();
        }
      };
      if (control.confirmation) {
        if (control.kind === 'save' && readSlot() === null) return;
        confirmCommand(control.confirmation, run);
      } else run();
    });
    root.append(button);
  }
  if (control.hint && !physical) {
    const hint = document.createElement('p');
    hint.className = 'hint'; hint.textContent = control.hint; root.append(hint);
  }
  if (control.hint) root.title = control.hint;
  views.set(control.cc, view);
  updateControl(control);
  return root;
}
const panelDescriptions = {
  performance: ['Toca no momento.', 'Freeze, overdub e tap tempo sem procurar nos menus.'],
  hidden: ['O outro lado do MOOD.', 'Acesso direto aos parâmetros ocultos. Não precisas de remapear os knobs.'],
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
controls.filter((c) => c.group === 'pedal').forEach((c) => (c.kind === 'range' ? $('pedal-knobs') : $('pedal-toggles')).append(makeControl(c, true)));
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
  document.querySelector('.state-note strong').textContent = 'Estado não sincronizado após preset/reset.';
  document.querySelector('.pedal').classList.add('unknown-state');
}
function recall(slot) {
  stopNotes();
  if (transmit(pcMessage(channel(), slot), slot ? `Carregar preset ${slot} · PC` : 'LIVE · PC0')) {
    markUnknown();
    $('physical-preset').value = [0, 1, 2].includes(slot) ? String(slot) : '';
  }
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
  if (!context) return;
  try {
    sendMessage(context.output, noteMessage(context.channel, note, 0, false), context.demo);
  } catch (error) {
    notify(`Não foi possível parar a nota ${note}: ${error.message}. Volta a ligar a interface ou para a nota no pedal.`);
  }
  context.key.classList.remove('playing'); notes.delete(note);
}
function stopNotes() { [...notes.keys()].forEach(noteOff); }
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
  if (!available.some((port) => port.id === previous)) stopNotes();
  $('output').replaceChildren(new Option('Selecionar saída', ''));
  for (const port of available) $('output').add(new Option(port.name || port.id, port.id));
  $('output').value = available.some((port) => port.id === previous) ? previous : '';
  if (previous && !$('output').value) notify('A saída MIDI foi desligada. Seleciona novamente a interface.');
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
    notify($('output').options.length === 1 ? 'Nenhuma saída MIDI encontrada. Liga uma interface USB–MIDI e tenta novamente.' : 'Seleciona a saída MIDI. A ligação não envia valores automaticamente.');
  } catch (error) {
    notify(`Acesso MIDI recusado ou indisponível: ${error.message}. Verifica as permissões do navegador.`);
  } finally { $('connect').disabled = false; }
};
$('output').onchange = () => { stopNotes(); updateConnection(); };
$('channel').onchange = stopNotes;
$('demo').onchange = () => { stopNotes(); updateConnection(); };
$('clear-log').onclick = () => { $('log').replaceChildren(); $('monitor-empty').hidden = false; };
updateConnection();
