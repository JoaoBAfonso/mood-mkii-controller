import { controls as moodControls, controlValueLabel as moodLabel, hiddenPedalMap, manualUrl, range, select, toggle, action, options, three } from './controls.js?v=2.1.0';

const save = () => ({ cc: 111, name: 'Guardar no pedal', group: 'presets', kind: 'save', confirmation: 'Guardar neste slot do pedal? O preset existente será substituído.' });
const reset = () => action(56, 'Factory reset', 'maintenance', 1, 'ATENÇÃO: executar FACTORY RESET? Esta operação pode apagar presets e configurações.');
const expression = () => range(100, 'Expression over MIDI', 'performance');
const clock = () => select(51, 'MIDI clock', 'global', options('Ignorar', 'Seguir'), 1, 'Configuração global. Clock fornecido por uma DAW/controlador externo.');
const dipBank = (start, names, group) => names.map((name, index) => toggle(start + index, name, group));
const sweep = (cc) => select(cc, 'SWEEP', 'dip-left', options('Bottom', 'Top'));
const polarity = (cc, group) => select(cc, 'POLARITY', group, options('Forward', 'Reverse'));
const standardDips = (centre, right) => [
  ...dipBank(61, ['TIME', 'MODIFY · L', centre, 'MODIFY · R', 'LENGTH', 'BOUNCE'], 'dip-left'),
  sweep(67), polarity(68, 'dip-left'), ...dipBank(71, right, 'dip-right'),
];
const hardwareHidden = (name = 'Hidden menu · hardware') => toggle(104, name, 'hidden', 'Muda o modo no hardware. Os separadores mudam apenas a vista, sem enviar MIDI.');
const route = (labels) => select(22, 'ROUTING', 'pedal', three(...labels), 2);
const normalKnobs = (names) => names.map((name, index) => range(14 + index, name, 'pedal'));
const rawPercent = (cc, value) => `${Math.round(value / 127 * 100)}%`;
const drawings = {
  space: '<path d="M18 35h12m8-15q18 15 0 30m14-38q28 23 0 46m14-54q37 31 0 62"/><circle cx="24" cy="35" r="4"/>',
  echo: '<path d="M12 52V18h12v34h16V25h12v27h16V32h12v20h16V39h12v13"/>',
  pitch: '<path d="M14 45h88m-75-6V19h20v20m9 0V12h20v27m9 0V25h12v14M32 58h55m-6-5 6 5-6 5M25 8l-8 8 8 8"/>',
  grain: '<path d="M10 52h96M14 50l9-29 9 29m10 0 9-40 9 40m10 0 9-22 9 22m10 0 6-15"/>',
  tape: '<circle cx="35" cy="35" r="20"/><circle cx="82" cy="35" r="20"/><circle cx="35" cy="35" r="5"/><circle cx="82" cy="35" r="5"/><path d="M35 15h47M35 55h47m-56-28 18 16m29-16 18 16"/>',
  stretch: '<path d="M12 50V25h10v25h9V16h16v34h10V25h22v25h12V16h17v34M12 60h96m-89-5-7 5 7 5m82-10 7 5-7 5"/>',
  radio: '<path d="M12 28h96v35H12zM24 28l50-19M70 38h26m-26 8h26"/><circle cx="35" cy="46" r="10"/>',
};
const mode = (cc, value, name, description, drawing, summary = '') => ({ cc, value, name, description, summary, drawing: drawings[drawing] });
const modesMood = [
  mode(21, 0, 'REVERB', 'TIME define tamanho e decaimento. MODIFY difunde os ecos, de multi-tap a reverb.', 'space', 'Um espaço que se abre.'),
  mode(21, 2, 'DELAY', 'TIME espaça as repetições. MODIFY controla o feedback.', 'echo', 'Ecos que se encontram.'),
  mode(21, 3, 'SLIP', 'TIME escolhe a janela de áudio. MODIFY altera velocidade e direção.', 'pitch', 'Tempo, direção e altura.'),
  mode(23, 0, 'ENV', 'LENGTH escolhe os fragmentos. MODIFY regula a sensibilidade ao toque.', 'grain', 'Fragmentos vivos.'),
  mode(23, 2, 'TAPE', 'LENGTH define o loop. MODIFY muda velocidade e direção.', 'tape', 'Um loop em movimento.'),
  mode(23, 3, 'STRETCH', 'LENGTH define os fragmentos. MODIFY estica o áudio e altera a direção.', 'stretch', 'De um instante, uma paisagem.'),
];
const mood = {
  id: 'mood-mkii', name: 'MOOD MKII', title: 'MOOD', edition: 'MKII', variant: 'Lavanda',
  subtitle: 'Um instante de som. Todo um universo para explorar.', category: 'Spatial chemistry.',
  controls: moodControls, label: moodLabel, hiddenMap: hiddenPedalMap, hiddenCc: 104, hiddenOn: 1, hiddenOff: 0,
  manualUrl, mainManualUrl: 'https://www.chasebliss.com/s/MOOD-MKII_Manual_Pedal_Chase-Bliss.pdf',
  synth: true, clockCc: 18, waveformCc: 25, modeGroups: [[21, 'Wet channel'], [23, 'Micro-looper channel']], modes: modesMood,
  signal: (state) => `${state[22] === 0 ? 'IN' : state[22] === 2 ? 'IN + LOOP' : 'LOOP'} → WET → OUT`,
  note: 'Knobs normais e Hidden independentes. CLOCK afeta os dois canais.',
};

