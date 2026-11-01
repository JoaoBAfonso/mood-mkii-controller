const cc = (number) => `cc-${number}`;
const nr = (number) => `nrpn-${number}`;
const slot = (id, label, x, y, w = 12, h = 22, visual = 'knob') => ({ ids: [id], label, x, y, w, h, visual });
const shared = (ids, bank, label, x, y, w, h, visual = 'knob') => ({ ids, bank, label, x, y, w, h, visual });
const reference = (label, x, y, w = 10, h = 18, visual = 'knob') => ({ label, x, y, w, h, visual, reference: true });
const menu = (id, title, sections, x, y, w = 14) => ({ id, title, sections, x, y, w });
const bank = (id, labels, x, y, w) => ({ id, labels, x, y, w });
const foot = (id, label, x, y, w = 18) => slot(id, label, x, y, w, 19, 'footswitch');

// Panel positions are original drawings measured against manufacturer top views.
// Slots describe physical actuators, not a parameter's presence in the MIDI table.
export const instrumentPanels = {
  'boss-sl-2': {
    width: 330, ratio: .57, surface: '#239c9a', ink: '#111e20', accent: '#e53d46',
    source: 'https://www.boss.info/global/products/sl-2/',
    slots: [
      reference('BALANCE / TEMPO', 3, 8, 20, 23, 'stacked'),
      reference('ATTACK / DUTY', 25, 8, 20, 23, 'stacked'),
      reference('VARIATION', 49, 8, 22, 23, 'numbered'),
      reference('TYPE', 74, 8, 22, 23, 'numbered'),
    ],
    markings: [
      ['CHECK', 40, 1, 20], ['SINGLE · DUAL · TREMOLO · HARMONIC · SFX', 50, 31, 47],
      ['OUTPUT B ←    OUTPUT A ←', 4, 40, 43], ['→ INPUT B    → INPUT A', 53, 40, 43],
      ['Slicer', 12, 47, 76, 'logo'], ['SL-2', 69, 55, 25, 'model'],
    ],
    references: [reference('BOSS · pedal switch', 8, 63, 84, 30, 'boss-treadle')],
    menus: [
      menu('slicer-performance', 'MIDI performance', ['Expression', 'Pedal', 'Performance'], 8, 95, 84),
    ],
  },
  'strymon-deco-v2': {
    width: 490, ratio: .94, surface: '#bbbcb8', ink: '#171c1b', accent: '#ef524e',
    source: 'https://www.strymon.net/product/deco/',
    slots: [
      slot(cc(12), 'SATURATION', 3, 7, 23, 23), slot(cc(18), 'LAG TIME', 74, 7, 23, 23),
      slot(cc(11), 'VOICE', 29, 7, 19, 22, 'toggle'), slot(cc(17), 'TYPE', 53, 7, 19, 22, 'toggle'),
      slot(cc(13), 'VOLUME', 3, 34, 23, 24), slot(cc(14), 'TONE', 27, 28, 22, 24),
      slot(cc(20), 'BLEND', 51, 28, 22, 24), slot(cc(19), 'WOBBLE', 75, 34, 22, 24),
      foot(cc(10), 'TAPE SATURATION', 8, 74, 22), foot(cc(16), 'DOUBLETRACKER', 71, 74, 22),
    ],
    markings: [['DECO', 28, 62, 44, 'logo'], ['tape saturation & doubletracker', 24, 70, 52], ['strymon', 34, 80, 32, 'brand']],
    menus: [
      menu('tape-secondary', 'Tape options', ['Tape Saturation'], 6, 59, 28),
      menu('double-secondary', 'Doubletracker options', ['Doubletracker', 'Performance'], 62, 59, 32),
      menu('deco-midi', 'MIDI / Expression', ['Synchronization', 'Expression', 'Presets'], 32, 94, 36),
    ],
  },
  'strymon-mobius': {
    width: 660, ratio: 1.28, surface: '#0876a7', ink: '#faf4df', accent: '#b0e751',
    source: 'https://www.strymon.net/product/mobius/',
    screen: { x: 4, y: 6, w: 32, h: 13, style: 'segment' },
    slots: [
      slot(cc(19), 'TYPE', 6, 28, 29, 38, 'algorithm'),
      slot(cc(17), 'SPEED', 53, 6, 14, 22), slot(cc(18), 'DEPTH', 69, 6, 14, 22),
      slot(cc(15), 'LEVEL', 85, 6, 13, 22),
      slot(cc(9), 'PARAM 1', 60, 36, 17, 23), slot(cc(16), 'PARAM 2', 79, 36, 17, 23),
      { ...foot(cc(80), 'A', 5, 76), tapSwitch: true }, { ...foot(cc(82), 'B', 41, 76), tapSwitch: true },
      { ...foot(cc(81), 'TAP', 78, 76), tapSwitch: true },
    ],
    markings: [['strymon', 37, 57, 28, 'brand'], ['MOBIUS', 34, 62, 40, 'logo'], ['BANK DOWN ───── BANK UP', 24, 91, 53]],
    menus: [
      menu('mobius-machine', 'VALUE · machine parameters', ['Chorus', 'Flanger', 'Rotary', 'Vibe', 'Phaser', 'Filter', 'Formant', 'Vintage Trem', 'Pattern Trem', 'Autoswell', 'Destroyer', 'Quadrature'], 38, 6, 14),
      menu('mobius-global', 'Global / Routing', ['Synchronization', 'Routing', 'Expression', 'Presets', 'Performance', 'Footswitches'], 36, 29, 25),
    ],
  },
  'source-audio-eq2': {
    width: 330, ratio: .56, surface: '#26365d', ink: '#f1f1d9', accent: '#d5de65',
    source: 'https://sourceaudio.net/products/eq2',
    eq: { x: 8, y: 6, w: 84, h: 29 },
    slots: [slot(cc(0), 'OUTPUT', 76, 36, 20, 17, 'small'), foot(cc(101), 'ON / OFF', 36, 80, 28)],
    markings: [['1   2   3   4', 9, 37, 29], ['EQ2', 22, 64, 56, 'logo'], ['PROGRAMMABLE EQ', 15, 73, 70], ['SOURCE AUDIO', 16, 94, 68, 'brand']],
    menus: [
      menu('eq-band', 'Band settings', ['Channel 1', 'Channel 2'], 32, 55, 36),
      menu('eq-output', 'Output / Routing', ['Levels', 'Input', 'Routing', 'Expression'], 8, 60, 84),
      menu('eq-performance', 'SELECT · presets / tuner', ['Presets', 'Performance'], 6, 44, 27),
    ],
  },
  'source-audio-nemesis-adt': {
    width: 520, ratio: 1.03, surface: '#252a2c', ink: '#ebeee3', accent: '#58c778',
    source: 'https://sourceaudio.net/products/nemesis',
    slots: [
      slot(cc(2), 'TIME', 3, 5, 22, 25), slot(cc(6), 'MIX', 75, 5, 22, 25),
      slot(cc(1), 'ENGINE', 29, 2, 42, 37, 'algorithm'),
      slot(cc(5), 'FEEDBACK', 2, 39, 22, 26), slot(cc(7), 'MOD', 27, 39, 22, 26),
      slot(cc(8), 'RATE', 51, 39, 22, 26), slot(cc(9), 'INTENSITY', 76, 39, 22, 26),
      slot(cc(42), 'SUBDIVISION', 79, 68, 18, 10, 'toggle'),
      foot(cc(101), 'ON / OFF', 6, 80, 23), foot(cc(93), 'TAP', 71, 80, 23),
    ],
    markings: [['NEMESIS', 25, 67, 50, 'logo'], ['DELAY', 36, 75, 28], ['SOURCE AUDIO · ADT', 29, 92, 42]],
    menus: [
      menu('nemesis-texture', 'Engine options', ['Time', 'Knobs', 'Texture', 'Filters', 'Tape', 'Modulation', 'Pitch', 'Assignments'], 3, 74, 27),
      menu('nemesis-routing', 'Taps / Routing', ['Taps', 'Routing', 'Levels'], 72, 74, 25),
      menu('nemesis-performance', 'Presets / Hold / MIDI', ['Performance', 'Presets', 'Synchronization'], 26, 95, 48),
    ],
  },
  'empress-reverb': {
    width: 650, ratio: 1.5, surface: '#dcdde2', ink: '#181822', accent: '#43b4b9',
    source: 'https://empresseffects.com/products/reverb',
    slots: [
      { ...slot(cc(20), 'MODE', 1, 7, 30, 45, 'algorithm'), legend: ['hall', 'plate', 'spring', 'room', 'sparkle', 'modulation', 'ambient swell', 'delay + reverb', 'reverse', 'ghost', 'lo-fi', 'beer'], packedModes: true },
      slot(cc(21), 'DECAY', 40, 5, 17, 23), slot(cc(22), 'MIX', 60, 5, 17, 23), slot(cc(23), 'OUTPUT', 80, 5, 17, 23),
      slot(cc(24), 'LOW', 27, 32, 17, 23), slot(cc(25), 'HI', 45, 32, 17, 23),
      slot(cc(26), 'THING 1', 63, 32, 17, 23), slot(cc(27), 'THING 2', 81, 32, 17, 23),
      foot(cc(35), 'SELECT', 3, 77, 16), foot(cc(36), 'SCROLL', 40, 77, 16), foot(cc(37), 'BYPASS', 82, 77, 16),
    ],
    markings: [['presets · · · · ·', 6, 58, 86], ['Reverb', 8, 65, 46, 'logo'], ['empress', 57, 85, 24, 'brand']],
    menus: [
      menu('reverb-variations', 'Mode variations', ['Reverb'], 7, 52, 26),
      menu('empress-save', 'SAVE / preset options', ['Presets', 'Footswitches'], 22, 83, 16),
      menu('empress-midi', 'Expression / MIDI', ['Expression', 'Synchronization', 'Performance'], 58, 93, 39),
    ],
  },
  'microfreak': {
    width: 1080, minWidth: 900, ratio: 3.75, surface: '#22272b', ink: '#eae8dd', accent: '#f47829',
    source: 'https://www.arturia.com/products/hardware-synths/microfreak/overview',
    screen: { x: 55, y: 6, w: 12, h: 17, style: 'oled' },
    slots: [
      slot(cc(5), 'GLIDE', 1, 33, 7, 27),
      slot(cc(9), 'TYPE', 13, 33, 7, 27, 'orange'), slot(cc(10), 'WAVE', 21, 33, 7, 27, 'orange'),
      slot(cc(12), 'TIMBRE', 29, 33, 7, 27, 'orange'), slot(cc(13), 'SHAPE', 37, 33, 7, 27, 'orange'),
      slot(cc(23), 'CUTOFF', 49, 33, 7, 27), slot(cc(83), 'RESONANCE', 57, 33, 7, 27),
      slot(cc(102), 'RISE', 68, 33, 7, 27), slot(cc(103), 'FALL', 76, 33, 7, 27),
      slot(cc(28), 'HOLD / SUSTAIN', 84, 33, 7, 27), slot(cc(24), 'AMOUNT', 92, 33, 7, 27),
      shared([cc(91), cc(92)], 'arp-rate', 'RATE / SYNC', 33, 68, 8, 27),
      shared([cc(93), cc(94)], 'lfo-rate', 'RATE / SYNC', 57, 68, 8, 27),
      slot(cc(105), 'ATTACK', 68, 68, 7, 27), slot(cc(106), 'DECAY / REL', 76, 68, 7, 27),
      slot(cc(29), 'SUSTAIN', 84, 68, 7, 27), slot(cc(26), 'FILTER AMT', 92, 68, 7, 27),
      slot(cc(2), 'SPICE', 24, 103, 29, 7, 'touch'), slot(cc(64), 'HOLD', 1, 103, 8, 7, 'button'),
    ],
    references: [
      reference('Modulation matrix', 1, 2, 29, 24, 'matrix'), reference('PARAPHONIC', 36, 5, 8, 20, 'button'),
      reference('PANEL', 45, 5, 7, 20, 'button'), reference('MASTER', 92, 4, 7, 23),
      reference('FILTER TYPE', 43, 35, 6, 22, 'button'), reference('MODE', 63, 35, 5, 22, 'button'),
      reference('OCTAVE − / +', 1, 71, 13, 20, 'buttons'), reference('SHIFT', 15, 71, 6, 20, 'button'),
      reference('ARP / SEQ', 22, 71, 7, 20, 'button'), reference('OCT / MOD', 29, 71, 6, 20, 'button'),
      reference('SHAPE', 45, 71, 7, 20, 'button'), reference('AMP MOD', 62, 71, 6, 20, 'button'),
    ],
    markings: [['DIGITAL OSCILLATOR', 12, 29, 32], ['ANALOG FILTER', 44, 29, 21], ['CYCLING ENVELOPE', 66, 29, 33],
      ['ARP / SEQ', 20, 64, 21], ['LFO', 43, 64, 23], ['ENVELOPE', 66, 64, 33]],
    banks: [bank('arp-rate', ['Free', 'Sync'], 33, 96, 9), bank('lfo-rate', ['Free', 'Sync'], 57, 96, 9)],
    menus: [
      menu('micro-preset', 'PRESET', [], 68, 5, 9),
      menu('micro-utility', 'UTILITY · MIDI', ['Digital Oscillator', 'Analog Filter', 'Cycling Envelope', 'Envelope', 'LFO', 'Arpeggiator & Sequencer', 'Performance'], 78, 5, 12),
    ],
    notes: { first: 48, count: 25 },
  },
  'deepmind-12': {
    width: 1280, minWidth: 1120, ratio: 6, surface: '#393b3b', ink: '#e4e8df', accent: '#efe074',
    source: 'https://www.behringer.com/en/products/0722-AAA',
    screen: { x: 43, y: 12, w: 14, h: 55, style: 'lcd' },
    slots: [
      slot(nr(157), 'RATE', 4, 24, 2.8, 53, 'fader'), slot(nr(160), 'GATE TIME', 7, 24, 2.8, 53, 'fader'),
      slot(nr(0), 'RATE', 11, 24, 2.8, 53, 'fader'), slot(nr(1), 'DELAY TIME', 14, 24, 2.8, 53, 'fader'),
      slot(nr(7), 'RATE', 18, 24, 2.8, 53, 'fader'), slot(nr(8), 'DELAY TIME', 21, 24, 2.8, 53, 'fader'),
      ...[21, 25, 29, 28, 27, 26, 33].map((n, i) => slot(nr(n), ['PITCH MOD', 'PWM', 'PITCH MOD', 'TONE MOD', 'PITCH', 'LEVEL', 'NOISE'][i], 25 + i * 2.5, 24, 2.3, 53, 'fader')),
      slot(nr(87), 'DETUNE', 64, 24, 2.8, 53, 'fader'),
      ...[39, 41, 42, 45, 49].map((n, i) => slot(nr(n), ['FREQ', 'RES', 'ENV', 'LFO', 'KYBD'][i], 68 + i * 2.5, 24, 2.3, 53, 'fader')),
      slot(nr(80), 'LEVEL', 82, 24, 2.8, 53, 'fader'), slot(nr(40), 'FREQ', 86, 24, 2.8, 53, 'fader'),
      ...['A', 'D', 'S', 'R'].map((label, i) => shared([nr(53 + i), nr(62 + i), nr(71 + i)], 'envelope', label, 90 + i * 2.3, 24, 2.1, 53, 'fader')),
      slot(nr(18), 'PULSE', 25, 82, 3, 14, 'button'), slot(nr(19), 'SAW', 28, 82, 3, 14, 'button'),
      slot(nr(20), 'SYNC', 31, 82, 3, 14, 'button'), slot(nr(52), 'BOOST', 85.5, 82, 4, 14, 'button'),
      slot(nr(155), 'ON / OFF', 1, 82, 3.2, 14, 'button'), slot(nr(161), 'TAP / HOLD', 4.5, 82, 4.3, 14, 'button'),
    ],
    references: [reference('DATA ENTRY', 60, 24, 3, 53, 'fader'), reference('CHORD', 1, 25, 2.5, 16, 'button'), reference('POLY CHORD', 1, 48, 2.5, 16, 'button')],
    markings: [['ARP / SEQ', 1, 4, 9], ['LFO 1', 11, 4, 6], ['LFO 2', 18, 4, 6],
      ['OSC 1 & 2', 25, 4, 17], ['POLY', 64, 4, 3], ['VCF', 68, 4, 12], ['VCA', 81, 4, 4], ['HPF', 85.5, 4, 4], ['ENVELOPES', 90, 4, 9]],
    banks: [bank('envelope', ['VCA', 'VCF', 'MOD'], 89, 82, 10)],
    menus: [
      menu('deep-arp', 'EDIT', ['Arpeggiator', 'Control Sequencer'], 8, 82, 2.5),
      menu('deep-lfo1', 'EDIT', ['LFO 1'], 12, 82, 4), menu('deep-lfo2', 'EDIT', ['LFO 2'], 19, 82, 4),
      menu('deep-osc', 'EDIT', ['Oscillators'], 35, 82, 5),
      menu('deep-program', 'PROG', ['Program', 'Program Name', 'Voices'], 43, 75, 3.5),
      menu('deep-fx', 'FX', ['Routing', 'FX 1', 'FX 2', 'FX 3', 'FX 4'], 47, 75, 3.5),
      menu('deep-global', 'GLOBAL / MIDI', ['Performance', 'Performance Messages'], 51, 75, 6),
      menu('deep-matrix', 'MOD MATRIX', ['Mod Matrix 1', 'Mod Matrix 2', 'Mod Matrix 3', 'Mod Matrix 4', 'Mod Matrix 5', 'Mod Matrix 6', 'Mod Matrix 7', 'Mod Matrix 8'], 58, 82, 5),
      menu('deep-poly', 'EDIT', ['Voices'], 64, 82, 3.5), menu('deep-vcf', 'EDIT', ['Filter'], 71, 82, 5),
      menu('deep-vca', 'EDIT', ['Amplifier'], 81, 82, 4), menu('deep-curves', 'CURVES', ['VCA Envelope', 'VCF Envelope', 'MOD Envelope'], 96, 91, 4),
    ],
    notes: { first: 48, count: 49 },
  },
  'pro-vs-mini': {
    width: 970, minWidth: 840, ratio: 2.85, surface: '#202224', ink: '#e2e4e2', accent: '#339dc9',
    source: 'https://www.behringer.com/en/products/0722-ABF',
    screen: { x: 21, y: 3, w: 16, h: 16, style: 'oled' },
    slots: [
      ...['A', 'D', 'S', 'R'].map((label, i) => shared([cc(85 + i), cc(81 + i)], 'envelope', label, 43 + i * 9, 32, 8, 21)),
      shared([cc(72), cc(73)], 'lfo', 'RATE', 43, 59, 8, 21), shared([cc(70), cc(28)], 'lfo', 'AMT', 52, 59, 8, 21),
      slot(cc(74), 'CUTOFF', 62, 59, 8, 21), slot(cc(71), 'RESO', 71, 59, 8, 21),
      shared([24, 25, 26, 27].map(cc), 'oscillator', 'WAVE', 43, 83, 8, 18, 'encoder'),
      shared([111, 112, 113, 114].map(cc), 'oscillator', 'FREQ · FINE', 52, 83, 8, 18),
      slot(cc(92), 'RATE', 62, 83, 8, 18), slot(cc(91), 'AMT', 71, 83, 8, 18),
    ],
    references: [
      reference('WAVEFORM MIX', 2, 29, 20, 65, 'joystick'), reference('VOLUME', 64, 1, 8, 20),
      reference('TEMPO', 81, 31, 8, 21), reference('PROG / OCTAVE + / −', 24, 33, 13, 50, 'buttons'),
      reference('WRITE', 80, 61, 8, 18, 'button'), reference('PLAY', 80, 84, 8, 17, 'button'),
      reference('RECORD', 90, 84, 8, 17, 'button'),
    ],
    markings: [['Pro VS MINI', 38, 4, 25, 'logo'], ['HYBRID VECTOR SYNTHESIZER', 38, 19, 34],
      ['ENVELOPE', 42, 26, 36], ['LFO', 42, 55, 18], ['ANALOG FILTER', 61, 55, 19], ['OSC', 42, 79, 18], ['CHORUS / FX', 61, 79, 19]],
    banks: [
      bank('envelope', ['FIL', 'AMP'], 36, 31, 6), bank('lfo', ['1', '2'], 36, 58, 6),
      bank('oscillator', ['A', 'B', 'C', 'D'], 35, 82, 7),
    ],
    menus: [
      menu('pro-functions', 'FUNC', ['Performance', 'Filter', 'LFO 1', 'LFO 2', 'Effects', 'Documented Tuning'], 90, 61, 8),
      menu('pro-osc', 'Oscillator tuning', ['Oscillator A', 'Oscillator B', 'Oscillator C', 'Oscillator D'], 24, 93, 16),
    ],
    notes: { first: 48, count: 27 },
  },
};

