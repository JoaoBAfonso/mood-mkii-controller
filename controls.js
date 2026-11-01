export const manualUrl = 'https://www.chasebliss.com/s/MOOD-MKII_MIDI-Manual_Pedal_Chase-Bliss.pdf';
export const options = (...labels) => labels.map((label, value) => ({ label, value }));
export const three = (...labels) => labels.map((label, index) => ({ label, value: [0, 2, 3][index] }));
export const range = (cc, name, group, initial = 64, hint = '') =>
  ({ cc, name, group, kind: 'range', min: 0, max: 127, initial, hint,
    endpoints: ['Low', 'High'], optionsHint: 'Knob position; not a calibrated measurement.' });
export const select = (cc, name, group, choices, initial = choices[0].value, hint = '') =>
  ({ cc, name, group, kind: 'select', choices, initial, hint });
export const toggle = (cc, name, group, hint = '') =>
  ({ cc, name, group, kind: 'toggle', initial: 0, hint });
export const action = (cc, name, group, value = 1, confirmation = '') =>
  ({ cc, name, group, kind: 'action', value, confirmation });
const divisions = options('1/32', '1/16', '1/8 triplet', '1/8', '1/8 dotted', '1/4', '1/2', '1');

export const hiddenPedalMap = { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 21: 31, 22: 32, 23: 33 };

export const controls = [
  range(14, 'TIME', 'pedal', 64, 'Wet channel timing. Synced: 0–12 = 1/32; 13–36 = 1/16; 37–61 = triplet; 62–84 = 1/8; 85–110 = dotted 1/8; 111–127 = 1/4.'),
  range(15, 'MIX', 'pedal', 64, 'Dry/wet mix. The physical RAMP function has its own CC20.'),
  range(16, 'LENGTH', 'pedal', 64, 'Micro-loop length. Synced Tape: 0–12 = /32; 13–36 = /16; 37–61 = /8; 62–84 = /4; 85–110 = /2; 111–127 = ×1.'),
  range(17, 'MODIFY · WET', 'pedal', 64, 'Wet effect adjustment; its function depends on the selected algorithm.'),
  range(18, 'CLOCK', 'pedal', 64, 'Sample rate of both channels. Moving this control exits Synth mode.'),
  range(19, 'MODIFY · LOOP', 'pedal', 64, 'Micro-loop speed or transformation, depending on ENV, TAPE or STRETCH.'),
  select(21, 'WET', 'pedal', three('REVERB', 'DELAY', 'SLIP')),
  select(22, 'ROUTING', 'pedal', three('IN', 'LOOP + IN', 'LOOP'), 2),
  select(23, 'MICRO-LOOP', 'pedal', three('ENV', 'TAPE', 'STRETCH')),
  toggle(103, 'WET', 'footswitch', 'Engage or bypass the Wet channel.'),
  toggle(102, 'MICRO-LOOP', 'footswitch', 'Engage or bypass the micro-looper.'),
  toggle(105, 'Freeze · Wet', 'performance'),
  toggle(106, 'Overdub · Loop', 'performance'),
  action(107, 'Tap tempo', 'performance'),
  action(93, 'Tap tempo · legacy CC', 'performance'),
  toggle(104, 'Hidden menu · hardware', 'hidden', 'Sends CC104 to the pedal and shows the corresponding bank. Tabs only change the view; dedicated CCs work without enabling this mode.'),
  range(24, 'Stereo width · Wet', 'hidden'),
  select(25, 'Ramping waveform', 'hidden', [
    { value: 0, label: 'Triangle' },
    { value: 15, label: 'Square' },
    { value: 55, label: 'Sine' },
    { value: 81, label: 'Sample & hold' },
    { value: 127, label: 'Smooth random' },
  ]),
  range(26, 'Fade · Loop', 'hidden'),
  range(27, 'Tone · Wet', 'hidden'),
  range(28, 'Level balance', 'hidden'),
  range(29, 'Direct micro-loop', 'hidden'),
  select(31, 'Sync', 'hidden', three('Loop → Wet', 'No sync', 'Wet → Loop'), 2),
  select(32, 'Spread · destination', 'hidden', three('Wet only', 'Both', 'Loop only'), 2),
  select(33, 'Buffer length', 'hidden', [{ value: 0, label: 'Half · MKI length' }, { value: 2, label: 'Full' }], 2),
  range(20, 'Ramp speed', 'ramping'),
  toggle(52, 'Resume ramping', 'ramping', 'Off sends 0 (stop); on sends 1 (resume).'),
  ...['TIME', 'MODIFY · WET', 'CLOCK', 'MODIFY · LOOP', 'LENGTH', 'BOUNCE'].map((name, i) => toggle(61 + i, name, 'dip-left')),
  select(67, 'SWEEP', 'dip-left', options('Bottom', 'Top')),
  select(68, 'POLARITY', 'dip-left', options('Forward', 'Reverse')),
  ...['CLASSIC', 'MISO', 'SPREAD', 'DRY KILL', 'TRAILS', 'LATCH', 'NO DUB', 'SMOOTH'].map((name, i) => toggle(71 + i, name, 'dip-right')),
  select(51, 'MIDI clock', 'global', options('Ignore', 'Follow'), 1, 'Stored globally on the pedal. Clock must come from an external controller or DAW.'),
  select(53, 'Clock division · Wet', 'global', divisions, 5, 'Stored globally.'),
  select(54, 'Clock division · Loop', 'global', divisions, 5, 'Stored globally.'),
  select(55, 'Bypass mode', 'global', options('Buffered', 'True bypass')),
  range(100, 'Expression over MIDI', 'performance'),
  select(57, 'Octave transpose', 'synth', Array.from({ length: 9 }, (_, i) => ({ value: i + 1, label: `${(i + 1) * 12} semitones` })), 3, 'Global setting.'),
  select(58, 'Output type', 'synth', options('Open', 'Note On/Off', 'ADSR')),
  range(80, 'Attack', 'synth', 0),
  range(81, 'Decay', 'synth', 64),
  range(82, 'Sustain', 'synth', 100),
  range(83, 'Release', 'synth', 64),
  range(84, 'Portamento', 'synth', 0),
  range(0, 'Pitch bend · ±4 semitones', 'synth', 64, 'CC0 as documented in the manual; not a 14-bit MIDI Pitch Bend message.'),
  range(1, 'Modulation wheel', 'synth', 0),
  action(59, 'Exit Synth mode', 'synth'),
  { cc: 111, name: 'Save to pedal', group: 'presets', kind: 'save', confirmation: 'Save to this pedal slot? The existing preset will be overwritten.' },
  action(110, 'MIDI reset', 'maintenance', 1, 'Reset global MIDI settings? Clock follow, transpose, divisions, portamento and gate will be reset.'),
  action(56, 'Factory reset', 'maintenance', 1, 'WARNING: run FACTORY RESET on the pedal? This may erase your presets and settings.'),
];