const lostControls = [
  ...normalKnobs(['TIME · L', 'MIX', 'TIME · R', 'MODIFY · L', 'BLEND', 'MODIFY · R']),
  select(21, 'L · 1 / 2 / 3', 'pedal', three('1 · REVERB', '2 · PITCH', '3 · WARP')),
  route(['L → R', 'L + R', 'R → L']),
  select(23, 'R · 4 / 5 / 6', 'pedal', three('4 · DELAY', '5 · SYNTH', '6 · BEND')),
  toggle(103, 'L', 'footswitch'), toggle(102, 'R', 'footswitch'),
  hardwareHidden('ALT menu · hardware'),
  toggle(105, 'Hold · L', 'performance', 'Função secundária específica do efeito no canal L.'),
  toggle(106, 'Hold · R', 'performance', 'Função secundária específica do efeito no canal R.'),
  range(20, 'Ramp speed', 'ramping'), range(24, 'ALT · L', 'hidden'),
  range(25, 'SPILL', 'hidden'), range(26, 'ALT · R', 'hidden'),
  range(27, 'EQ · L', 'hidden'), range(28, 'GLUE', 'hidden', 0),
  range(29, 'EQ · R', 'hidden'), range(30, 'Master wet volume', 'hidden'),
  select(32, 'Spread · destino', 'hidden', three('Só L', 'Ambos', 'Só R'), 2),
  clock(), select(52, 'Ramping', 'ramping', options('Stop', 'Resume'), 1),
  ...[53, 54].map((cc) => select(cc, `Tap subdivision · ${cc === 53 ? 'L' : 'R'}`, 'global',
    options('1/32', '1/16', '1/16 tercina', '1/8', '1/8 tercina', '1/8 pontuada', '1/4', '1/4 tercina', '1/4 pontuada', '1/2', '1/2 pontuada', '1', '2'), 6)),
  reset(), toggle(57, 'Dry kill', 'global'), action(93, 'Tap tempo', 'performance'), expression(), save(),
  action(112, 'Random · L', 'performance'), action(113, 'Random · R', 'performance'), action(114, 'Random · ambos', 'performance'),
  ...dipBank(61, ['TIME · L', 'MODIFY · L', 'BLEND', 'MODIFY · R', 'TIME · R', 'BOUNCE'], 'dip-left'),
  sweep(67), polarity(68, 'dip-left'),
  ...dipBank(71, ['MISO', 'SPREAD', 'LATCH', 'L SWAP', 'R SWAP', 'UNSYNC', 'TRAILS', 'BANK'], 'dip-right'),
];
const lostFamilies = [
  ['REVERB', 'Slow-verb', 'Useful Ambience', 'space', 'TIME: tamanho. MODIFY: decaimento. ALT: difusão.'],
  ['PITCH', 'Orchestral Swell', 'Pitch Repeater', 'pitch', 'TIME: swell/delay. MODIFY: pitch. ALT: feedback/repetições.'],
  ['WARP', 'Pinging Phaser', 'Spectral Modulator', 'stretch', 'TIME: rate. MODIFY: polos/depth. ALT: ressonância.'],
  ['DELAY', 'Tape Echo', 'Grain Tumbler', 'echo', 'TIME: delay/grain size. MODIFY: feedback. ALT: estabilidade/grain shape.'],
  ['SYNTH', 'Impulse Synthesizer', 'Sympathetic Resonator', 'grain', 'TIME: portamento/onset. MODIFY: textura/feedback. ALT: envelope/oitava.'],
  ['BEND', 'Ensemble Expander', 'Gen Lite', 'tape', 'TIME: rate. MODIFY: depth. ALT: vozes/crinkles e snags.'],
];
function lostFamilyFor(state, cc) {
  const left = cc === 21;
  const swapped = state[left ? 74 : 75] > 0;
  return lostFamilies[(left !== swapped ? 0 : 3) + (state[cc] === 0 ? 0 : state[cc] === 2 ? 1 : 2)];
}
const lost = {
  id: 'lost-found', name: 'Lost + Found', title: 'LOST + FOUND', edition: '', variant: 'Verde',
  subtitle: 'Uma coleção de curiosidades. Doze efeitos para descobrir.', category: 'Collection of curiosities.',
  controls: lostControls, hiddenMap: { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 22: 32 },
  hiddenCc: 104, hiddenOn: 1, hiddenOff: 0,
  label: rawPercent, synth: false,
  manualUrl: 'https://www.chasebliss.com/s/Lost-Found_MIDI-Manual_Pedal_Chase-Bliss.pdf',
  mainManualUrl: 'https://cb2k22.squarespace.com/s/Lost-Found_Manual_Pedal_Chase-Bliss.pdf',
  modeGroups: [[21, 'Canal L · famílias 1–3'], [23, 'Canal R · famílias 4–6']],
  modes: [21, 23].flatMap((cc) => [0, 2, 3].map((value, index) => {
    const family = lostFamilies[(cc === 21 ? 0 : 3) + index];
    return mode(cc, value, family[0], family[4], family[3], `${family[1]} / ${family[2]}`);
  })),
  modePresentation: (state, cc) => {
    const family = lostFamilyFor(state, cc);
    return { name: family[0], drawing: drawings[family[3]], summary: `${family[1]} / ${family[2]}`, description: family[4] };
  },
  signal: (state) => state[22] === 0 ? 'IN → L → R → GLUE → OUT' : state[22] === 2 ? 'IN → (L + R) → GLUE → OUT' : 'IN → R → L → GLUE → OUT',
  effects: (state, cc) => lostFamilyFor(state, cc),
  note: 'MODIFY seleciona A à esquerda, B à direita e neutral ao centro. L SWAP/R SWAP trocam as famílias entre canais; BANK troca os presets físicos para 3/4, não os 12 efeitos. Random torna os valores da interface não sincronizados.',
};