const drums = [
  ['BD', 20, 23, 24, 96], ['SD', 25, 28, 29, 97], ['LT', 46, 47, 48, 102], ['MT', 49, 50, 51, 103],
  ['HT', 52, 53, 54, 104], ['RS', 55, 56, 57, 105], ['HC', 58, 59, 60, 106], ['CH', 61, 62, 63, 107],
  ['OH', 80, 81, 82, 108], ['CC', 83, 84, 85, 109], ['RC', 86, 87, 88, 110],
];
instrumentPanels['tr-8s'] = {
  width: 1100, minWidth: 980, ratio: 2.3, surface: '#24252a', ink: '#e6e7e8', accent: '#53d7b7',
  source: 'https://www.roland.com/global/products/tr-8s/',
  screen: { x: 79, y: 5, w: 19, h: 9, style: 'lcd' },
  slots: [
    slot(cc(12), 'EXT IN', 5, 7, 5, 12), slot(cc(71), 'ACCENT', 20, 7, 5, 12),
    slot(cc(91), 'REVERB', 30, 7, 5, 12), slot(cc(16), 'LEVEL', 39, 7, 5, 12),
    slot(cc(17), 'TIME', 44, 7, 5, 12), slot(cc(18), 'FEEDBACK', 49, 7, 5, 12),
    slot(cc(15), 'MASTER FX', 55, 7, 5, 12, 'button'), slot(cc(19), 'CTRL', 61, 7, 5, 12),
    slot(cc(9), 'SHUFFLE', 91, 46, 7, 13),
    ...drums.flatMap(([label, tune, decay, level, ctrl], index) => {
      const x = 17 + index * 5.45;
      return [
        slot(cc(tune), 'TUNE', x, 23, 4.9, 12), slot(cc(decay), 'DECAY', x, 38, 4.9, 12),
        slot(cc(ctrl), 'CTRL', x, 53, 4.9, 12), slot(cc(level), label, x, 67, 4.9, 22, 'fader'),
      ];
    }),
  ],
  references: [reference('VOLUME', 0, 7, 5, 12), reference('TEMPO', 82, 46, 8, 19),
    reference('VALUE', 88, 20, 8, 16), reference('TR-REC / INST PLAY', 0, 25, 14, 16, 'buttons'),
    reference('PATTERN / KIT / INST', 0, 45, 14, 16, 'buttons'), reference('A B C D E F G H', 0, 66, 14, 18, 'buttons')],
  markings: [['REVERB', 29, 1, 7], ['DELAY', 39, 1, 15], ['MASTER FX', 55, 1, 12], ['Roland', 1, 1, 14, 'brand'], ['TR-8S', 80, 1, 18, 'model']],
  menus: [
    menu('tr-kit', 'KIT · instrument controls', ['Bass Drum', 'Snare Drum', 'Low Tom', 'Mid Tom', 'Hi Tom', 'Rim Shot', 'Hand Clap', 'Closed Hi-Hat', 'Open Hi-Hat', 'Crash Cymbal', 'Ride Cymbal'], 79, 38, 8),
    menu('tr-effects', 'FX / CTRL', ['Input & Effects'], 88, 38, 10),
    menu('tr-utility', 'UTILITY · MIDI / hits', ['Rhythm'], 79, 69, 19),
  ],
  steps: true,
};

export function panelControlIds(panel) {
  return new Set([
    ...panel.slots.flatMap((slot) => slot.ids || []),
    ...(panel.eq ? Array.from({ length: 20 }, (_, index) => cc(index + 3)) : []),
  ]);
}

export function menuControls(instrument, panel, entry) {
  const face = panelControlIds(panel);
  return instrument.controls.filter((control) => entry.sections.includes(control.section) &&
    (entry.includeFace || !face.has(control.id) || control.confirmation));
}

const libraryMenus = new Set(['deco-midi', 'mobius-global', 'eq-performance', 'nemesis-performance', 'empress-save', 'micro-preset', 'deep-program', 'tr-kit']);
const performanceMenus = new Set(['deep-global', 'micro-utility', 'tr-utility', 'pro-functions']);
for (const panel of Object.values(instrumentPanels)) {
  for (const entry of panel.menus) {
    entry.library = libraryMenus.has(entry.id);
    entry.keyboard = performanceMenus.has(entry.id);
    if (['tr-kit', 'tr-effects', 'tr-utility', 'micro-utility'].includes(entry.id)) entry.includeFace = true;
    if (entry.id === 'mobius-global') entry.includeFace = true;
    if (entry.id === 'reverb-variations') entry.includeFace = true;
  }
}
