// Evidence: DeepMind 12 manual §§16–17 (2016), MicroFreak 5.0.1 appendix D,
// TR-8S MIDI chart 1.10 + reference 3.00, PRO-VS MINI v2 guide pp.170–171.
// Values are wire values, not readback or reconstructed hardware patch defaults.
const choices = (...labels) => labels.map((label, value) => ({ value, label }));
const indexed = (max, prefix) => Array.from({ length: max + 1 }, (_, value) => ({ value, label: `${prefix} ${value}` }));
const range = (protocol, number, name, section, max = 127, physical = false, hint = 'Sets the outgoing value; the instrument state is not read back.') => {
  const lower = name.toLowerCase();
  const endpoints = /(?:rate|speed|tempo)$/.test(lower) ? ['Slower', 'Faster']
    : /(?:cutoff|pitch)$/.test(lower) ? ['Lower', 'Higher']
      : /(?:attack|decay|release|rise|fall|time|glide|portamento|delay|fade)$/.test(lower) ? ['Shorter', 'Longer']
        : /(?:level|gain|volume|accent|resonance)$/.test(lower) ? ['Less', 'More']
          : /(?:depth|amount|modulation|sustain|shape|shuffle|swing|spice|timbre|wave|feedback)$/.test(lower) ? ['Less', 'More']
            : null;
  return {
    id: `${protocol}-${number}`, name, section, kind: 'range', protocol, number, min: 0, max, initial: 0, hint, physical,
    ...(endpoints ? {
      endpoints,
      optionsHint: /BPM/.test(hint) ? 'Documented range: 20–275 BPM in 1 BPM steps.'
        : /50%/.test(hint) ? 'Documented mapping: 0 = 50%; 25 = 75%.'
          : `${endpoints[0]} → ${endpoints[1]}; the MIDI chart does not specify a physical unit.`,
    } : {}),
    ...(protocol === 'nrpn' ? { dataBits: 14 } : {}),
  };
};
const menu = (number, name, section, options, hint) => {
  const control = range('nrpn', number, name, section, Math.max(...options.map((o) => o.value)), false, hint);
  delete control.endpoints;
  delete control.optionsHint;
  return { ...control, kind: 'select', choices: options, initial: options[0].value };
};
const switchControl = (protocol, number, name, section, onValue = 1, physical = false, hint) => ({
  ...range(protocol, number, name, section, onValue, physical, hint), kind: 'toggle', onValue, offValue: 0,
});
const command = (number, name, hint, confirmation) => ({
  id: `cc-${number}`, name, section: 'Performance Messages', kind: 'action', protocol: 'cc', number,
  min: 0, max: 127, value: 0, hint, physical: false, ...(confirmation ? { confirmation } : {}),
});
const deepUrl = 'https://synthmanuals.com/manuals/behringer/deepmind_12/user_manual/deepmind_12_m_en.pdf';
const microUrl = 'https://downloads.arturia.net/products/microfreak/manual/microfreak_Manual_5_0_1_EN.pdf';
const microFaq = 'https://support.arturia.com/hc/en-us/articles/4405748052626-MicroFreak-General-Questions';
const trUrl = 'https://static.roland.com/assets/media/pdf/TR-8S_MIDIImpleChart_eng03_W.pdf';
const trMain = 'https://static.roland.com/assets/media/pdf/TR-8S_Reference_eng05_W.pdf';
const proUrl = 'https://cdn-media.empowertribe.com/07c681beb5724cb797eff24a67095bc7/QSG_BE_0722-ABF_PRO-VS-MINI_WW.pdf';