const models = [
  [0, 'OFF / Unfiltered'], [15, 'CPR-3300 Gen 1'], [24, 'CPR-3300 Gen 2'], [33, 'CPR-3300 Gen 3'],
  [43, 'Portamax-RT'], [53, 'Portamax-HT'], [62, 'CAM-8'], [72, 'DICTATRON-EX'], [82, 'DICTATRON-IN'],
  [91, 'FISHY 60'], [101, 'MS-WALKER'], [111, 'AMU-2'], [127, 'M-PEX'],
].map(([value, label]) => ({ value, label }));
const genControls = [
  ...normalKnobs(['WOW', 'VOLUME', 'MODEL / LP', 'FLUTTER', 'SATURATE / GEN', 'FAILURE / HP']),
  select(21, 'AUX', 'pedal', [{ value: 1, label: 'STOP' }, { value: 2, label: 'FILTER' }, { value: 3, label: 'FAIL' }]),
  select(22, 'DRY', 'pedal', [{ value: 1, label: 'NONE' }, { value: 2, label: 'SMALL' }, { value: 3, label: 'UNITY' }]),
  select(23, 'NOISE', 'pedal', [{ value: 1, label: 'NONE' }, { value: 2, label: 'MILD' }, { value: 3, label: 'HEAVY' }]),
  toggle(103, 'AUX', 'footswitch'), toggle(102, 'BYPASS', 'footswitch'),
  { ...hardwareHidden('ALT menu · hardware'), initial: 1, onValue: 0, offValue: 1, hint: 'CC104 é invertido neste pedal: 0 entra em ALT, 1–127 sai. ON na interface significa ALT ativo.' },
  range(20, 'Ramp speed', 'ramping'),
  range(24, 'AUX onset', 'hidden'), select(26, 'Bypass type', 'hidden', [{ value: 0, label: 'True bypass' }, { value: 127, label: 'DSP bypass' }], 0, 'O manual não define o valor 64. Usamos 0/127, sem enviar o ponto ambíguo.'),
  range(27, 'Hiss level', 'hidden'), range(28, 'Mechanical noise', 'hidden'), range(29, 'Crinkle / pop', 'hidden'),
  select(32, 'Input gain', 'hidden', [{ value: 1, label: 'Line level' }, { value: 2, label: 'Instrument level' }, { value: 3, label: 'High gain' }], 2),
  toggle(52, 'Ramp / Bounce', 'ramping'), expression(), save(),
  toggle(105, 'AUX · left switch', 'performance'), toggle(106, 'AUX · centre switch', 'performance'), toggle(107, 'AUX · right switch', 'performance'),
  ...dipBank(61, ['WOW', 'FLUTTER', 'SAT / GEN', 'FAILURE / HP', 'MODEL / LP', 'BOUNCE', 'RANDOM'], 'dip-left'),
  sweep(68), polarity(71, 'dip-right'),
  ...dipBank(72, ['CLASSIC', 'MISO', 'SPREAD', 'DRY TYPE', 'DROP BYP', 'SNAG BYP', 'HUM BYP'], 'dip-right'),
];
const generation = {
  id: 'generation-loss-mkii', name: 'Generation Loss MKII', title: 'GENERATION LOSS', edition: 'MKII', variant: 'Azul VHS',
  subtitle: 'A memória da fita. Saturação, instabilidade e nostalgia.', category: 'VHS duplicator.',
  controls: genControls, hiddenMap: { 14: 24, 15: 20, 16: 26, 17: 27, 18: 28, 19: 29, 22: 32 },
  hiddenCc: 104, hiddenOn: 0, hiddenOff: 1, synth: false, models,
  manualUrl: 'https://www.chasebliss.com/s/Generation-Loss-MKII_MIDI-Manual_Pedal_Chase-Blisspdf.pdf',
  mainManualUrl: 'https://cb2k22.squarespace.com/s/Generation-Loss-MKII_Manual_Pedal_Chase-Bliss.pdf',
  label: (cc, value, state) => cc === 16 && !state[72] ? models.find((model) => model.value === value)?.label || rawPercent(cc, value) : rawPercent(cc, value),
  modeGroups: [[21, 'AUX · performance']],
  modes: [
    mode(21, 1, 'STOP', 'Simula a paragem da fita. A velocidade de chegada é controlada por AUX onset.', 'tape', 'Travar o tempo.'),
    mode(21, 2, 'FILTER', 'A função AUX desativa o modelo de fita e deixa passar o sinal sem essa filtragem.', 'space', 'Libertar o sinal.'),
    mode(21, 3, 'FAIL', 'A função AUX acentua falhas. DROP/SNAG/HUM BYP permitem escolher o que participa.', 'grain', 'Deixar a fita falhar.'),
  ],
  modePresentation: (state, cc) => {
    const selected = generation.modes.find((item) => item.cc === cc && item.value === state[cc]);
    return state[cc] === 3 && state[72] && state[76] && state[77]
      ? { ...selected, name: 'FREEZE', summary: 'Suster a memória da fita.' } : selected;
  },
  signal: (state) => `IN → ${state[72] ? 'CLASSIC · LP / GEN / HP' : 'MODEL / SATURATE / FAILURE'} → OUT`,
  note: 'CLASSIC (CC72) muda MODEL → LP, SATURATE → GEN e FAILURE → HP; são os mesmos CC14–19. FREEZE: Classic + AUX em FAIL + DROP BYP/SNAG BYP ligados. Não há Synth, tap tempo ou Factory Reset documentados. Os modelos usam os valores exatos da tabela oficial.',
};

