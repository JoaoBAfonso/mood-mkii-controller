import { getPedal } from './pedals.js?v=3.0.0';
import { ccMessage, pcMessage, noteMessage, sendMessage } from './midi.js?v=3.0.0';
import { createPresetManager } from './presets.js?v=3.0.0';
import { controlHelp, controlName, controlChoices, modeDetail } from './help.js?v=3.0.0';
import { createHelpTooltip } from './tooltip.js?v=3.0.0';

const $ = (id) => document.getElementById(id);
const pedal = getPedal(new URLSearchParams(location.search).get('pedal'));
if (!pedal) {
  document.querySelector('main').replaceChildren();
  const error = document.createElement('p');
  error.textContent = 'Pedal desconhecido. Volta à seleção para escolher um modelo. Nenhum comando foi enviado.';
  const back = document.createElement('a'); back.href = './?section=pedals'; back.textContent = '← Selecionar pedal';
  document.querySelector('main').append(error, back);
  throw new Error('Modelo de pedal inválido.');
}
const { controls, label: controlValueLabel, manualUrl, hiddenMap: hiddenPedalMap } = pedal;
document.body.classList.add(`theme-${pedal.id}`);
document.body.dataset.pedal = pedal.id;
document.title = `${pedal.name} · MIDI Studio`;
$('pedal-title').append(document.createTextNode(pedal.title));
if (pedal.edition) {
  const mark = document.createElement('span'); mark.className = 'model-mark'; mark.textContent = pedal.edition;
  $('pedal-title').append(document.createTextNode(' '), mark);
}
$('pedal-subtitle').textContent = pedal.subtitle;
$('pedal-logo').textContent = pedal.title;
$('pedal-category').textContent = pedal.category;
$('panel-title').textContent = pedal.category;
$('pedal-edition').textContent = `Web MIDI · ${pedal.variant}`;
$('pedal-bottom').textContent = `${pedal.name} · MIDI STUDIO`;
$('main-manual-link').href = pedal.mainManualUrl;
document.querySelector('.pedal-area').setAttribute('aria-label', `Controlos físicos do ${pedal.name}`);
if (!pedal.synth) $('tab-synth').remove();
if (pedal.id !== 'mood-mkii' && pedal.id !== 'bad-mood') $('tab-hidden').textContent = 'ALT';
const isOn = (control) => control.onValue === 0 ? state[control.cc] === 0 : state[control.cc] > 0;
const initialState = () => Object.fromEntries(controls.filter((c) => 'initial' in c).map((c) => [c.cc, c.initial]));
const contexts = new Map();
let context = { values: initialState(), stale: new Set(), preset: '0', reason: '' };
let state = context.values;
const views = new Map();
let access;
const notes = new Map();
let visibleBank = 'normal';
let presetManager;
const help = createHelpTooltip();
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
  document.querySelector('.state-note').hidden = !context.reason;
  document.querySelector('.state-note strong').textContent = context.reason;
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
  updateModeIllustrations();
}
function notify(message) {
  $('notification').textContent = message;
  $('notification').hidden = !message;
}
function updateConnection() {
  const connected = output()?.state === 'connected';
  $('connection-status').textContent = demo() ? 'Demonstração' : connected ? 'Saída MIDI pronta' : 'Não ligado';
  $('connection-detail').textContent = demo() ? 'Explorar em simulação' : connected ? `${output().name || 'Interface MIDI'} · canal ${channel()}` : 'Escolhe a saída e o canal';
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
    view.name.textContent = controlName(pedal, control, state);
    if (view.input) {
      if (view.input.tagName === 'SELECT') {
        for (const choice of controlChoices(pedal, control, state)) {
          const option = [...view.input.options].find((item) => Number(item.value) === choice.value);
          if (option.textContent !== choice.label) option.textContent = choice.label;
        }
      }
      view.input.value = control.cc === pedal.waveformCc && view.input.tagName === 'SELECT'
        ? [...control.choices].reverse().find((option) => value >= option.value).value : value;
    }
    if (view.numeric) view.numeric.value = value;
    if (view.knob) {
      const visual = control.kind === 'select' && control.cc !== pedal.waveformCc ? control.choices.findIndex((choice) => choice.value === value) / (control.choices.length - 1) : value / 127;
      view.knob.style.setProperty('--rotation', `${-135 + visual * 270}deg`);
    }
    if (view.readout) view.readout.textContent = controlValueLabel(control.cc, value, state);
    if (view.button) {
      view.button.setAttribute('aria-pressed', String(isOn(control)));
      view.button.classList.toggle('active', isOn(control));
      view.button.querySelector('.toggle-state').textContent = isOn(control) ? 'ON' : 'OFF';
    }
  }
}
function change(control, value) {
  if (control.cc === pedal.clockCc && !stopNotes()) { updateControl(control); return; }
  if (transmit(ccMessage(channel(), control.cc, value), `${control.name} · CC${control.cc} = ${value}`)) {
    state[control.cc] = value;
    context.stale.delete(control.cc);
    if (!context.stale.size) { context.reason = ''; updateStateNote(); }
    updateControl(control);
    if ([21, 23, 72].includes(control.cc)) {
      for (const cc of [16, 17, 18, 19]) updateControl(controls.find((c) => c.cc === cc));
    }
    if (control.cc === pedal.hiddenCc) {
      visibleBank = value === pedal.hiddenOff ? 'normal' : 'hidden';
      renderPedal();
    }
    if ([72, 74, 75].includes(control.cc)) renderPedal();
    if ([72, 76, 77].includes(control.cc)) updateControl(controls.find((candidate) => candidate.cc === 21));
    if (control.cc === 78 && pedal.id === 'lost-found') updatePreset();
    updateModeIllustrations();
    help.refresh();
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
function makeControl(control, physical = false, position = control.cc) {
  const root = document.createElement('div');
  root.className = `control ${physical ? 'physical-control' : ''} ${control.kind}`;
  root.dataset.cc = control.cc;
  const label = document.createElement('label');
  const id = `${physical ? 'pedal-' : ''}cc-${control.cc}`;
  label.htmlFor = id;
  const name = document.createElement('span');
  name.textContent = controlName(pedal, control, state);
  label.append(name);
  root.append(label);
  const view = { root, physical, name };
  const steppedKnob = physical && (control.cc === pedal.waveformCc || (position >= 14 && position <= 19 && control.kind === 'select'));
  const knobValue = (raw) => steppedKnob && control.cc !== pedal.waveformCc
    ? control.choices.reduce((best, choice) => Math.abs(choice.value - raw) < Math.abs(best.value - raw) ? choice : best).value : raw;
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
        const move = (e) => change(control, knobValue(Math.max(0, Math.min(127, Math.round(start + (e.clientX - startX + startY - e.clientY) / 1.5)))));
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
    input.addEventListener('input', () => change(control, knobValue(Number(input.value))));
    const numeric = document.createElement('input');
    numeric.type = 'number'; numeric.min = 0; numeric.max = 127; numeric.step = 1;
    numeric.setAttribute('aria-label', `${control.name} valor CC`);
    numeric.addEventListener('change', () => {
      if (!numeric.validity.valid || numeric.value === '') {
        notify('O valor CC tem de ser um número inteiro entre 0 e 127.');
        updateControl(control);
        return;
      }
      if (steppedKnob && control.cc !== pedal.waveformCc && !control.choices.some((choice) => choice.value === Number(numeric.value))) {
        notify('Escolhe um dos valores documentados no menu deste parâmetro.');
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
    for (const option of controlChoices(pedal, control, state)) input.add(new Option(option.label, String(option.value)));
    input.addEventListener('change', () => change(control, Number(input.value)));
    root.append(input);
    view.input = input;
  } else if (control.kind === 'toggle') {
    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.setAttribute('aria-label', controlName(pedal, control, state));
    button.innerHTML = physical ? '<span class="led"></span><span class="metal-switch"></span><span class="toggle-state">OFF</span>' : '<span class="switch-track"></span><span class="toggle-state">OFF</span>';
    button.addEventListener('click', () => change(control, isOn(control) ? (control.offValue ?? 0) : (control.onValue ?? 1)));
    root.append(button);
    view.button = button;
  } else {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = controlName(pedal, control, state);
    button.className = control.confirmation ? 'danger-outline' : 'action-button';
    button.addEventListener('click', () => {
      const slot = control.kind === 'save' ? readSlot() : null;
      if (control.kind === 'save' && slot === null) return;
      const run = () => {
        if (control.kind === 'save') {
          transmit(ccMessage(channel(), 111, slot), `Guardar preset ${slot} · CC111`);
        } else {
          if ([59, 56, 110].includes(control.cc) && !stopNotes()) return;
          if (transmit(ccMessage(channel(), control.cc, control.value), `${control.name} · CC${control.cc}`) && [56, 110, 112, 113, 114].includes(control.cc)) markUnknown();
        }
      };
      if (control.confirmation) {
        confirmCommand(`${control.kind === 'save' ? `Slot ${slot}. ` : ''}${control.confirmation}`, run);
      } else run();
    });
    root.append(button);
  }
  help.attach(root, () => controlHelp(pedal, control, state), controlName(pedal, control, state));
  if (!views.has(control.cc)) views.set(control.cc, new Set());
  views.get(control.cc).add(view);
  updateControl(control);
  return root;
}
const panelDescriptions = {
  performance: ['Toca no momento.', 'Escolhe os modos e encontra os comandos de performance específicos deste pedal.'],
  hidden: ['Outra camada do som.', 'Largura, mistura e comportamento: explora os parâmetros alternativos.'],
  dips: ['Movimento e personalidade.', 'Os DIP switches correspondem à ordem física, vistos por cima do pedal.'],
  synth: ['Transforma texturas em notas.', 'Note On entra no modo Synth. Usa o teclado abaixo; o pedal precisa de áudio/loop capturado. Estes parâmetros são globais.'],
  presets: ['Presets.', ''],
  settings: ['O teu ponto de partida.', 'Timing e configurações globais.'],
};
for (const [id, [title, description]] of Object.entries(panelDescriptions)) {
  if (id === 'synth' && !pedal.synth) continue;
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
  container.dataset.group = name;
  if (title) {
    const heading = document.createElement('h4'); heading.textContent = title; container.append(heading);
  }
  const grid = document.createElement('div'); grid.className = 'control-grid';
  controls.filter((c) => c.group === name).forEach((c) => grid.append(makeControl(c)));
  container.append(grid); $(`panel-${panelId}`).append(container);
}
function renderPedal() {
  help.hide();
  for (const controlViews of views.values()) {
    for (const view of controlViews) {
      if (view.physical && view.root.closest('#pedal-knobs, #pedal-toggles')) controlViews.delete(view);
    }
  }
  $('pedal-knobs').replaceChildren();
  $('pedal-toggles').replaceChildren();
  const hidden = visibleBank === 'hidden';
  document.querySelector('.pedal').classList.toggle('hidden-mode', hidden);
  $('pedal-bank').textContent = hidden ? 'HIDDEN · banco alternativo' : 'NORMAL · banco principal';
  $('bank-description').textContent = hidden ? 'Parâmetros alternativos' : pedal.id === 'generation-loss-mkii' && state[72] ? 'Classic · LP / Generation / HP' : '';
  $('bank-description').hidden = !$('bank-description').textContent;
  controls.filter((c) => c.group === 'pedal').forEach((c) => {
    const mapped = hidden && hiddenPedalMap[c.cc] !== undefined ? controls.find((candidate) => candidate.cc === hiddenPedalMap[c.cc]) : c;
    const element = makeControl(mapped, true, c.cc);
    element.dataset.position = c.cc;
    (c.kind === 'range' ? $('pedal-knobs') : $('pedal-toggles')).append(element);
  });
}
renderPedal();
controls.filter((c) => c.group === 'footswitch').forEach((c) => $('footswitches').append(makeControl(c, true)));
group('performance', '', 'performance');
group('hidden', '', 'hidden');
group('ramping', 'Ramping', 'dips');
group('dip-left', 'Banco esquerdo · Ramping / Expression', 'dips');
group('dip-right', 'Banco direito · Customize', 'dips');
if (pedal.synth) group('synth', '', 'synth');
group('global', 'Configurações globais', 'settings');

presetsSetup();
function presetsSetup() {
  presetManager = createPresetManager({
    pedal, panel: $('panel-presets'), quick: $('preset-quick'),
    recall, current: () => context.preset, targetKey: contextKey, confirm: confirmCommand, notify, onChange: updatePreset,
  });
  const save = controls.find((control) => control.kind === 'save');
  $('preset-save-control').append(makeControl(save));
  $('open-presets').onclick = () => { activateTab($('tab-presets')); $('tab-presets').focus(); };
}
group('maintenance', 'Zona de manutenção · cuidado', 'settings');
function readSlot() {
  return presetManager.readSlot();
}
function markUnknown() {
  context.reason = '~ Valores anteriores ao preset ou à alteração. Move um controlo para o definir novamente.';
  context.stale = new Set(controls.filter((c) => 'initial' in c).map((c) => c.cc));
  context.preset = '';
  renderPedal();
  controls.forEach(updateControl);
  updatePreset();
  updateStateNote();
  updateModeIllustrations();
}
function updatePreset() {
  const select = $('physical-preset');
  if (pedal.id === 'lost-found') {
    const bank = state[78] > 0;
    for (const option of [...select.options].filter((item) => !item.dataset.dynamic && item.value !== '0')) {
      const left = option.textContent.startsWith('LEFT');
      option.value = String((left ? 2 : 1) + (bank ? 2 : 0));
      option.textContent = `${left ? 'LEFT' : 'RIGHT'} · ${option.value}`;
    }
  }
  for (const option of [...select.options]) {
    if (option.dataset.dynamic) option.remove();
  }
  if (![...select.options].some((option) => option.value === context.preset)) {
    const option = new Option(context.preset ? presetManager?.title(Number(context.preset)) || `Preset ${context.preset}` : 'NÃO SINCRONIZADO', context.preset);
    option.dataset.dynamic = 'true';
    option.disabled = true;
    select.add(option);
  }
  select.value = context.preset;
  presetManager?.update();
}
function recall(slot) {
  if (!stopNotes()) { updatePreset(); return false; }
  if (transmit(pcMessage(channel(), slot), slot ? `Carregar preset ${slot} · PC` : 'LIVE · PC0')) {
    markUnknown();
    context.preset = String(slot);
    updatePreset();
    return true;
  }
  updatePreset();
  return false;
}
$('physical-preset').onchange = () => recall(Number($('physical-preset').value));

function activateTab(button) {
  help.hide();
  if (button.dataset.tab !== 'synth') stopNotes();
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    const selected = tab === button;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    $(`panel-${tab.dataset.tab}`).hidden = !selected;
  });
  if (button.dataset.tab === 'hidden' || button.dataset.tab === 'performance') {
    visibleBank = button.dataset.tab === 'hidden' ? 'hidden' : 'normal';
    renderPedal();
  }
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

const modeIllustrations = pedal.modes;
function svgDrawing(drawing) {
  return `<svg viewBox="0 0 120 72" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawing}</svg>`;
}
function createModeIllustrations() {
  const section = document.createElement('section');
  section.className = 'mode-section';
  section.setAttribute('aria-label', 'Modos e funções do pedal');
  for (const [cc, title] of pedal.modeGroups) {
    const channelSection = document.createElement('div');
    channelSection.className = `mode-channel ${cc === 21 ? 'wet-channel' : 'loop-channel'}`;
    const heading = document.createElement('h4');
    heading.textContent = title;
    const grid = document.createElement('div'); grid.className = 'mode-grid';
    for (const mode of modeIllustrations.filter((item) => item.cc === cc)) {
      const button = document.createElement('button');
      button.className = 'mode-card';
      button.dataset.modeCc = cc; button.dataset.modeValue = mode.value;
      button.setAttribute('aria-label', `Selecionar ${mode.name}`);
      button.innerHTML = `${svgDrawing(mode.drawing)}<strong>${mode.name}</strong><span>${mode.summary}</span>`;
      button.onclick = () => change(controls.find((c) => c.cc === cc), mode.value);
      grid.append(button);
    }
    const description = document.createElement('p');
    description.className = 'mode-description'; description.id = `mode-description-${cc}`;
    channelSection.append(heading, grid, description); section.append(channelSection);
  }
  $('panel-performance').insertBefore(section, $('panel-performance').querySelector('.control-group'));
  if (!pedal.waveformCc) return;
  const hiddenDiagram = document.createElement('section');
  hiddenDiagram.className = 'hidden-diagram';
  hiddenDiagram.setAttribute('aria-label', 'Forma de onda do ramping');
  hiddenDiagram.innerHTML = `${svgDrawing('<path id="ramp-wave" d="M10 55 35 15 60 55 85 15 110 55"/>')}<div><strong id="ramp-wave-name"></strong><p>O movimento entre os teus pontos de partida.</p></div>`;
  $('panel-hidden').insertBefore(hiddenDiagram, $('panel-hidden').querySelector('.control-group'));
}
function updateModeIllustrations() {
  if (!$('mode-description-21')) return;
  for (const [cc] of pedal.modeGroups) {
    const selected = modeIllustrations.find((mode) => mode.cc === cc && mode.value === state[cc]);
    $(`mode-description-${cc}`).textContent = `${context.stale.has(cc) ? '~ ' : ''}${selected.description}`;
    document.querySelectorAll(`[data-mode-cc="${cc}"]`).forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.modeValue) === state[cc]));
      button.classList.toggle('stale', context.stale.has(cc));
      if (pedal.modePresentation) {
        const presentation = pedal.modePresentation({ ...state, [cc]: Number(button.dataset.modeValue) }, cc);
        button.setAttribute('aria-label', `Selecionar ${presentation.name}${pedal.effects ? ` · ${cc === 21 ? 'L' : 'R'}` : ''}`);
        if (button.dataset.family !== presentation.name) {
          button.dataset.family = presentation.name;
          button.innerHTML = `${svgDrawing(presentation.drawing)}<strong>${presentation.name}</strong><span>${presentation.summary}</span>`;
        }
      }
    });
    if (pedal.modePresentation) {
      const presentation = pedal.modePresentation(state, cc);
      $(`mode-description-${cc}`).textContent = `${context.stale.has(cc) ? '~ ' : ''}${presentation.description}`;
    }
  }
  if (pedal.waveformCc) {
    const waveform = state[pedal.waveformCc];
    $('ramp-wave-name').textContent = `Ramping · ${controlValueLabel(pedal.waveformCc, waveform, state)}${context.stale.has(pedal.waveformCc) ? ' (~)' : ''}`;
    $('ramp-wave').setAttribute('d', waveform < 15 ? 'M10 55 35 15 60 55 85 15 110 55'
      : waveform < 55 ? 'M10 55h20V15h25v40h25V15h30'
      : waveform < 81 ? 'M10 35Q22 0 35 35T60 35T85 35T110 35'
      : waveform < 127 ? 'M10 55h20V25h20v15h20V10h20v45h20'
      : 'M10 40Q23 65 35 30T60 25T85 40T110 15');
  }
  if (pedal.id === 'mood-mkii') {
    const wet = controls.find((c) => c.cc === 21).choices.find((choice) => choice.value === state[21]).label;
    const loop = controls.find((c) => c.cc === 23).choices.find((choice) => choice.value === state[23]).label;
    $('signal-flow').textContent = `${context.stale.has(22) || context.stale.has(21) || context.stale.has(23) ? '~ ' : ''}${state[22] === 0 ? 'IN' : state[22] === 2 ? `IN + LOOP (${loop})` : `LOOP (${loop})`} → WET (${wet}) → OUT`;
  } else $('signal-flow').textContent = `${[21, 22, 23, 72].some((cc) => context.stale.has(cc)) ? '~ ' : ''}${pedal.signal(state)}`;
  updateModeTools();
  for (const [cc] of pedal.modeGroups) $(`mode-description-${cc}`).textContent = `${context.stale.has(cc) ? '~ ' : ''}${modeDetail(pedal, state, cc)}`;
}
createModeIllustrations();
function createModeTools() {
  const section = document.createElement('section');
  section.id = 'mode-tools'; section.className = 'mode-tools';
  const addMenu = (id, title, choices, cc) => {
    const label = document.createElement('label'); label.textContent = title;
    const input = document.createElement('select'); input.id = id;
    choices.forEach((choice) => input.add(new Option(choice.label, String(choice.value))));
    input.onchange = () => change(controls.find((control) => control.cc === cc), Number(input.value));
    label.append(input); section.append(label);
  };
  if (pedal.models) {
    addMenu('model-select', 'Modelos de fita', pedal.models, 16);
    const classic = document.createElement('button'); classic.id = 'classic-shortcut';
    classic.textContent = 'Classic';
    classic.onclick = () => change(controls.find((control) => control.cc === 72), state[72] ? 0 : 1);
    section.append(classic);
  }
  if (pedal.stations) addMenu('station-select', 'RADIO · estações', pedal.stations, 19);
  if (pedal.chords) addMenu('chord-select', 'FLIP · acordes', pedal.chords, 17);
  if (pedal.effects) {
    for (const [modeCc, modifyCc] of [[21, 17], [23, 19]]) {
      const row = document.createElement('div'); row.className = 'effect-row';
      const heading = document.createElement('h4'); heading.id = `effect-title-${modeCc}`; row.append(heading);
      for (const value of [0, 64, 127]) {
        const button = document.createElement('button');
        button.dataset.effectCc = modeCc; button.dataset.modifyValue = value;
        button.onclick = () => change(controls.find((control) => control.cc === modifyCc), value);
        row.append(button);
      }
      const hint = document.createElement('p'); hint.className = 'hint';
      hint.textContent = 'Escolhe A/B, depois ajusta MODIFY para a intensidade. Para aceder às famílias do outro canal, usa L SWAP ou R SWAP em DIP / Ramp.';
      row.append(hint); section.append(row);
    }
  }
  if (section.children.length) $('panel-performance').insertBefore(section, $('panel-performance').querySelector('.control-group'));
}
function updateModeTools() {
  const syncMenu = (id, cc, disabled = false, intervals = false) => {
    const input = $(id);
    if (!input) return;
    input.querySelector('[data-dynamic]')?.remove();
    input.disabled = disabled;
    const value = intervals ? pedal.chords.findLast((chord) => chord.value <= state[cc]).value : state[cc];
    if (![...input.options].some((option) => Number(option.value) === value)) {
      const option = new Option(`${Math.round(value / 127 * 100)}% · ajuste atual`, String(value)); option.dataset.dynamic = 'true'; option.disabled = true;
      input.add(option);
    }
    input.value = value;
    input.classList.toggle('stale', context.stale.has(cc));
  };
  syncMenu('model-select', 16, state[72] > 0);
  syncMenu('station-select', 19, state[23] !== 2);
  syncMenu('chord-select', 17, state[21] !== 3, true);
  if ($('classic-shortcut')) {
    $('classic-shortcut').setAttribute('aria-pressed', String(state[72] > 0));
    $('classic-shortcut').classList.toggle('stale', context.stale.has(72));
  }
  if (pedal.effects) {
    for (const [cc, modify] of [[21, 17], [23, 19]]) {
      const family = pedal.effects(state, cc);
      const current = state[modify] < 64 ? 0 : state[modify] > 64 ? 127 : 64;
      $(`effect-title-${cc}`).textContent = `${cc === 21 ? 'L' : 'R'} · ${family[0]} · ${current === 64 ? 'Neutral' : family[current === 0 ? 1 : 2]}`;
      document.querySelectorAll(`[data-effect-cc="${cc}"]`).forEach((button) => {
        const value = Number(button.dataset.modifyValue);
        button.textContent = value === 64 ? 'Neutral' : `${value === 0 ? 'A' : 'B'} · ${family[value === 0 ? 1 : 2]}`;
        button.setAttribute('aria-pressed', String(current === value));
        button.classList.toggle('stale', context.stale.has(cc) || context.stale.has(modify));
      });
    }
  }
}
createModeTools();
updateModeIllustrations();
const keyboard = document.createElement('div');
keyboard.className = 'keyboard-section';
keyboard.innerHTML = '<h4>Teclado · C4–C5</h4><label class="velocity-label">Velocidade <input id="velocity" type="range" min="1" max="127" value="100"></label><div class="keyboard" id="keyboard"></div><button id="stop-notes" class="text-button">Parar notas ativas</button><p class="hint">Mantém uma tecla premida para tocar o som capturado. Teclado: Espaço / Enter.</p>';
if (pedal.synth) $('panel-synth').prepend(keyboard);
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
if (pedal.synth) noteNames.forEach((name, index) => {
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
if (pedal.synth) $('stop-notes').onclick = stopNotes;
$('back-pedals').onclick = (event) => { if (!stopNotes()) event.preventDefault(); };
window.addEventListener('blur', stopNotes);
window.addEventListener('pagehide', stopNotes);
window.addEventListener('beforeunload', (event) => {
  if (!stopNotes()) { event.preventDefault(); event.returnValue = ''; }
});
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
      notify($('output').options.length === 1 ? 'Nenhuma saída MIDI encontrada. Liga uma interface USB–MIDI e tenta novamente.' : '');
    }
  } catch (error) {
    notify(`Acesso MIDI recusado ou indisponível: ${error.message}. Verifica as permissões do navegador.`);
  } finally { $('connect').disabled = false; }
};
$('output').onchange = () => { stopNotes(); switchContext(); updateConnection(); };
$('channel').onchange = () => { stopNotes(); switchContext(); updateConnection(); };
$('demo').onchange = () => { stopNotes(); switchContext(); updateConnection(); };
$('clear-log').onclick = () => { $('log').replaceChildren(); $('monitor-empty').hidden = false; };
$('technical-values').onchange = () => document.body.classList.toggle('technical-view', $('technical-values').checked);
updateConnection();