const deepControls = [];
const nr = (n, name, section, max = 255, physical = false, hint) => deepControls.push(range('nrpn', n, name, section, max, physical, hint));
const ns = (n, name, section, labels, hint) => deepControls.push(menu(n, name, section, labels, hint));
const nt = (n, name, section, physical = false, hint) => deepControls.push(switchControl('nrpn', n, name, section, 1, physical, hint));
for (let lfo = 0; lfo < 2; lfo++) {
  const start = lfo * 7, section = `LFO ${lfo + 1}`;
  nr(start, 'Rate', section, 255, true);
  nr(start + 1, 'Delay / Fade', section, 255, true);
  ns(start + 2, 'Waveform', section, choices('Sine', 'Triangle', 'Square', 'Ramp Up', 'Ramp Down', 'Sample & Hold', 'Sample & Glide'));
  nt(start + 3, 'Key Sync', section);
  nt(start + 4, 'Arpeggiator Sync', section);
  // §17 contradicts its own LFO1 spread note: restrict address5 to the printed range.
  ns(start + 5, 'Voice Mode', section, lfo ? [
    ...choices('Poly', 'Mono'),
    ...Array.from({ length: 254 }, (_, i) => ({ value: i + 2, label: `Spread ${i + 1}` })),
  ] : choices('Poly', 'Mono'));
  nr(start + 6, 'Smoothing', section);
}
ns(14, 'OSC 1 Range', 'Oscillators', choices("16′", "8′", "4′"));
ns(15, 'OSC 2 Range', 'Oscillators', choices("16′", "8′", "4′"));
const envSources = choices('Manual', 'LFO 1', 'LFO 2', 'VCA Envelope', 'VCF Envelope', 'MOD Envelope');
ns(16, 'OSC 1 PWM Source', 'Oscillators', envSources);
ns(17, 'OSC 2 Tone Source', 'Oscillators', envSources);
nt(18, 'OSC 1 Pulse', 'Oscillators', true);
nt(19, 'OSC 1 Sawtooth', 'Oscillators', true);
nt(20, 'Oscillator Sync', 'Oscillators', true);
const pitchSources = choices('LFO 1', 'LFO 2', 'VCA Envelope', 'VCF Envelope', 'MOD Envelope', 'LFO 1 Unipolar', 'LFO 2 Unipolar');
nr(21, 'OSC 1 Pitch Modulation', 'Oscillators', 255, true);
ns(22, 'OSC 1 Pitch Source', 'Oscillators', pitchSources);
nr(23, 'Pressure → OSC 1 Pitch', 'Performance');
nr(24, 'Mod Wheel → OSC 1 Pitch', 'Performance');
nr(25, 'OSC 1 PWM Depth', 'Oscillators', 255, true);
nr(26, 'OSC 2 Level', 'Oscillators', 255, true);
nr(27, 'OSC 2 Pitch', 'Oscillators', 255, true);
nr(28, 'OSC 2 Tone Modulation', 'Oscillators', 255, true);
nr(29, 'OSC 2 Pitch Modulation', 'Oscillators', 255, true);
nr(30, 'Pressure → OSC 2 Pitch', 'Performance');
nr(31, 'Mod Wheel → OSC 2 Pitch', 'Performance');
ns(32, 'OSC 2 Pitch Source', 'Oscillators', pitchSources);
nr(33, 'Noise Level', 'Oscillators', 255, true);
nr(34, 'Portamento Time', 'Performance');
ns(35, 'Portamento Mode', 'Performance', choices('Normal', 'Fingered', 'Fixed Rate', 'Fixed On', 'Exponential', 'Exponential On', 'Fixed +2', 'Fixed −2', 'Fixed +5', 'Fixed −5', 'Fixed +12', 'Fixed −12', 'Fixed +24', 'Fixed −24'));
nr(36, 'Pitch Bend Up', 'Performance', 24, false, 'Sets the upward pitch-bend range in semitones; it does not move the pitch-bend wheel.');
nr(37, 'Pitch Bend Down', 'Performance', 24, false, 'Sets the downward pitch-bend range in semitones; it does not move the pitch-bend wheel.');
ns(38, 'OSC 1 Modulation Destination', 'Oscillators', choices('OSC 1 + 2', 'OSC 1 Only'));
for (const [n, name, physical] of [
  [39, 'LPF Cutoff', true], [40, 'HPF Cutoff', true], [41, 'Resonance', true],
  [42, 'Envelope → Filter', true], [43, 'Velocity → Filter Envelope', false],
  [44, 'Bend → Cutoff', false], [45, 'LFO → Filter', true],
]) nr(n, name, 'Filter', 255, physical);
ns(46, 'Filter LFO', 'Filter', choices('LFO 1', 'LFO 2'));
nr(47, 'Pressure → Filter LFO', 'Filter');
nr(48, 'Mod Wheel → Filter LFO', 'Filter');
nr(49, 'Keyboard Tracking', 'Filter', 255, true);
ns(50, 'Envelope Polarity', 'Filter', choices('Negative', 'Positive'));
ns(51, 'Slope', 'Filter', choices('4-Pole', '2-Pole'));
nt(52, 'Bass Boost', 'Filter', true);
for (const [start, env] of [[53, 'VCA'], [62, 'VCF'], [71, 'MOD']]) {
  for (const [i, stage] of ['Attack', 'Decay', 'Sustain', 'Release'].entries()) nr(start + i, stage, `${env} Envelope`, 255, true);
  ns(start + 4, 'Trigger', `${env} Envelope`, choices('Key', 'LFO 1', 'LFO 2', 'Cycle', 'Sequencer Step'));
  for (const [i, stage] of ['Attack', 'Decay', 'Sustain', 'Release'].entries()) nr(start + 5 + i, `${stage} Curve`, `${env} Envelope`, 255, true);
}
nr(80, 'VCA Level', 'Amplifier', 255, true);
nr(81, 'Envelope Depth', 'Amplifier');
nr(82, 'Velocity Sensitivity', 'Amplifier');
nr(83, 'Pan Spread', 'Amplifier', 255, false, 'Center is 128; the endpoints are −128 and +127.');
ns(84, 'Note Priority', 'Voices', choices('Low', 'High', 'Last'));
ns(85, 'Polyphony / Unison', 'Voices', choices('Poly', 'Unison 2', 'Unison 3', 'Unison 4', 'Unison 6', 'Unison 12', 'Mono', 'Mono 2', 'Mono 3', 'Mono 4', 'Mono 6', 'Poly 6', 'Poly 8'));
ns(86, 'Voice Trigger', 'Voices', choices('Mono', 'Retrigger', 'Legato', 'One-Shot'));
nr(87, 'Unison Detune', 'Voices', 255, true);
for (const [n, name] of [[88, 'Voice Drift'], [89, 'Parameter Drift'], [90, 'Drift Rate'], [91, 'Portamento Balance']]) nr(n, name, 'Voices');
nt(92, 'OSC Key Sync', 'Oscillators');
const modSources = choices('Source 0 · undocumented', 'Pitch Bend', 'Mod Wheel', 'Foot Controller', 'Breath Controller', 'Aftertouch', 'LFO 1', 'LFO 2', 'VCA Envelope', 'VCF Envelope', 'MOD Envelope', 'Note Number', 'Note Velocity', 'Sequencer', 'LFO 1 Unipolar', 'LFO 2 Unipolar', 'LFO 1 Fade', 'LFO 2 Fade', 'Note-Off Velocity', 'Voice Number', 'CC X', 'CC Y', 'CC Z');
const modDestinationNames = [
  'Destination 0 · undocumented', 'LFO 1 Rate', 'LFO 1 Delay', 'LFO 1 Smoothing', 'LFO 1 Shape',
  'LFO 2 Rate', 'LFO 2 Delay', 'LFO 2 Smoothing', 'LFO 2 Shape',
  'OSC 1 + 2 Pitch', 'OSC 1 Pitch', 'OSC 2 Pitch', 'OSC 1 Modulation', 'OSC 1 PWM', 'OSC 2 Tone', 'OSC 2 Modulation',
  'Portamento', 'VCF Cutoff', 'VCF Resonance', 'VCF Envelope', 'VCF LFO', 'All Envelope Times',
  'All Attacks', 'All Decays', 'All Sustains', 'All Releases',
  'VCA Times', 'VCF Times', 'MOD Times', 'VCA Curves', 'VCF Curves', 'MOD Curves',
  ...['VCA', 'VCF', 'MOD'].flatMap((env) => ['Attack', 'Decay', 'Sustain', 'Release', 'Attack Curve', 'Decay Curve', 'Sustain Curve', 'Release Curve'].map((name) => `${env} · ${name}`)),
  'All Voice VCAs', 'Active Voice VCAs', 'VCA Envelope Depth', 'Pan Spread', 'VCA Pan',
  'OSC 2 Level', 'Noise Level', 'HPF Cutoff', 'Unison Detune', 'OSC Drift', 'Parameter Drift', 'Drift Rate', 'Arpeggiator Gate', 'Sequencer Smoothing',
  ...Array.from({ length: 8 }, (_, i) => `Matrix ${i + 1} Depth`),
  ...Array.from({ length: 4 }, (_, i) => Array.from({ length: 12 }, (_, j) => `FX ${i + 1} · Parameter ${j + 1}`)).flat(),
  ...Array.from({ length: 4 }, (_, i) => `FX ${i + 1} Level`),
];
for (let bus = 0; bus < 8; bus++) {
  const n = 93 + bus * 3, section = `Mod Matrix ${bus + 1}`;
  ns(n, 'Source', section, modSources);
  ns(n + 1, 'Destination', section, choices(...modDestinationNames));
  nr(n + 2, 'Amount', section, 255, false, '128 is neutral; lower values invert the modulation direction.');
}
nt(117, 'Sequencer On', 'Control Sequencer');
ns(118, 'Rate', 'Control Sequencer', choices('1/2', '3/8', '1/3', '1/4', '3/16', '1/6', '1/8', '3/32', '1/12', '1/16', '3/64', '1/24', '1/32', '3/128', '1/48', '1/64'));
ns(119, 'Length', 'Control Sequencer', Array.from({ length: 32 }, (_, value) => ({ value, label: `${value + 1} Steps` })));
nr(120, 'Swing', 'Control Sequencer', 25, false, 'Documented endpoints: 0 = 50%; 25 = 75%.');
ns(121, 'Cycle / Restart', 'Control Sequencer', choices('Cycle', 'Key Restart', 'Cycle + Restart'));
nr(122, 'Smoothing', 'Control Sequencer');
for (let i = 0; i < 32; i++) nr(123 + i, `Step ${i + 1}`, 'Control Sequencer', 255, false, '0 skips the step; 1 = −127, 128 = neutral, and 255 = +127.');
nt(155, 'Arpeggiator On', 'Arpeggiator', true);
ns(156, 'Pattern', 'Arpeggiator', choices('Up', 'Down', 'Up & Down', 'Up Inverted', 'Down Inverted', 'Up & Down Inverted', 'Up Alternate', 'Down Alternate', 'Random', 'As Played', 'Chord'));
nr(157, 'Tempo', 'Arpeggiator', 255, true, 'Documented range: 20–275 BPM in 1 BPM steps. Applies only with the internal clock.');
ns(158, 'Rate', 'Arpeggiator', choices('1/2', '3/8', '1/3', '1/4', '3/16', '1/6', '1/8', '3/32', '1/12', '1/16', '1/24', '1/32', '1/48'));
nt(159, 'Key Sync', 'Arpeggiator');
nr(160, 'Gate Time', 'Arpeggiator', 255, true);
nt(161, 'Hold', 'Arpeggiator', true);
ns(162, 'Rhythm Pattern', 'Arpeggiator', [{ value: 0, label: 'Off' }, ...Array.from({ length: 64 }, (_, i) => ({ value: i + 1, label: i < 32 ? `Factory ${i + 1}` : `User ${i - 31}` }))]);
nr(163, 'Swing', 'Arpeggiator', 25, false, 'Documented endpoints: 0 = 50%; 25 = 75%.');
ns(164, 'Range', 'Arpeggiator', Array.from({ length: 6 }, (_, value) => ({ value, label: `${value + 1} Octave${value ? 's' : ''}` })));
ns(165, 'FX Routing', 'Routing', choices('1 → 2 → 3 → 4', '(1 ∥ 2) → 3 → 4', '(1 ∥ 2) → (3 ∥ 4)', '1 ∥ 2 ∥ 3 ∥ 4', '(1 ∥ 2 ∥ 3) → 4', '1 → 2 → (3 ∥ 4)', '1 → (2 ∥ 3 ∥ 4)', '(1 → 2 → 3) ∥ 4', '3 → 4; 4 → 1 → 2 feedback', '4; 4 → 1 → 2 → 3 feedback'), 'The last two routings use feedback; monitor the output level.');
const effects = choices('TC-DeepVRB', 'Ambience', 'Room Rev', 'VintageRev', 'Hall Rev', 'Chamber Rev', 'Plate Rev', 'Rich Plate', 'Gated Rev', 'Reverse', 'ChorusVerb', 'DelayVerb', 'FlangeVerb', '4Band EQ', 'Enhancer', 'FairComp', 'MulBndDist', 'RackAmp', 'EdisonEX1', 'Auto-Pan', 'NoiseGate', 'Delay', '3TapDelay', '4TapDelay', 'T-RayDelay', 'DecimDelay', 'ModDlyRev', 'Chorus', 'Chorus-D', 'Flanger', 'Phaser', 'MoodFilter', 'Dual Pitch', 'RotarySpkr');
for (let slot = 0; slot < 4; slot++) {
  const section = `FX ${slot + 1}`, start = 166 + slot * 13;
  ns(start, 'Algorithm', section, effects, 'Loads a different effect in this slot and may replace the current edit. MIDI values are zero-based.');
  deepControls.at(-1).apply = (_state, _value, staleSet) => {
    for (let n = start + 1; n <= start + 12; n++) staleSet.add(`nrpn-${n}`);
    staleSet.add(`nrpn-${218 + slot}`);
  };
  for (let param = 0; param < 12; param++) nr(start + param + 1, `Parameter ${param + 1}`, section, 255, false, 'The function depends on the loaded algorithm (§9). Not every effect uses all 12 parameters; check the display. Units are not specified.');
  nr(218 + slot, 'Output Gain', section, 150, false, 'The manual documents this shared range for all four slots; monitor the output when using feedback.');
}
ns(222, 'FX Mode', 'Routing', choices('Insert', 'Send / Return', 'Bypass'));
const ascii = indexed(127, 'ASCII').map(({ value, label }) => ({
  value, label: value === 0 ? 'End Name' : value === 32 ? 'Space' : value > 32 && value < 127 ? String.fromCharCode(value) : label,
}));
for (let char = 0; char < 17; char++) ns(223 + char, `Character ${char + 1}`, 'Program Name', ascii, 'ASCII byte; 0 terminates the name. The name has 16 characters plus a terminator. This does not save the program.');
ns(240, 'Category', 'Program', choices('No Category', 'Bass', 'Pad', 'Lead', 'Mono', 'Poly', 'Stab', 'Sound Effects', 'Arpeggio', 'Sequence', 'Percussion', 'Atmosphere', 'Modular', 'User 1', 'User 2', 'User 3', 'User 4'));
const transpose = range('nrpn', 241, 'Program Transpose', 'Program', 176, false, '128 = no transposition; the documented range is −48 to +48 semitones. This does not transpose the global keyboard.');
transpose.min = 80; transpose.initial = 128;
deepControls.push(transpose);
for (const [n, name, section] of [
  [0, 'Bank Select · MSB', 'Program'], [32, 'Bank Select · LSB', 'Program'], [1, 'Mod Wheel', 'Performance'],
  [2, 'Breath Controller', 'Performance'], [4, 'Foot Controller', 'Performance'], [7, 'MIDI Volume', 'Amplifier'],
  [8, 'MIDI Balance', 'Amplifier'], [10, 'MIDI Pan', 'Amplifier'], [11, 'MIDI Expression', 'Performance'],
  [113, 'Analog Bypass', 'Routing'], [115, 'Mod Matrix · X Axis', 'Performance'],
  [116, 'Mod Matrix · Y Axis', 'Performance'], [117, 'Mod Matrix · Z Axis', 'Performance'],
]) deepControls.push(range('cc', n, name, section, 127, n === 1, n === 0 || n === 32 ? 'Bank Select is recognized, but the manual does not map these bytes to banks A–H. This is not a save command.' : undefined));
deepControls.push(switchControl('cc', 64, 'Sustain Pedal', 'Performance', 127));
for (const [n, name] of [[120, 'All Sound Off'], [121, 'Reset All Controllers'], [123, 'All Notes Off'], [124, 'Omni Mode Off'], [125, 'Omni Mode On'], [126, 'Mono Mode'], [127, 'Poly Mode']]) deepControls.push(command(n, name, 'MIDI Mode Message documented in §16.2; this is not a factory reset.', n === 121 ? 'Reset performance controllers?' : undefined));
deepControls.push(switchControl('cc', 122, 'Local Control', 'Performance Messages', 127, false, 'Can disconnect the keyboard from the internal sound engine. Does not change global SysEx settings.'));
deepControls.find((c) => c.id === 'cc-121').apply = (_state, _value, staleSet) => {
  for (const n of [1, 2, 4, 7, 8, 10, 11, 64, 115, 116, 117]) staleSet.add(`cc-${n}`);
};

