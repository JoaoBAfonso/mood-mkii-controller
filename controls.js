export const manualUrl = 'https://www.chasebliss.com/s/MOOD-MKII_MIDI-Manual_Pedal_Chase-Bliss.pdf';
const options = (...labels) => labels.map((label, value) => ({ label, value }));
const three = (...labels) => labels.map((label, index) => ({ label, value: [0, 2, 3][index] }));
const range = (cc, name, group, initial = 64, hint = '') =>
  ({ cc, name, group, kind: 'range', min: 0, max: 127, initial, hint });
const select = (cc, name, group, choices, initial = choices[0].value, hint = '') =>
  ({ cc, name, group, kind: 'select', choices, initial, hint });
const toggle = (cc, name, group, hint = '') =>
  ({ cc, name, group, kind: 'toggle', initial: 0, hint });
const action = (cc, name, group, value = 1, confirmation = '') =>
  ({ cc, name, group, kind: 'action', value, confirmation });
const divisions = options('1/32', '1/16', '1/8 tercina', '1/8', '1/8 pontuada', '1/4', '1/2', '1');

export const hiddenPedalMap = { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 21: 31, 22: 32, 23: 33 };

export const controls = [
  range(14, 'TIME', 'pedal', 64, 'Tempo do canal Wet. Sincronizado: 0–12 = 1/32; 13–36 = 1/16; 37–61 = tercina; 62–84 = 1/8; 85–110 = 1/8 pontuada; 111–127 = 1/4.'),
  range(15, 'MIX', 'pedal', 64, 'Mistura dry/wet. A função física RAMP tem o seu próprio CC20.'),
  range(16, 'LENGTH', 'pedal', 64, 'Comprimento do micro-loop. Tape sincronizado: 0–12 = /32; 13–36 = /16; 37–61 = /8; 62–84 = /4; 85–110 = /2; 111–127 = ×1.'),
  range(17, 'MODIFY · WET', 'pedal', 64, 'Modificação do efeito Wet; depende do algoritmo selecionado.'),
  range(18, 'CLOCK', 'pedal', 64, 'Sample rate de ambos os canais. Mover este controlo sai do modo Synth.'),
  range(19, 'MODIFY · LOOP', 'pedal', 64, 'Velocidade/alteração do micro-loop; depende do modo ENV, TAPE ou STRETCH.'),
  select(21, 'WET', 'pedal', three('REVERB', 'DELAY', 'SLIP')),
  select(22, 'ROUTING', 'pedal', three('IN', 'LOOP + IN', 'LOOP'), 2),
  select(23, 'MICRO-LOOP', 'pedal', three('ENV', 'TAPE', 'STRETCH')),
  toggle(103, 'WET', 'footswitch', 'Ativar/desativar o canal Wet.'),
  toggle(102, 'MICRO-LOOP', 'footswitch', 'Ativar/desativar o micro-looper.'),
  toggle(105, 'Freeze · Wet', 'performance'),
  toggle(106, 'Overdub · Loop', 'performance'),
  action(107, 'Tap tempo', 'performance'),
  action(93, 'Tap tempo · CC legado', 'performance'),
  toggle(104, 'Hidden menu', 'hidden', 'Troca os controlos do pedal virtual para o banco Hidden. Ao sair, recupera os valores normais da interface, sem os reenviar.'),
  range(24, 'Stereo width · Wet', 'hidden'),
  select(25, 'Ramping waveform', 'hidden', [
    { value: 0, label: 'Triangular · 0–14' },
    { value: 15, label: 'Quadrada · 15–54' },
    { value: 55, label: 'Senoidal · 55–80' },
    { value: 81, label: 'Sample & hold · 81–126' },
    { value: 127, label: 'Random suave · 127' },
  ]),
  range(26, 'Fade · Loop', 'hidden'),
  range(27, 'Tone · Wet', 'hidden'),
  range(28, 'Level balance', 'hidden'),
  range(29, 'Direct micro-loop', 'hidden'),
  select(31, 'Sync', 'hidden', three('Loop → Wet', 'Sem sync', 'Wet → Loop'), 2),
  select(32, 'Spread · destino', 'hidden', three('Só Wet', 'Ambos', 'Só Loop'), 2),
  select(33, 'Buffer length', 'hidden', [{ value: 0, label: 'Half · como MKI' }, { value: 2, label: 'Full' }], 2),
  range(20, 'Ramp speed', 'ramping'),
  toggle(52, 'Resume ramping', 'ramping', 'Desligado envia 0 (stop); ligado envia 1 (resume).'),
  ...['TIME', 'MODIFY · WET', 'CLOCK', 'MODIFY · LOOP', 'LENGTH', 'BOUNCE'].map((name, i) => toggle(61 + i, name, 'dip-left')),
  select(67, 'SWEEP', 'dip-left', options('Bottom', 'Top')),
  select(68, 'POLARITY', 'dip-left', options('Forward', 'Reverse')),
  ...['CLASSIC', 'MISO', 'SPREAD', 'DRY KILL', 'TRAILS', 'LATCH', 'NO DUB', 'SMOOTH'].map((name, i) => toggle(71 + i, name, 'dip-right')),
  select(51, 'MIDI clock', 'global', options('Ignorar', 'Seguir'), 1, 'Guardado globalmente no pedal. O relógio deve vir de um controlador/DAW externo.'),
  select(53, 'Clock division · Wet', 'global', divisions, 5, 'Guardado globalmente.'),
  select(54, 'Clock division · Loop', 'global', divisions, 5, 'Guardado globalmente.'),
  select(55, 'Bypass mode', 'global', options('Buffered', 'True bypass')),
  range(100, 'Expression over MIDI', 'performance'),
  select(57, 'Octave transpose', 'synth', Array.from({ length: 9 }, (_, i) => ({ value: i + 1, label: `${(i + 1) * 12} semitons` })), 3, 'Configuração global.'),
  select(58, 'Output type', 'synth', options('Open', 'Note On/Off', 'ADSR')),
  range(80, 'Attack', 'synth', 0),
  range(81, 'Decay', 'synth', 64),
  range(82, 'Sustain', 'synth', 100),
  range(83, 'Release', 'synth', 64),
  range(84, 'Portamento', 'synth', 0),
  range(0, 'Pitch bend · ±4 semitons', 'synth', 64, 'CC0, conforme o manual; não é uma mensagem MIDI Pitch Bend de 14 bits.'),
  range(1, 'Modulation wheel', 'synth', 0),
  action(59, 'Sair do modo Synth', 'synth'),
  { cc: 111, name: 'Guardar no pedal', group: 'presets', kind: 'save', confirmation: 'Guardar neste slot do pedal? O preset existente será substituído.' },
  action(110, 'MIDI reset', 'maintenance', 1, 'Repor as configurações MIDI globais? Clock follow, transposição, divisões, portamento e gate serão repostos.'),
  action(56, 'Factory reset', 'maintenance', 1, 'ATENÇÃO: executar FACTORY RESET no pedal? Esta operação pode apagar os teus presets e configurações.'),
];