const badControls = [
  ...normalKnobs(['TIME', 'MIX', 'LENGTH', 'MODIFY · WET', 'CLOCK', 'MODIFY · LOOP']),
  select(21, 'WET', 'pedal', three('SOUP', 'RELAY', 'FLIP')),
  route(['IN', 'LOOP + IN', 'LOOP']), select(23, 'MICRO-LOOP', 'pedal', three('BURST', 'RADIO', 'MASK')),
  toggle(103, 'WET', 'footswitch'), toggle(102, 'MICRO-LOOP', 'footswitch'), hardwareHidden(),
  toggle(105, 'Freeze · Wet', 'performance'), toggle(106, 'Overdub · Loop', 'performance'),
  range(20, 'Ramp speed', 'ramping'), range(24, 'CROSS', 'hidden', 0), range(25, 'BALANCE', 'hidden'),
  range(26, 'FADE', 'hidden'), range(27, 'EQ', 'hidden'), range(28, 'GLUE', 'hidden', 0),
  range(29, 'BLEND · Loop', 'hidden'), range(30, 'Master volume', 'hidden'),
  select(31, 'SYNC', 'hidden', three('Loop → Wet', 'Sem sync', 'Wet → Loop'), 2),
  select(32, 'SPREAD · destino', 'hidden', three('Só Wet', 'Ambos', 'Só Loop'), 2),
  select(33, 'CROSS input', 'hidden', three('Wet → Loop', 'Input → ambos', 'Loop → Wet'), 2),
  clock(), toggle(52, 'Resume ramping', 'ramping'),
  ...[53, 54].map((cc) => select(cc, `Clock division · ${cc === 53 ? 'Wet' : 'Loop'}`, 'global', options('1/32', '1/16', '1/8 tercina', '1/8', '1/4', '1/2', '1/2 pontuada', '1', '2'), 4, 'Guardado globalmente.')),
  select(55, 'Bypass mode', 'global', options('Buffered', 'True bypass')), reset(),
  select(85, 'EQ · destino', 'global', three('Só Wet', 'Ambos', 'Só Loop'), 2),
  action(93, 'Tap tempo', 'performance'), expression(),
  ...moodControls.filter((control) => control.group === 'synth').map((control) => ({ ...control })),
  action(110, 'MIDI reset', 'maintenance', 1, 'Repor configurações MIDI globais?'), save(),
  ...standardDips('CLOCK', ['MISO', 'SPREAD', 'DRY KILL', 'TRAILS', 'LATCH', 'HALF', 'SMOOTH', 'DRY GLUE']),
];
const stations = [[0, 'TAPE'], [32, 'AMBIENT'], [63, 'ORCHESTRAL'], [97, 'SHOEGAZE'], [127, 'DANCE']].map(([value, label]) => ({ value, label }));
const chordStarts = [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30, 32, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 61, 64, 67, 69, 72, 75, 77, 80, 83, 85, 88, 90, 93, 96, 98, 101, 104, 106, 109, 112, 114, 117, 120, 122, 125];
const chords = chordStarts.map((value, index) => ({ value, label: `Acorde ${index + 1} · ${value}–${(chordStarts[index + 1] ?? 128) - 1}` }));
const bad = {
  id: 'bad-mood', name: 'BAD MOOD', title: 'BAD MOOD', edition: 'INK', variant: 'Ink',
  subtitle: 'A face indomável da ambiência. Texturas que interferem.', category: 'Instant trouble.',
  controls: badControls, hiddenMap: { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 21: 31, 22: 32, 23: 33 },
  hiddenCc: 104, hiddenOn: 1, hiddenOff: 0, synth: true, clockCc: 18, stations, chords,
  manualUrl: 'https://www.chasebliss.com/s/BAD-MOOD_MIDI-Manual_Chase-Bliss.pdf',
  mainManualUrl: 'https://www.chasebliss.com/s/Bad-Mood_Manual_Chase-Bliss.pdf',
  label: (cc, value, state) => cc === 18 ? moodLabel(cc, value, state)
    : cc === 19 && state[23] === 2 ? stations.find((station) => station.value === value)?.label || `Scan ${value}`
    : cc === 17 && state[21] === 3 ? `Acorde ${chordStarts.findLastIndex((start) => value >= start) + 1}` : rawPercent(cc, value),
  modeGroups: [[21, 'Wet channel'], [23, 'Micro-looper channel']],
  modes: [
    mode(21, 0, 'SOUP', 'Reverb espectral que ressintetiza o sinal. TIME define decaimento/tamanho; MODIFY muda o caráter.', 'space', 'Ambiência deformada.'),
    mode(21, 2, 'RELAY', 'Repetições ao mesmo volume. TIME define o delay; MODIFY escolhe o número de repetições, até acumular loops.', 'echo', 'Repetições persistentes.'),
    mode(21, 3, 'FLIP', 'Harmonias fragmentadas. TIME define lag/espaçamento; MODIFY escolhe um dos 48 acordes documentados.', 'pitch', 'Acordes em pedaços.'),
    mode(23, 0, 'BURST', 'LENGTH define tamanho/velocidade; MODIFY controla a sensibilidade.', 'grain', 'Fragmentos em sequência.'),
    mode(23, 2, 'RADIO', 'MODIFY percorre as estações. LENGTH muda uma função dependente da estação.', 'radio', 'Percorrer as ondas.'),
    mode(23, 3, 'MASK', 'LENGTH altera o caráter; MODIFY ajusta a sensibilidade.', 'stretch', 'Disfarces musicais.'),
  ],
  signal: mood.signal,
  note: 'CROSS escolhe movimento dinâmico entre canais; GLUE satura/destrói no fim da cadeia. As divisões CC53/54 são diferentes das do MOOD. No modo RADIO, os pontos documentados são 0, 32, 63, 97 e 127.',
};
export const pedals = [mood, lost, generation, bad];
export function getPedal(id) { return pedals.find((pedal) => pedal.id === id); }