const microControls = [
  [2, 'Spice', 'Spice & Dice'], [5, 'Glide', 'Performance'], [9, 'Oscillator Type · MIDI Value', 'Digital Oscillator'],
  [10, 'Wave', 'Digital Oscillator'], [12, 'Timbre', 'Digital Oscillator'], [13, 'Shape', 'Digital Oscillator'],
  [23, 'Cutoff', 'Analog Filter'], [24, 'Cycling Envelope Amount', 'Cycling Envelope'], [26, 'Envelope Amount', 'Envelope'],
  [28, 'Cycling Envelope Hold', 'Cycling Envelope'], [29, 'Sustain', 'Envelope'], [83, 'Resonance', 'Analog Filter'],
  [91, 'Arp / Seq Rate', 'Arpeggiator & Sequencer'], [92, 'Arp / Seq Sync Rate · MIDI Value', 'Arpeggiator & Sequencer'],
  [93, 'LFO Rate', 'LFO'], [94, 'LFO Sync Rate · MIDI Value', 'LFO'],
  [102, 'Rise', 'Cycling Envelope'], [103, 'Fall', 'Cycling Envelope'], [105, 'Attack', 'Envelope'], [106, 'Decay / Release', 'Envelope'],
].map(([n, name, section]) => range('cc', n, name, section, 127, true,
  n === 9 ? 'Selects the digital oscillator engine. Appendix D does not publish engine boundaries; check the engine name on the display. Firmware IDs are not inferred.'
    : [10, 12, 13].includes(n) ? 'The function varies by engine, including Vocoder, Wavetable, and samples. Check the current engine on the display.'
      : [92, 94].includes(n) ? 'The available divisions depend on the instrument Sync setting. The manual does not specify CC breakpoints; use the display as reference.'
        : undefined));
