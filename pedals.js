import { controls as moodControls, controlValueLabel as moodLabel, controlEndpoints as moodEndpoints, positionLabel, hiddenPedalMap, manualUrl, range, select, toggle, action, options, three } from './controls.js?v=3.2.0';

const save = () => ({ cc: 111, name: 'Save to pedal', group: 'presets', kind: 'save', confirmation: 'Save to this pedal slot? The existing preset will be overwritten.' });
const reset = () => action(56, 'Factory reset', 'maintenance', 1, 'WARNING: run FACTORY RESET? This may erase presets and settings.');
const expression = () => range(100, 'Expression over MIDI', 'performance');
const clock = () => select(51, 'MIDI clock', 'global', options('Ignore', 'Follow'), 1, 'Global setting. Clock comes from an external DAW or controller.');
const dipBank = (start, names, group) => names.map((name, index) => toggle(start + index, name, group));
const sweep = (cc) => select(cc, 'SWEEP', 'dip-left', options('Bottom', 'Top'));
const polarity = (cc, group) => select(cc, 'POLARITY', group, options('Forward', 'Reverse'));
const standardDips = (centre, right) => [
  ...dipBank(61, ['TIME', 'MODIFY · L', centre, 'MODIFY · R', 'LENGTH', 'BOUNCE'], 'dip-left'),
  sweep(67), polarity(68, 'dip-left'), ...dipBank(71, right, 'dip-right'),
];
const hardwareHidden = (name = 'Hidden menu · hardware') => toggle(104, name, 'hidden', 'Changes the hardware mode. Tabs only change the view without sending MIDI.');
const route = (labels) => select(22, 'ROUTING', 'pedal', three(...labels), 2);
const normalKnobs = (names) => names.map((name, index) => range(14 + index, name, 'pedal'));
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
  mode(21, 0, 'REVERB', 'TIME sets size and decay. MODIFY diffuses echoes from multi-tap to reverb.', 'space', 'An unfolding space.'),
  mode(21, 2, 'DELAY', 'TIME spaces repeats. MODIFY controls feedback.', 'echo', 'Echoes meeting echoes.'),
  mode(21, 3, 'SLIP', 'TIME chooses the audio window. MODIFY changes speed and direction.', 'pitch', 'Time, direction and pitch.'),
  mode(23, 0, 'ENV', 'LENGTH chooses fragments. MODIFY sets input sensitivity.', 'grain', 'Living fragments.'),
  mode(23, 2, 'TAPE', 'LENGTH sets the loop. MODIFY changes speed and direction.', 'tape', 'A loop in motion.'),
  mode(23, 3, 'STRETCH', 'LENGTH sets fragments. MODIFY stretches audio and changes direction.', 'stretch', 'An instant becomes a landscape.'),
];
const mood = {
  id: 'mood-mkii', name: 'MOOD MKII', title: 'MOOD', edition: 'MKII', variant: 'Lavender',
  subtitle: 'An instant of sound. A universe to explore.', category: 'Spatial chemistry.',
  controls: moodControls, label: moodLabel, hiddenMap: hiddenPedalMap, hiddenCc: 104, hiddenOn: 1, hiddenOff: 0,
  manualUrl, mainManualUrl: 'https://www.chasebliss.com/s/MOOD-MKII_Manual_Pedal_Chase-Bliss.pdf',
  synth: true, clockCc: 18, waveformCc: 25, modeGroups: [[21, 'Wet channel'], [23, 'Micro-looper channel']], modes: modesMood,
  signal: (state) => `${state[22] === 0 ? 'IN' : state[22] === 2 ? 'IN + LOOP' : 'LOOP'} → WET → OUT`,
  note: 'Main and Hidden knobs are independent. CLOCK affects both channels.',
};