export function positionLabel(value, min = 0, max = 127, endpoints = ['Low', 'High']) {
  if (value === min) return endpoints[0];
  if (value === max) return endpoints[1];
  const position = (value - min) / (max - min);
  return position < 1 / 3 ? 'Low' : position > 2 / 3 ? 'High' : 'Mid';
}

export function controlEndpoints(cc, state = {}) {
  if (cc === 15) return ['Dry', 'Wet'];
  if (cc === 18) return ['2k Hz', '64k Hz'];
  if (cc === 100) return ['Heel', 'Toe'];
  if (cc === 14 || cc === 16) return ['Short', 'Long'];
  if (cc === 17) return state[21] === 2 ? ['No repeats', 'Infinite repeats'] : state[21] === 3 ? ['Lower pitch', 'Higher pitch'] : ['Multi-tap', 'Reverb'];
  if (cc === 19) return state[23] === 2 ? ['−4×', '+4×'] : state[23] === 3 ? ['Reverse', 'Forward'] : ['Less sensitive', 'More sensitive'];
  if (cc === 24) return ['Narrow', 'Wide'];
  if (cc === 26) return ['Fade old layers', 'Keep old layers'];
  if (cc === 27) return ['Dark', 'Bright'];
  if (cc === 28) return ['Wet', 'Micro-loop'];
  if (cc === 29) return ['No direct loop', 'Direct loop'];
  if (cc === 20) return ['Slow', 'Fast'];
  if (cc === 0) return ['−4 semitones', '+4 semitones'];
  return ['Low', 'High'];
}

for (const control of controls) {
  if (control.kind === 'range') control.endpoints = controlEndpoints(control.cc);
}

export function controlValueLabel(cc, value, state = {}) {
  if (cc === 25) {
    return [[14, 'Triangle'], [54, 'Square'], [80, 'Sine'], [126, 'S&H'], [127, 'Random']].find(([max]) => value <= max)[1];
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
  if (cc === 14 && state[51]) return [[12, '1/32'], [36, '1/16'], [61, '1/8 triplet'], [84, '1/8'], [110, '1/8 dotted'], [127, '1/4']].find(([max]) => value <= max)[1];
  if (cc === 16 && state[51] && state[23] === 2) return [[12, '/32'], [36, '/16'], [61, '/8'], [84, '/4'], [110, '/2'], [127, '×1']].find(([max]) => value <= max)[1];
  return positionLabel(value, 0, 127, controlEndpoints(cc, state));
}