microControls.find((c) => c.number === 2).visual = 'touch';
microControls.push(switchControl('cc', 64, 'Hold', 'Performance', 127, true, 'CC64 controls the documented keyboard hold; it does not select a sequence.'));

const drumRows = [
  ['BD', 'Bass Drum', 36, 35, 20, 23, 24, 96], ['SD', 'Snare Drum', 38, 40, 25, 28, 29, 97],
  ['LT', 'Low Tom', 43, 41, 46, 47, 48, 102], ['MT', 'Mid Tom', 47, 45, 49, 50, 51, 103],
  ['HT', 'Hi Tom', 50, 48, 52, 53, 54, 104], ['RS', 'Rim Shot', 37, 56, 55, 56, 57, 105],
  ['HC', 'Hand Clap', 39, 54, 58, 59, 60, 106], ['CH', 'Closed Hi-Hat', 42, 44, 61, 62, 63, 107],
  ['OH', 'Open Hi-Hat', 46, 55, 80, 81, 82, 108], ['CC', 'Crash Cymbal', 49, 61, 83, 84, 85, 109],
  ['RC', 'Ride Cymbal', 51, 63, 86, 87, 88, 110],
];
const trControls = [
  [9, 'Shuffle', 'Rhythm'], [12, 'Ext In Level', 'Input & Effects'], [16, 'Delay Level', 'Input & Effects'],
  [17, 'Delay Time', 'Input & Effects'], [18, 'Delay Feedback', 'Input & Effects'],
  [19, 'MASTER FX CTRL', 'Input & Effects'], [71, 'Accent', 'Rhythm'], [91, 'Reverb Level', 'Input & Effects'],
].map(([n, name, section]) => range('cc', n, name, section, 127, true, n === 19 ? 'Controls the parameter currently assigned to MASTER FX CTRL. Choose the assignment and effect type on the hardware; this CC does not select them.' : undefined));
trControls[5].hint = 'Controls the parameter currently assigned to MASTER FX CTRL. Choose the assignment and effect type on the hardware; this CC does not select them.';
trControls.push(switchControl('cc', 15, 'MASTER FX On', 'Input & Effects', 127, true));
for (const [id, name, , , tune, decay, level, ctrl] of drumRows) {
  for (const [n, label] of [[tune, 'Tune'], [decay, 'Decay'], [level, 'Level'], [ctrl, 'CTRL']]) trControls.push(range('cc', n, `${id} · ${label}`, name, 127, true,
    n === ctrl ? 'Controls this instrument’s current CTRL assignment. Choose the destination with CTRL SELECT / INST on the TR-8S; this CC does not select instruments or algorithms.' : 'The response depends on the selected instrument or sample in the current kit. The MIDI chart does not define an absolute unit.'));
  trControls.find((c) => c.number === level).visual = 'fader';
}
const proControls = [
  [1, 'Modulation', 'Performance', 127, false], [5, 'Portamento', 'Performance', 31, false],
  ...Array.from({ length: 4 }, (_, i) => [24 + i, `Wave ${'ABCD'[i]}`, `Oscillator ${'ABCD'[i]}`, 127, true]),
  [28, 'LFO 2 Depth', 'LFO 2', 99, true], [47, 'Filter Envelope Amount', 'Filter', 127, false],
  [54, 'LFO 1 Shape · MIDI Value', 'LFO 1', 127, false], [55, 'LFO 2 Shape · MIDI Value', 'LFO 2', 127, false],
  [70, 'LFO 1 Depth', 'LFO 1', 99, true], [71, 'Resonance', 'Filter', 99, true],
  [72, 'LFO 1 Rate', 'LFO 1', 99, true], [73, 'LFO 2 Rate', 'LFO 2', 99, true],
  [74, 'Cutoff', 'Filter', 99, true],
  ...['Amp', 'Filter'].flatMap((section, env) => ['Attack', 'Decay', 'Sustain', 'Release'].map((name, i) => [81 + env * 4 + i, name, `${section} Envelope`, 99, true])),
  [91, 'Chorus Depth', 'Effects', 99, true], [92, 'Chorus Rate', 'Effects', 99, true],
  ...Array.from({ length: 4 }, (_, i) => [111 + i, `Fine Tune ${'ABCD'[i]}`, `Oscillator ${'ABCD'[i]}`, 99, true]),
  ...Array.from({ length: 3 }, (_, i) => [115 + i, `Coarse Tune ${'ABC'[i]}`, `Oscillator ${'ABC'[i]}`, 99, true]),
  [118, 'Coarse Tune · CC118 Ambiguous', 'Documented Tuning', 99, false],
].map(([n, name, section, max, physical]) => range('cc', n, name, section, max, physical,
  n === 118 ? 'The official table repeats “Voice C” for CC118. Do not assume it means Voice D; verify on the instrument before use.'
    : [54, 55].includes(n) ? 'The CC table names Triangle, Square, and Saw but does not publish value boundaries. The panel also offers Ramp and S&H; no CC values are inferred.'
      : [91, 92].includes(n) ? 'The manual identifies these CCs as Chorus controls. Their behavior in Ensemble / Reverb modes is not specified.'
        : n === 47 ? 'The MIDI table specifies 0–127, although the panel menu displays 0–99; this control follows the MIDI range.'
          : undefined));