export function controlValueLabel(cc, value, state) {
  if (cc === 25) {
    return [[14, 'Triangular'], [54, 'Quadrada'], [80, 'Senoidal'], [126, 'S&H'], [127, 'Random']].find(([max]) => value <= max)[1];
  }
  if (cc === 18) {
    const steps = [[4, '2k'], [15, '3k'], [28, '4k'], [40, '6k'], [53, '8k'], [69, '12k'], [83, '16k'], [95, '24k'], [109, '32k'], [121, '48k'], [127, '64k']];
    return `${steps.find(([max]) => value <= max)[1]} Hz`;
  }
  if (cc === 19 && state[23] === 2) {
    const steps = [[4, '−4×'], [23, '−2×'], [42, '−1×'], [61, '−0.5×'], [84, '+0.5×'], [97, '+1×'], [119, '+2×'], [127, '+4×']];
    return steps.find(([max]) => value <= max)[1];
  }
  if (cc === 19 && state[23] > 2) {
    const steps = [[15, 'Reverse'], [30, '−1.5×'], [46, '−2×'], [60, '−4×'], [80, 'Stalled'], [96, '+4×'], [111, '+2×'], [126, '+1.5×'], [127, 'Forward']];
    return steps.find(([max]) => value <= max)[1];
  }
  return `${Math.round(value / 127 * 100)}%`;
}