const lostControls = [
  ...normalKnobs(['TIME · L', 'MIX', 'TIME · R', 'MODIFY · L', 'BLEND', 'MODIFY · R']),
  select(21, 'L · 1 / 2 / 3', 'pedal', three('1 · REVERB', '2 · PITCH', '3 · WARP')),
  route(['L → R', 'L + R', 'R → L']),
  select(23, 'R · 4 / 5 / 6', 'pedal', three('4 · DELAY', '5 · SYNTH', '6 · BEND')),
  toggle(103, 'L', 'footswitch'), toggle(102, 'R', 'footswitch'),
  hardwareHidden('ALT menu · hardware'),
  toggle(105, 'Hold · L', 'performance', 'Effect-specific secondary function on the left channel.'),
  toggle(106, 'Hold · R', 'performance', 'Effect-specific secondary function on the right channel.'),
  range(20, 'Ramp speed', 'ramping'), range(24, 'ALT · L', 'hidden'),
  range(25, 'SPILL', 'hidden'), range(26, 'ALT · R', 'hidden'),
  range(27, 'EQ · L', 'hidden'), range(28, 'GLUE', 'hidden', 0),
  range(29, 'EQ · R', 'hidden'), range(30, 'Master wet volume', 'hidden'),
  select(32, 'Spread · destination', 'hidden', three('L only', 'Both', 'R only'), 2),
  clock(), select(52, 'Ramping', 'ramping', options('Stop', 'Resume'), 1),
  ...[53, 54].map((cc) => select(cc, `Tap subdivision · ${cc === 53 ? 'L' : 'R'}`, 'global',
    options('1/32', '1/16', '1/16 triplet', '1/8', '1/8 triplet', '1/8 dotted', '1/4', '1/4 triplet', '1/4 dotted', '1/2', '1/2 dotted', '1', '2'), 6)),
  reset(), toggle(57, 'Dry kill', 'global'), action(93, 'Tap tempo', 'performance'), expression(), save(),
  action(112, 'Random · L', 'performance'), action(113, 'Random · R', 'performance'), action(114, 'Random · both', 'performance'),
  ...dipBank(61, ['TIME · L', 'MODIFY · L', 'BLEND', 'MODIFY · R', 'TIME · R', 'BOUNCE'], 'dip-left'),
  sweep(67), polarity(68, 'dip-left'),
  ...dipBank(71, ['MISO', 'SPREAD', 'LATCH', 'L SWAP', 'R SWAP', 'UNSYNC', 'TRAILS', 'BANK'], 'dip-right'),
];
const lostFamilies = [
  ['REVERB', 'Slow-verb', 'Useful Ambience', 'space', 'TIME: size. MODIFY: decay. ALT: diffusion.'],
  ['PITCH', 'Orchestral Swell', 'Pitch Repeater', 'pitch', 'TIME: swell/delay. MODIFY: pitch. ALT: feedback/repeats.'],
  ['WARP', 'Pinging Phaser', 'Spectral Modulator', 'stretch', 'TIME: rate. MODIFY: poles/depth. ALT: resonance.'],
  ['DELAY', 'Tape Echo', 'Grain Tumbler', 'echo', 'TIME: delay/grain size. MODIFY: feedback. ALT: stability/grain shape.'],
  ['SYNTH', 'Impulse Synthesizer', 'Sympathetic Resonator', 'grain', 'TIME: portamento/onset. MODIFY: texture/feedback. ALT: envelope/octave.'],
  ['BEND', 'Ensemble Expander', 'Gen Lite', 'tape', 'TIME: rate. MODIFY: depth. ALT: voices/crinkles and snags.'],
];
function lostFamilyFor(state, cc) {
  const left = cc === 21;
  const swapped = state[left ? 74 : 75] > 0;
  return lostFamilies[(left !== swapped ? 0 : 3) + (state[cc] === 0 ? 0 : state[cc] === 2 ? 1 : 2)];
}
const lost = {
  id: 'lost-found', name: 'Lost + Found', title: 'LOST + FOUND', edition: '', variant: 'Green',
  subtitle: 'A collection of curiosities. Twelve effects to discover.', category: 'Collection of curiosities.',
  controls: lostControls, hiddenMap: { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 22: 32 },
  hiddenCc: 104, hiddenOn: 1, hiddenOff: 0,
  label: (cc, value, state) => positionLabel(value, 0, 127, pedalControlEndpoints(lost, cc, state)), synth: false,
  manualUrl: 'https://www.chasebliss.com/s/Lost-Found_MIDI-Manual_Pedal_Chase-Bliss.pdf',
  mainManualUrl: 'https://cb2k22.squarespace.com/s/Lost-Found_Manual_Pedal_Chase-Bliss.pdf',
  modeGroups: [[21, 'L channel · families 1–3'], [23, 'R channel · families 4–6']],
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
  note: 'MODIFY selects A on the left, B on the right and neutral at center. L SWAP/R SWAP exchange channel families; BANK switches physical presets to 3/4, not the twelve effects. Random makes interface values unsynchronized.',
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
  { ...hardwareHidden('ALT menu · hardware'), initial: 1, onValue: 0, offValue: 1, hint: 'CC104 is inverted on this pedal: 0 enters ALT, 1–127 exits. ON in the interface means ALT is active.' },
  range(20, 'Ramp speed', 'ramping'),
  range(24, 'AUX onset', 'hidden'), select(26, 'Bypass type', 'hidden', [{ value: 0, label: 'True bypass' }, { value: 127, label: 'DSP bypass' }], 0, 'The manual does not define value 64. Use 0/127 without sending the ambiguous midpoint.'),
  range(27, 'Hiss level', 'hidden'), range(28, 'Mechanical noise', 'hidden'), range(29, 'Crinkle / pop', 'hidden'),
  select(32, 'Input gain', 'hidden', [{ value: 1, label: 'Line level' }, { value: 2, label: 'Instrument level' }, { value: 3, label: 'High gain' }], 2),
  toggle(52, 'Ramp / Bounce', 'ramping'), expression(), save(),
  toggle(105, 'AUX · left switch', 'performance'), toggle(106, 'AUX · centre switch', 'performance'), toggle(107, 'AUX · right switch', 'performance'),
  ...dipBank(61, ['WOW', 'FLUTTER', 'SAT / GEN', 'FAILURE / HP', 'MODEL / LP', 'BOUNCE', 'RANDOM'], 'dip-left'),
  sweep(68), polarity(71, 'dip-right'),
  ...dipBank(72, ['CLASSIC', 'MISO', 'SPREAD', 'DRY TYPE', 'DROP BYP', 'SNAG BYP', 'HUM BYP'], 'dip-right'),
];
const generation = {
  id: 'generation-loss-mkii', name: 'Generation Loss MKII', title: 'GENERATION LOSS', edition: 'MKII', variant: 'VHS Blue',
  subtitle: 'Tape memories. Saturation, instability and nostalgia.', category: 'VHS duplicator.',
  controls: genControls, hiddenMap: { 14: 24, 15: 20, 16: 26, 17: 27, 18: 28, 19: 29, 22: 32 },
  hiddenCc: 104, hiddenOn: 0, hiddenOff: 1, synth: false, models,
  manualUrl: 'https://www.chasebliss.com/s/Generation-Loss-MKII_MIDI-Manual_Pedal_Chase-Blisspdf.pdf',
  mainManualUrl: 'https://cb2k22.squarespace.com/s/Generation-Loss-MKII_Manual_Pedal_Chase-Bliss.pdf',
  label: (cc, value, state = {}) => cc === 16 && !state[72] ? models.find((model) => model.value === value)?.label || 'Between models' : positionLabel(value, 0, 127, pedalControlEndpoints(generation, cc, state)),
  modeGroups: [[21, 'AUX · performance']],
  modes: [
    mode(21, 1, 'STOP', 'Simulates a tape stop. AUX onset controls the transition from immediate braking to a gradual slowdown.', 'tape', 'Braking time.'),
    mode(21, 2, 'FILTER', 'AUX bypasses the tape model and passes the signal without its filtering.', 'space', 'Freeing the signal.'),
    mode(21, 3, 'FAIL', 'AUX emphasizes faults. DROP/SNAG/HUM BYP choose which faults participate.', 'grain', 'Letting tape fail.'),
  ],
  modePresentation: (state, cc) => {
    const selected = generation.modes.find((item) => item.cc === cc && item.value === state[cc]);
    return state[cc] === 3 && state[72] && state[76] && state[77]
      ? { ...selected, name: 'FREEZE', summary: 'Sustaining tape memories.' } : selected;
  },
  signal: (state) => `IN → ${state[72] ? 'CLASSIC · LP / GEN / HP' : 'MODEL / SATURATE / FAILURE'} → OUT`,
  note: 'CLASSIC (CC72) changes MODEL → LP, SATURATE → GEN and FAILURE → HP using the same CC14–19. FREEZE: Classic + AUX at FAIL + DROP BYP/SNAG BYP enabled. No Synth, tap tempo or Factory Reset is documented. Models use exact official table values.',
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
  select(31, 'SYNC', 'hidden', three('Loop → Wet', 'No sync', 'Wet → Loop'), 2),
  select(32, 'SPREAD · destination', 'hidden', three('Wet only', 'Both', 'Loop only'), 2),
  select(33, 'CROSS input', 'hidden', three('Wet → Loop', 'Input → both', 'Loop → Wet'), 2),
  clock(), toggle(52, 'Resume ramping', 'ramping'),
  ...[53, 54].map((cc) => select(cc, `Clock division · ${cc === 53 ? 'Wet' : 'Loop'}`, 'global', options('1/32', '1/16', '1/8 triplet', '1/8', '1/4', '1/2', '1/2 dotted', '1', '2'), 4, 'Stored globally.')),
  select(55, 'Bypass mode', 'global', options('Buffered', 'True bypass')), reset(),
  select(85, 'EQ · destination', 'global', three('Wet only', 'Both', 'Loop only'), 2),
  action(93, 'Tap tempo', 'performance'), expression(),
  ...moodControls.filter((control) => control.group === 'synth').map((control) => ({ ...control })),
  action(110, 'MIDI reset', 'maintenance', 1, 'Reset global MIDI settings?'), save(),
  ...standardDips('CLOCK', ['MISO', 'SPREAD', 'DRY KILL', 'TRAILS', 'LATCH', 'HALF', 'SMOOTH', 'DRY GLUE']),
];
const stations = [[0, 'TAPE'], [32, 'AMBIENT'], [63, 'ORCHESTRAL'], [97, 'SHOEGAZE'], [127, 'DANCE']].map(([value, label]) => ({ value, label }));
const chordStarts = [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30, 32, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 61, 64, 67, 69, 72, 75, 77, 80, 83, 85, 88, 90, 93, 96, 98, 101, 104, 106, 109, 112, 114, 117, 120, 122, 125];
const chords = chordStarts.map((value, index) => ({ value, label: `Chord ${index + 1} · ${value}–${(chordStarts[index + 1] ?? 128) - 1}` }));
const bad = {
  id: 'bad-mood', name: 'BAD MOOD', title: 'BAD MOOD', edition: 'INK', variant: 'Ink',
  subtitle: 'The unruly side of ambience. Interfering textures.', category: 'Instant trouble.',
  controls: badControls, hiddenMap: { 14: 24, 15: 25, 16: 26, 17: 27, 18: 28, 19: 29, 21: 31, 22: 32, 23: 33 },
  hiddenCc: 104, hiddenOn: 1, hiddenOff: 0, synth: true, clockCc: 18, stations, chords,
  manualUrl: 'https://www.chasebliss.com/s/BAD-MOOD_MIDI-Manual_Chase-Bliss.pdf',
  mainManualUrl: 'https://www.chasebliss.com/s/Bad-Mood_Manual_Chase-Bliss.pdf',
  label: (cc, value, state) => cc === 18 ? moodLabel(cc, value, state)
    : cc === 19 && state[23] === 2 ? stations.find((station) => station.value === value)?.label || 'Between stations'
    : cc === 17 && state[21] === 3 ? `Chord ${chordStarts.findLastIndex((start) => value >= start) + 1}` : positionLabel(value, 0, 127, pedalControlEndpoints(bad, cc, state)),
  modeGroups: [[21, 'Wet channel'], [23, 'Micro-looper channel']],
  modes: [
    mode(21, 0, 'SOUP', 'Spectral reverb resynthesizes the signal. TIME sets decay/size; MODIFY changes character.', 'space', 'Distorted ambience.'),
    mode(21, 2, 'RELAY', 'Repeats at a constant level. TIME sets delay; MODIFY chooses repeat count, up to accumulating loops.', 'echo', 'Persistent repeats.'),
    mode(21, 3, 'FLIP', 'Fragmented harmonies. TIME sets lag/spacing; MODIFY chooses one of 48 documented chords.', 'pitch', 'Chords in pieces.'),
    mode(23, 0, 'BURST', 'LENGTH sets size/speed; MODIFY controls sensitivity.', 'grain', 'Sequenced fragments.'),
    mode(23, 2, 'RADIO', 'MODIFY scans stations. LENGTH changes a station-specific function.', 'radio', 'Scanning the airwaves.'),
    mode(23, 3, 'MASK', 'LENGTH changes character; MODIFY adjusts sensitivity.', 'stretch', 'Musical disguises.'),
  ],
  signal: mood.signal,
  note: 'CROSS selects dynamic cross-channel movement; GLUE saturates/destroys at the end of the chain. CC53/54 divisions differ from MOOD. Documented RADIO station points are 0, 32, 63, 97 and 127.',
};
export const pedals = [mood, lost, generation, bad];
export function pedalControlEndpoints(pedal, cc, state = {}) {
  if (pedal.id === 'mood-mkii') return moodEndpoints(cc, state);
  if (cc === 100) return ['Heel', 'Toe'];
  if (cc === 20) return ['Slow', 'Fast'];
  if (pedal.id === 'generation-loss-mkii') {
    if (state[72] && cc === 16) return ['Dark', 'Bright'];
    if (state[72] && cc === 18) return ['Degraded', 'Clean'];
    if (state[72] && cc === 19) return ['Full lows', 'Reduced lows'];
    return ({ 14: ['Stable', 'Strong wow'], 15: ['Silent', 'Double level'], 16: ['OFF / Unfiltered', 'M-PEX'],
      17: ['Stable', 'Strong flutter'], 18: ['Clean', 'Saturated'], 19: ['No faults', 'Heavy faults'],
      24: ['Immediate', 'Slow'], 27: ['Quiet', 'Loud hiss'], 28: ['VCR noise', 'Hum'], 29: ['Quiet', 'Loud crinkles / pops'] })[cc] || ['Low', 'High'];
  }
  if (pedal.id === 'lost-found') {
    if ([17, 19].includes(cc)) { const family = lostFamilyFor(state, cc === 17 ? 21 : 23); return [family[1], family[2]]; }
    return ({ 14: ['Short / slow', 'Long / fast'], 15: ['Dry', 'Wet'], 16: ['Short / slow', 'Long / fast'],
      18: ['L', 'R'], 25: ['No spill', 'Full spill'], 27: ['Reduced highs', 'Reduced lows'],
      28: ['Clean', 'Compressed / saturated'], 29: ['Reduced highs', 'Reduced lows'], 30: ['Quiet', 'Loud'] })[cc] || ['Low', 'High'];
  }
  if (cc === 18) return moodEndpoints(cc, state);
  if (cc === 19 && state[23] === 2) return ['TAPE', 'DANCE'];
  return ({ 14: ['Short', 'Long'], 15: ['Dry', 'Wet'], 16: ['Small', 'Large'],
    17: ['Low', 'High'], 19: ['Less sensitive', 'More sensitive'],
    24: ['No cross modulation', 'Strong cross modulation'], 25: ['Wet', 'Micro-loop'],
    26: ['Fade old layers', 'Keep old layers'], 27: ['Reduced highs', 'Reduced lows'],
    28: ['Clean', 'Saturated / destroyed'], 29: ['No direct loop', 'Direct loop'], 30: ['Quiet', 'Loud'] })[cc] || moodEndpoints(cc, state);
}
for (const pedal of pedals) {
  pedal.endpoints = (cc, state) => pedalControlEndpoints(pedal, cc, state);
  pedal.panelOrder = ['pedal', 'footswitch', 'hidden', 'ramping', 'dip-left', 'dip-right', 'performance', 'global', 'synth', 'presets', 'maintenance'];
  for (const control of pedal.controls) {
    if (control.kind === 'range') control.endpoints = pedalControlEndpoints(pedal, control.cc);
    if (control.group === 'footswitch') control.visual = 'footswitch';
    else if (control.kind === 'toggle' || control.kind === 'select') control.visual = 'toggle';
  }
}
export function getPedal(id) { return pedals.find((pedal) => pedal.id === id); }