proControls.push({
  ...range('cc', 9, 'FX Engine', 'Effects', 127),
  kind: 'select', choices: [{ value: 0, label: 'Chorus' }, { value: 43, label: 'Ensemble' }, { value: 85, label: 'Reverb' }],
  hint: 'Documented ranges: 0–42 Chorus, 43–84 Ensemble, 85–127 Reverb. Requires firmware v2.',
});
for (const control of proControls.filter((c) => c.number >= 24 && c.number <= 27)) {
  control.kind = 'select';
  control.choices = indexed(127, 'Wave');
  control.hint = 'Selects this voice’s wave index (0–127). You do not need to select the voice on the panel before sending its dedicated CC.';
}

export const synthesizers = [
  {
    id: 'deepmind-12', name: 'DeepMind 12', brand: 'Behringer', category: 'synths',
    subtitle: '12-voice analog synthesis · rich textures and modulation',
    manualUrl: deepUrl, mainManualUrl: deepUrl, defaultChannel: 1,
    connection: 'Connect by class-compliant USB or MIDI DIN IN. In GLOBAL → CONNECTIVITY, set RX-CHANNEL and MIDI/USB-CTRL to NRPN for the port in use; set PROG-CHANGE to RX or RX-TX. NRPN uses CC99/98 for selection and CC6/38 for data; 8-bit values are not rescaled. Avoid MIDI loops: the DeepMind retransmits changes to its other ports.',
    appearance: { surface: '#303239', ink: '#eeeeeb', accent: '#e94942', layout: 'keyboard', knob: '#17191d' },
    panelTitle: 'DeepMind 12 Controls',
    panelOrder: ['LFO 1', 'LFO 2', 'Oscillators', 'Filter', 'VCA Envelope', 'VCF Envelope', 'MOD Envelope', 'Amplifier', 'Voices', 'Arpeggiator'],
    notes: { enabled: true, first: 48, count: 24 }, pitchBend: true,
    presets: { count: 128, offset: 0 },
    controls: deepControls,
    limitations: [
      '§17 specifies CC38 for the data LSB, including 0–1 selectors. NRPN messages include CC6=0 and CC38; the effective parameter maximum remains as listed, usually 255.',
      'Synthesis and FX CCs covered by NRPN are not duplicated. CC33 is Filter Modulation, not the Mod Wheel LSB; CC34–61 have their own functions and are not 14-bit CC pairs.',
      'The LFO 1 NRPN 5 table says 0–1 but its notes mention Spread through 255, so only Poly and Mono are offered. NRPN 61/70/79 repeat “Attack Curve”; Release Curve names are confirmed in §8.8.3.',
      'Program Change recall is limited to 128 positions, PC 0–127 (§4.2.3 and §16.1). Select Bank A on the hardware to recall its first 128 presets; PC uses the current bank. The instrument has 1,024 programs in eight banks, but §16.2 does not map CC0/32 to banks A–H, so remote recall of all 1,024 is not claimed.',
      'Save, calibration, hardware volume, global settings, Wi-Fi, and dumps/readback are outside this surface. §18 does not publish NRPN addresses for global settings, which are distinct from program parameters.',
      'Each FX slot’s 12 parameter functions depend on its loaded algorithm. Changing an algorithm does not read or update hardware values. The manual has conflicting CC X/Y/Z references in §§8.9 and 16.2; this descriptor follows the MIDI table’s CC115/116/117.',
    ],
  },
  {
    id: 'microfreak', name: 'MicroFreak', brand: 'Arturia', category: 'synths', edition: 'Firmware 5',
    subtitle: 'Digital oscillator engines · analog filter · hands-on sound design',
    manualUrl: microUrl, mainManualUrl: microUrl, defaultChannel: 1,
    connection: 'Connect by USB MIDI or the supplied Arturia Type B MIDI TRS adapter. In Utility → MIDI, set Input Chan to the receiving channel and avoid a Thru/Merge loop. Match Sync Source to USB or MIDI to use external clock. Knob Send CCs controls whether knob movements are transmitted; displayed values here are edits, not preset readback.',
    appearance: { surface: '#d8d4c6', ink: '#202529', accent: '#dc7936', layout: 'keyboard', knob: '#373838' },
    panelTitle: 'MicroFreak Controls',
    panelOrder: ['Digital Oscillator', 'Analog Filter', 'Cycling Envelope', 'Envelope', 'LFO', 'Spice & Dice', 'Arpeggiator & Sequencer', 'Performance'],
    controls: microControls, notes: { enabled: true, first: 48, count: 24 }, pitchBend: true,
    presets: { count: 128, offset: 0 }, additionalManualUrls: [microFaq],
    limitations: [
      'Appendix D documents CC but does not provide an NRPN table. No NRPNs are inferred for the Mod Matrix, Assign destinations, LFO Shape, filter mode, paraphonic settings, or sample menus.',
      'Oscillator Type and Sync Rate remain raw MIDI values because the manual does not publish engine-specific or sync-division boundaries. Wave, Timbre, and Shape change function with the selected engine.',
      'Arturia’s “How do the Program Changes work?” FAQ confirms USB/DIN reception and PC 0–127 for presets 1–128; its three listed banks do not identify CC0/32. The v5 manual confirms 512 slots but does not publish the fourth bank’s bytes. Recall is limited to 128 positions in the current bank; select the bank on the hardware first.',
      'Arturia’s “MIDI Implementation Chart” FAQ confirms transmitted and received Pitch Bend; this uses the standard MIDI message without inferring a semitone range. Its 0–127 field is not treated as an NRPN or CC scale.',
      'Save/Utility, A/B sequence selection, step recording, Dice, filter mode, and the Mod Matrix have no assigned CCs in this manual. Samples and wavetables require MIDI Control Center. Received transport remains unverified: §12 documents transmitted Start/Stop, not a receive column.',
    ],
  },
  {
    id: 'tr-8s', name: 'TR-8S', brand: 'Roland', category: 'synths', edition: 'Reference 3.00',
    subtitle: '11 instrument tracks · beats and sound variation',
    manualUrl: trUrl, mainManualUrl: trMain, defaultChannel: 10,
    connection: 'Connect by MIDI DIN IN or USB with the Roland driver if required. In UTILITY → MIDI, enable Rx EditData and Rx Prog Chg; use Pattern Ch for patterns or Kit Ch to change kits by PC. For transport, enable RxStartStop and choose TempoSync USB/MIDI/AUTO. Notes and ALT notes below are factory assignments and can be changed in Inst Note. Do not route USBMidiThru/Soft Thru back to the input.',
    appearance: { surface: '#272d31', ink: '#e6e8e7', accent: '#56d08a', layout: 'drum', knob: '#101719' },
    panelTitle: 'TR-8S Instrument Tracks',
    panelOrder: ['Bass Drum', 'Snare Drum', 'Low Tom', 'Mid Tom', 'Hi Tom', 'Rim Shot', 'Hand Clap', 'Closed Hi-Hat', 'Open Hi-Hat', 'Crash Cymbal', 'Ride Cymbal', 'Rhythm', 'Input & Effects'],
    controls: trControls, presets: { count: 128, offset: 0 },
    notes: { enabled: true, pads: drumRows.flatMap(([id, name, note, alt]) => [{ note, name: `${id} · ${name}` }, { note: alt, name: `${id} · ALT` }]) },
    transport: { start: true, stop: true, continue: true },
    limitations: [
      'CC14 AUTO FILL ON and CC70 MANUAL TRIG are transmit-only (LocalSw SURFACE); they are not sent as remote controls.',
      'CTRL CC96/97/102–110 and MASTER FX CTRL CC19 operate on the assignments in the kit. The manual does not assign CCs for choosing those destinations.',
      'PC 0–127 selects a pattern on Pattern Ch or a kit on Kit Ch. Matching channels can affect both; choose separate channels on the hardware when needed.',
      'This chart does not list received Pitch Bend, SysEx, Song Position, All Notes Off, or Reset Controllers. Panic should send Note Off for the notes played.',
      'Instrument/sample/ACB/FM selection, individual outputs, kit routing, TR-REC recording, A–H variations, mute, and SD recording have no dedicated receive messages in this chart.',
    ],
  },
  {
    id: 'pro-vs-mini', name: 'PRO-VS MINI', brand: 'Behringer', category: 'synths', edition: 'Firmware 2',
    subtitle: 'Hybrid vector synthesis · evolving waveforms',
    manualUrl: proUrl, mainManualUrl: proUrl, defaultChannel: 1,
    connection: 'Connect by class-compliant USB-C or MIDI DIN IN. In FUNC → MENU, set MIDI RX and enable MIDI CC or external controllers are ignored. Set Sync Source to USB or MIDI on the hardware when using external clock. Connect PHONES/audio separately; USB carries MIDI, not audio.',
    appearance: { surface: '#272731', ink: '#ebe8e7', accent: '#e95c55', layout: 'wide', knob: '#14141a' },
    panelTitle: 'PRO-VS MINI Controls',
    panelOrder: ['Oscillator A', 'Oscillator B', 'Oscillator C', 'Oscillator D', 'LFO 1', 'LFO 2', 'Filter', 'Amp Envelope', 'Filter Envelope', 'Effects'],
    controls: proControls, notes: { enabled: true, first: 48, count: 24 },
    limitations: [
      'The v2 MIDI table documents these 34 CCs; no NRPNs are verified. CC118 repeats Voice C instead of identifying D, so the document is not corrected by assumption.',
      'The joystick X/Y axes have no published CCs. CC115/116 are Coarse Tune for Oscillators A/B, CC117 is Oscillator C, and CC118 repeats Voice C; these are not vector-axis controls. No XY metadata is set. The MIX envelope points/loop/repeat, envelope/LFO/voice selector, output volume, and OSC ENGINE menu also have no published CCs. Envelope CCs here are AMP/FILTER, not MIX.',
      'The panel offers five LFO shapes; the CC table names only three and provides no value boundaries, so no shape selector is inferred.',
      'Tempo, swing, scale, sequencer, arpeggiator, hold/chord, storage, and reset remain hardware controls. The v2 quick-start guide publishes a CC table, not a receive chart for PC/Pitch Bend/transport; programs on the display do not prove PC reception. MIDI preset recall is unverified, not declared incompatible.',
      'CC9 documents the newer Ensemble/Reverb engines, but CC91/92 remain labeled Chorus. No additional scales are inferred.',
    ],
  },
];
