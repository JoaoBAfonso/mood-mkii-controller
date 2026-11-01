const choices = (labels, first = 0) => labels.map((label, index) => ({ value: first + index, label }));
const range = (number, name, section, max = 127, initial = 64, hint = '', physical = false) => ({
  id: `cc-${number}`, name, section, kind: 'range', protocol: 'cc', number,
  min: 0, max, initial, physical, endpoints: ['Low', 'High'],
  optionsHint: 'Knob position; not a calibrated measurement.',
  hint: hint || 'Adjusts this pedal parameter. The displayed value is local, not hardware readback.',
});
const select = (number, name, section, options, initial = options[0].value, hint = '', physical = false) => ({
  ...range(number, name, section, Math.max(...options.map((option) => option.value)), initial, hint, physical),
  min: Math.min(...options.map((option) => option.value)), kind: 'select', choices: options,
});
const toggle = (number, name, section, onValue = 127, offValue = 0, hint = '', physical = false) => ({
  ...range(number, name, section, Math.max(onValue, offValue), offValue, hint, physical), kind: 'toggle', onValue, offValue,
});
const action = (number, name, section, value = 127, hint = '', physical = false) => {
  const control = { ...range(number, name, section, 127, 0, hint, physical), kind: 'action', value };
  delete control.initial;
  return control;
};
const toggleBypass = (state, value, stale) => {
  if (stale?.has('cc-101')) return state;
  if (Number.isInteger(state['cc-101'])) state['cc-101'] = state['cc-101'] >= 64 ? 0 : 127;
  return state;
};
const appearance = (surface, ink, accent, layout = 'wide') => ({ surface, ink, accent, layout, knob: '#292929' });
const rawBankPreset = (count, skipManual = false) => (channel, slot) => {
  if (!Number.isInteger(channel) || channel < 1 || channel > 16 ||
      !Number.isInteger(slot) || slot < 1 || slot > count) throw new RangeError('Invalid channel or preset.');
  let program = slot - 1;
  if (skipManual && program >= 127) program++;
  return [[0xb0 + channel - 1, 0, Math.floor(program / 128)], [0xc0 + channel - 1, program % 128]];
};
const sourceAudio = 'https://cdn.shopify.com/s/files/1/0938/1593/0953/files/';

const sl2 = {
  id: 'boss-sl-2', name: 'SL-2', brand: 'BOSS', category: 'pedals', visualization: 'slicer',
  subtitle: 'Rhythmic slices synchronized to your performance.',
  manualUrl: 'https://static.roland.com/manuals/sl-2/eng/33861479.html',
  mainManualUrl: 'https://static.roland.com/manuals/sl-2/eng/index.html',
  defaultChannel: 1,
  connection: 'Connect a MIDI interface to the 3.5 mm MIDI IN using a BOSS BMIDI-5-35 or compatible cable. Do not confuse MIDI IN with CTL/EXP. Set the channel at startup: DUAL (4), other knobs at maximum, pedal held while powering on; VARIATION 1–10 selects channels 1–10 and 11 receives all. USB is not a MIDI port on this pedal.',
  appearance: appearance('#24adac', '#102a2a', '#efdf66', 'compact'),
  controls: [
    range(16, 'Expression · effect level', 'Expression', 127, 64, 'Controls processed sound level like an expression pedal; does not change pattern selection.'),
    range(80, 'Effect On/Off · unconfirmed values', 'Pedal', 127, 0, 'The manual assigns CC80 to on/off but does not define value ranges. Check your hardware response; this is not shown as a confirmed state.', true),
    action(81, 'Tap tempo', 'Performance', 127, 'The interval between messages sets tempo. Ignored while following MIDI Clock.', true),
  ],
  transport: { start: true, stop: true, continue: true },
  limitations: [
    'Only CC16, CC80 and CC81 are documented. BALANCE, ATTACK, DUTY, TEMPO, type and VARIATION are physical adjustments, not additional CCs.',
    'Physical types: SINGLE (1/2), DUAL (3/4), TREMOLO (5), HARMONIC (6), SFX (7/8); each has 11 variations. No remote selection of the 88 patterns or Program Change presets is documented.',
    'OUTPUT MODE and CTL/EXP assignments are configured on hardware. Sync receives F8/FA/FB/FC; Start restarts the pattern. MIDI Clock tempo is not stored.',
    'Official documentation does not specify CC80 on/off values; no threshold of 64 is assumed.',
  ],
};

const deco = {
  id: 'strymon-deco-v2', name: 'Deco', edition: 'v2', brand: 'Strymon', category: 'pedals', visualization: 'tape',
  subtitle: 'Tape saturation and doubletracking in one texture.',
  manualUrl: 'https://www.strymon.net/manuals/Deco_v2_UserManual_RevD.pdf',
  mainManualUrl: 'https://www.strymon.net/manuals/Deco_v2_UserManual_RevD.pdf',
  defaultChannel: 1,
  connection: 'Use USB-C MIDI with the pedal powered, or the 6.35 mm EXP/MIDI jack with a compatible Strymon MIDI EXP/MIDI OUT. For TRS, set EXP/MIDI to MIDI (blue LED) and select the channel in the startup menu. An expression cable or generic TRS adapter does not guarantee a correct MIDI connection.',
  appearance: appearance('#e5e0d8', '#2d3338', '#ab733d'),
  presets: { count: 299, offset: 0, bankSize: 128 },
  presetMessages: rawBankPreset(299, true),
  controls: [
    select(0, 'MIDI Bank', 'Presets', choices(['0 · addresses 0–127', '1 · addresses 128–255', '2 · addresses 256–299']), 0, 'CC0 receives the bank number directly. Preset navigation sends bank and Program Change together.'),
    toggle(10, 'Tape Saturation', 'Tape Saturation', 127, 0, 'Zero bypasses; any nonzero value engages saturation.', true),
    select(11, 'Voice', 'Tape Saturation', choices(['Classic', 'Cassette'], 1), 1, 'Classic offers studio tape response; Cassette adds characteristic cassette compression.', true),
    range(12, 'Saturation', 'Tape Saturation', 127, 64, 'Increases tape density and compression.', true),
    range(13, 'Volume', 'Tape Saturation', 127, 64, 'Balances level after saturation.', true),
    range(14, 'Tone', 'Tape Saturation', 127, 64, 'Shapes the saturation deck presence.', true),
    range(15, 'Low Trim', 'Tape Saturation', 127, 0, 'Secondary function: reduces lows to make room in the arrangement.'),
    toggle(16, 'Doubletracker', 'Doubletracker', 127, 0, 'Engages the second tape deck; zero bypasses.', true),
    select(17, 'Type', 'Doubletracker', choices(['Sum', 'Invert', 'Bounce'], 1), 1, 'Selects summed decks, phase inversion or repeats between channels.', true),
    range(18, 'Lag Time', 'Doubletracker', 127, 64, 'Moves through flanging, chorus and echoes by changing the time offset between decks.', true),
    range(19, 'Wobble', 'Doubletracker', 127, 0, 'Introduces small speed fluctuations.', true),
    range(20, 'Blend', 'Doubletracker', 127, 64, 'Blends the two decks for the desired texture.', true),
    range(21, 'Doubletracker Boost/Cut', 'Doubletracker', 127, 64, 'Secondary level adjustment for the second deck.'),
    range(22, 'Auto-Flange Time', 'Doubletracker', 127, 64, 'Sets the duration of the automatic flange sweep.'),
    toggle(23, 'Wide Stereo', 'Doubletracker', 127, 0, 'Widens the stereo image; use both outputs to hear the spread.'),
    select(25, 'Clock Multiplier', 'Synchronization', choices(['×2/3', '×1', '×2', '×3', '×4', '×6', '×8']), 1),
    toggle(33, 'A + B On/Off', 'Performance', 127, 0, 'Engages or bypasses both sections together.'),
    toggle(60, 'MIDI Expression On/Off', 'Expression'),
    toggle(63, 'MIDI Clock On/Off', 'Synchronization'),
    action(93, 'Remote Tap', 'Performance', 127, 'Send two spaced taps to set tempo.'),
    toggle(97, 'Auto-Flange · hold', 'Performance', 127, 0, 'Send 127 to engage auto-flange and zero to release it.', true),
    range(100, 'Expression', 'Expression', 127, 0, 'Zero is heel; 127 is toe. Configure destinations and enable CC60.'),
    { ...action(0, 'Manual Mode', 'Presets', 0, 'Selects bank 0 and PC127: returns to physical knobs and switches without saving data.'),
      id: 'manual-mode', invalidatesState: true, messages: (channel) => [[0xb0 + channel - 1, 0, 0], [0xc0 + channel - 1, 127]] },
  ],
  limitations: ['There are 300 addresses, but bank 0/PC127 is manual mode and stores no data: the 299 interface slots skip it. Saving presets requires the physical footswitch sequence in the manual; no save CC exists in this map.'],
};

const mobiusParameters = [
  [24, 'Flanger · Mode', 5, 'Silver / Grey / Black + / Black − / Zero + / Zero −'],
  [25, 'Flanger · Regen', 17], [26, 'Flanger · Manual', 17],
  [28, 'Chorus · Mode', 4, 'dBucket / Multi / Vibrato / Detune / Digital'],
  [29, 'Chorus · Mix', 17], [30, 'Chorus · Tone', 20],
  [31, 'Vintage Trem · Mode', 2, 'Tube / Harmonic / Photoresistor'], [32, 'Vintage Trem · Pan', 1],
  [34, 'Rotary · Horn Level', 17], [35, 'Rotary · Preamp Drive', 17],
  [36, 'Rotary · Slow Rotor Speed', 17], [37, 'Rotary · Acceleration', 17],
  [40, 'Vibe · Waveshape', 17], [41, 'Vibe · Low End', 20],
  [42, 'Vibe · Headroom', 17], [43, 'Vibe · Mode', 1, 'Vibrato / Chorus'],
  [44, 'Phaser · Mode', 6, '2 / 4 / 6 / 8 / 12 / 16 stages; Barber Pole'],
  [45, 'Phaser · Regen', 17], [46, 'Phaser · Waveshape', 3],
  [47, 'Phaser · Stereo Spread', 4], [48, 'Filter · Mode', 2, 'Low Pass / Wah / High Pass'],
  [49, 'Filter · Waveshape', 7, 'Sine / Triangle / Square / Ramp / Saw / Random / Envelope + / Envelope −'],
  [50, 'Filter · Resonance', 18], [51, 'Filter · Dry Level', 18],
  [52, 'Filter · Frequency Middle', 20], [53, 'Quadrature · Mode', 3, 'AM / FM / Frequency Shifter + / Frequency Shifter −'],
  [54, 'Quadrature · Shift', 17], [55, 'Quadrature · Mix', 20],
  [56, 'Quadrature · LFO', 6], [57, 'Autoswell · Rise Time', 22],
  [58, 'Autoswell · Shape', 3, 'Exponential / Quadratic / Ramp / Logarithmic'],
  [59, 'Destroyer · Bit Depth', 20], [61, 'Destroyer · Sample Rate', 20],
  [62, 'Destroyer · Filter', 8, 'Off / Vintage Amp / Victrola / 70s Clock Radio / Bullhorn Megaphone / Cheerleader Megaphone / Antique Telephone / Cell Phone / Intercom'],
  [63, 'Destroyer · Vinyl', 18], [64, 'Destroyer · Mix', 20],
  [65, 'Formant · Vowel 1', 5, 'AA / EE / EYE / OH / OOH / Random'],
  [66, 'Formant · Vowel 2', 5, 'AA / EE / EYE / OH / OOH / Random'],
  [67, 'Formant · LFO', 6, 'Sine / Square / Ramp / Saw / Random / Envelope / Expression'],
  [68, 'Phaser · Headroom', 17], [69, 'Filter · Stereo Spread', 4],
  ...Array.from({ length: 8 }, (_, index) => [105 + index, `Pattern Trem · Beat ${index + 1}`, index ? 18 : 17,
    'One to sixteen pulses, continuous sound or silence; beats 2–8 add sequence end. Values are MIDI map indices.']),
  [113, 'Pattern Trem · Waveshape', 6, 'Sine / Triangle / Square / Rectangle / Pulse / Ramp / Saw'],
  [114, 'Pattern Trem · Pan', 1], [115, 'Formant · Stereo Spread', 4],
];
const mobiusOptions = {
  24: choices(['Silver', 'Grey', 'Black +', 'Black −', 'Zero +', 'Zero −']),
  28: choices(['dBucket', 'Multi', 'Vibrato', 'Detune', 'Digital']),
  31: choices(['Tube', 'Harmonic', 'Photoresistor']),
  43: choices(['Vibrato', 'Chorus']),
  44: choices(['2 stages', '4 stages', '6 stages', '8 stages', '12 stages', '16 stages', 'Barber Pole']),
  48: choices(['Low Pass', 'Wah', 'High Pass']),
  49: choices(['Sine', 'Triangle', 'Square', 'Ramp', 'Saw', 'Random', 'Envelope +', 'Envelope −']),
  53: choices(['AM', 'FM', 'Frequency Shifter +', 'Frequency Shifter −']),
  58: choices(['Exponential', 'Quadratic', 'Ramp', 'Logarithmic']),
  59: choices(['4 bit','4.5 bit','5 bit','5.5 bit','6 bit','6.5 bit','7 bit','7.5 bit','8 bit','9 bit','10 bit','11 bit','12 bit','13 bit','14 bit','15 bit','16 bit','18 bit','20 bit','24 bit','32 bit']),
  61: choices(['750 Hz','1 kHz','1.5 kHz','2 kHz','3 kHz','4 kHz','5 kHz','6 kHz','7 kHz','8 kHz','9 kHz','10 kHz','11 kHz','12 kHz','14 kHz','16 kHz','19 kHz','24 kHz','32 kHz','48 kHz','96 kHz']),
  65: choices(['AA', 'EE', 'EYE', 'OH', 'OOH', 'Random']),
  66: choices(['AA', 'EE', 'EYE', 'OH', 'OOH', 'Random']),
  67: choices(['Sine', 'Square', 'Ramp', 'Saw', 'Random', 'Envelope', 'Expression']),
  113: choices(['Sine', 'Triangle', 'Square', 'Rectangle', 'Pulse', 'Ramp', 'Saw']),
};
const mobius = {
  id: 'strymon-mobius', name: 'Mobius', brand: 'Strymon', category: 'pedals', visualization: 'modulation',
  subtitle: 'Twelve modulation machines, continuous movement.',
  manualUrl: 'https://www.strymon.net/manuals/Mobius_UserManual_REVF.pdf',
  mainManualUrl: 'https://www.strymon.net/manuals/Mobius_UserManual_REVF.pdf',
  defaultChannel: 1,
  connection: 'Connect a MIDI interface DIN output to the 5-pin MIDI IN. Mobius has no USB MIDI. Select MIDICH in the global menu; enable MIDI Clock per preset to synchronize. Pre/Post requires appropriate audio wiring and the rear switch setting.',
  appearance: appearance('#3b7399', '#f4f3ed', '#eda346'),
  presets: { count: 200, offset: 0, bankSize: 128 },
  presetMessages: rawBankPreset(200),
  transport: { start: true },
  controls: [
    select(0, 'MIDI Bank', 'Presets', choices(['0 · 00A–63B', '1 · 64A–99B'])),
    range(9, 'Param 1', 'Knobs', 127, 64, 'Controls the parameter assigned to Param 1 in the current preset.', true),
    range(15, 'Level', 'Knobs', 127, 64, 'Balances effect output volume.', true),
    range(16, 'Param 2', 'Knobs', 127, 64, 'Controls the parameter assigned to Param 2 in the current preset.', true),
    range(17, 'Speed', 'Knobs', 127, 64, 'Changes the selected machine speed.', true),
    range(18, 'Depth', 'Knobs', 127, 64, 'Sets the movement depth.', true),
    select(19, 'Type', 'Knobs', choices(['Chorus', 'Flanger', 'Rotary', 'Vibe', 'Phaser', 'Filter', 'Formant', 'Vintage Trem', 'Pattern Trem', 'Autoswell', 'Destroyer', 'Quadrature']), 0, 'Selects one of twelve machines; machine-specific parameters appear in their own section.', true),
    select(21, 'Tap Division', 'Synchronization', choices(['Whole note', 'Half note', 'Quarter note', 'Dotted eighth', 'Eighth note', 'Triplet', 'Sixteenth note']), 2),
    select(22, 'Pre/Post', 'Routing', choices(['Pre', 'Post'])),
    select(39, 'Tap/Speed · Rotary Tap Select', 'Performance', choices(['Tap', 'Speed']), 0, 'CC39 is shared with Rotary Tap Select; in Rotary it chooses the TAP function, not an independent parameter.'),
    toggle(60, 'Expression On/Off', 'Expression', 1),
    toggle(70, 'MIDI Clock On/Off', 'Synchronization', 1),
    ...mobiusParameters.map(([cc, name, max, help]) => {
      const section = name.split(' · ')[0];
      const hint = `${help ? `Options: ${help}. ` : ''}Machine-specific adjustment; the range is the documented MIDI index, not a percentage.`;
      return mobiusOptions[cc] ? select(cc, name, section, mobiusOptions[cc], 0, hint) : range(cc, name, section, max, 0, hint);
    }),
    toggle(80, 'A · hold', 'Footswitches', 0, 127, 'Zero presses; 127 releases. Do not leave the switch held after a performance.', true),
    toggle(82, 'B · hold', 'Footswitches', 0, 127, 'Zero presses; 127 releases. May operate banks/presets depending on hardware usage.', true),
    toggle(81, 'TAP · hold', 'Footswitches', 127, 0, '127 engages physical TAP; zero releases.', true),
    action(93, 'Remote Tap', 'Performance'),
    range(100, 'Expression', 'Expression', 127, 0, 'Moves through destinations configured in EP SET.'),
    toggle(102, 'Effect On/Off', 'Performance'),
    action(125, 'Phase Reset', 'Performance', 127, 'Restarts the modulation cycle to align attacks.'),
  ],
  limitations: [
    'CC ranges follow revision F. Phaser Waveshape describes five names but only 0–3 in the table; Vintage Trem Pan describes three positions but only 0–1. Official limits are preserved without inventing extra indices.',
    'MIDI Start resets phase; Stop/Continue reception is not documented. Naming, knob assignments, global settings and preset saving require hardware.',
  ],
};

const db = (value) => `${value - 18} dB`;
const eq2 = {
  id: 'source-audio-eq2', name: 'EQ2', brand: 'Source Audio', category: 'pedals', visualization: 'eq',
  subtitle: 'Twenty bands to shape two audio paths.',
  manualUrl: `${sourceAudio}eq2_midi_mapping.pdf?v=1752577217`,
  mainManualUrl: `${sourceAudio}eq2_user_manual_compressed.pdf?v=1752634717`,
  defaultChannel: 1,
  connection: 'Use class-compliant USB MIDI with 9 V power, or 5-pin DIN MIDI IN. Select the channel in the EQ2 menu or Neuro. This panel uses only the factory MIDI map; confirm it has not been customized in Neuro > Device > Edit Device MIDI Map. Channel 2 follows Channel 1 until Split Mode is enabled on hardware/Neuro.',
  appearance: appearance('#bc2f36', '#fff6e6', '#70d5cf', 'compact'),
  presets: { count: 128, offset: 0 },
  controls: [
    range(0, 'Master Volume', 'Levels', 127, 64, 'Zero mutes; 64 is unity gain; 127 gives +12 dB.'),
    range(1, 'Input 1 Trim', 'Levels', 127, 64, 'Zero mutes; 64 is unity; 127 gives +6 dB.'),
    range(2, 'Input 2 Trim', 'Levels', 127, 64, 'Zero mutes; 64 is unity; 127 gives +6 dB.'),
    ...Array.from({ length: 20 }, (_, index) => {
      const channel = Math.floor(index / 10) + 1;
      const band = index % 10 + 1;
      return { ...range(3 + index, `Band ${band} · Gain`, `Channel ${channel}`, 36, 18, '1 dB steps from −18 to +18 dB; 18 leaves the band flat. Use the band selector and shared encoder.', true),
        eqBand: { channel, band }, label: db };
    }),
    ...Array.from({ length: 20 }, (_, index) => range(23 + index, `Band ${index % 10 + 1} · Frequency`,
      `Channel ${Math.floor(index / 10) + 1}`, 127, 64, 'Logarithmic distribution from 20 Hz to 20 kHz; moves the region shaped by this band.')),
    ...Array.from({ length: 20 }, (_, index) => ({
      ...range(43 + index, `Band ${index % 10 + 1} · Q`, `Channel ${Math.floor(index / 10) + 1}`, 95, 5,
        'Q from 0.5 to 10.0; value 5 gives Q 1.0. Higher Q narrows the affected region.'),
      label: (value) => ({ 0: 'Q 0.5', 5: 'Q 1.0', 95: 'Q 10.0' }[value] || 'Between documented Q points'),
    })),
    { ...range(69, 'Channel 1 · Gain', 'Levels', 36, 18), label: db },
    { ...range(70, 'Channel 2 · Gain', 'Levels', 36, 18), label: db },
    range(71, 'Channel 1 · High Pass', 'Input', 28, 0, 'Published map: 0 = 10 Hz and 28 = 80 Hz. The table contains an inconsistent step; firmware 1.16 extends the Neuro range without an updated CC map.'),
    range(72, 'Channel 2 · High Pass', 'Input', 28, 0, 'Uses published limits, 10–80 Hz. No MIDI scale is inferred for the expanded range in recent firmware.'),
    select(73, 'Routing', 'Routing', choices(['Auto Detect', 'Mono → Stereo', 'Stereo → Stereo', 'Stereo → Mono', 'Cascade']), 0, 'Cascade chains both curves; check wiring and enable Split for independent curves.'),
    action(80, 'Previous Preset', 'Presets'), action(82, 'Next Preset', 'Presets'),
    action(83, 'Tuner On', 'Performance', 127, 'Any value activates; the next CC message, of any number, deactivates the tuner.'),
    action(94, 'Remote Switch', 'Performance', 127, 'Runs the configured switch function; works only with Switch Action set to Latching.'),
    range(100, 'Remote Expression', 'Expression', 127, 0, 'Requires External Control Source set to MIDI and configured expression destinations.'),
    toggle(101, 'Effect On/Off', 'Performance', 127, 0, '0–63 bypasses; 64–127 engages.', true),
    { ...action(102, 'Toggle Bypass', 'Performance', 127, 'Toggles on every message regardless of value. Inverts only local CC101 state; without readback, unknown states stay unknown.'), apply: toggleBypass },
    range(103, 'Recall Preset · bypassed', 'Presets', 127, 0, 'Value is the zero-based preset address, recalled in bypass.'),
    range(104, 'Recall Preset · engaged', 'Presets', 127, 0, 'Value is the zero-based preset address, recalled engaged.'),
  ],
  limitations: [
    'Peak/Shelf on outer bands, Parallel/Series, phase, Split, limiter, gate, switch assignment/action and Enable External Control are configurable in Neuro but have no factory CCs: no addresses are invented.',
    'Encoder, SELECT and physical menus access bands and settings; no CC for saving presets or reading state is documented. The tuner does not output MIDI notes.',
  ],
};

const nemesisKnobs = [
  [2, 'Time', 'Time', 'Nonlinear timing, relative to the engine maximum.', true],
  [3, 'Maximum Delay Time', 'Time', 'Allowed maximum: approximately 10 ms to 2.6 s; 63 is near 1.3 s.'],
  [5, 'Feedback', 'Knobs', 'Controls repeats; the ceiling depends on Feedback Maximum.', true],
  [6, 'Mix', 'Knobs', '0 is dry only, 63 equal mix, 127 effect only; follows the global Mix option.', true],
  [7, 'Mod', 'Knobs', 'Modulation depth; distinct from the separate wow/flutter parameter.', true],
  [8, 'Rate', 'Knobs', 'Controls tape speed in tape engines; ranges from 0.1 to 10 Hz in other engines.', true],
  [9, 'Intensity', 'Knobs', 'Multiple destinations depending on the engine and Intensity Knob Remap.', true],
  [10, 'Output Level', 'Levels', '0 mutes; 52 is 0 dB; 127 is +8 dB.'],
  [11, 'Diffusion', 'Texture', 'Spreads attacks; switching it on/off may briefly mute the delay line.'],
  [12, 'Distortion', 'Texture'], [13, 'High Pass Filter', 'Filters'], [14, 'Low Pass Filter', 'Filters'],
  [15, 'Sample Rate Reduction', 'Texture'], [16, 'Sweep Filter Frequency', 'Filters'],
  [17, 'Sweep Filter Q', 'Filters'], [18, 'Sweep Filter Depth', 'Filters'],
  [19, 'Sweep Filter Mix', 'Filters', 'Sweep filter mix, applied only to Tap 1.'],
  [20, 'Wow and Flutter Depth', 'Tape'], [21, 'Wow and Flutter Rate', 'Tape'],
  [22, 'Wow Modulation Noise', 'Tape', 'Above 50, degraded tape enters noise and distortion.'],
  [23, 'Tremolo Depth', 'Modulation', '63 gives maximum sine tremolo; 127 rectifies the cycle and doubles the rate.'],
  [25, 'Tap 1 Level', 'Taps', '0 mutes, 63 = 0 dB, 127 = +6 dB.'],
  [26, 'Tap 1 Pan', 'Taps', '0 left, 63 center, 127 right.'],
  [27, 'Tap 2 Level', 'Taps', '0 mutes, 63 = 0 dB, 127 = +6 dB.'],
  [28, 'Tap 2 Pan', 'Taps', '0 left, 63 center, 127 right.'],
  [29, 'Tap 2 Delay Time', 'Taps', 'Fraction of Tap 1: 63–64 = half; 95–96 = three quarters; 127 = equal.'],
  [30, 'Input Low Pass Filter', 'Filters', 'Filters both dry and processed signals.'],
  [51, 'Delay Send', 'Taps', 'Zero cuts the delay input without necessarily cutting the tail; 127 sends everything.'],
];
const nemesisEngineNames = ['Digital', 'Diffuse', 'Analog', 'Tape', 'Noise Tape', 'Degrade', 'Shifter', 'Helix', 'Reverse', 'Sweeper', 'Rhythmic', 'Slapback', 'Resonant Analog', 'Tremolo', 'Sequenced Filters', 'Dub', 'Chorus', 'Flanger', 'Double Helix', 'Complex Rhythmic', 'Lo-Fi Retro', 'Warped Record', 'Compound Shifter', 'Oil Can'];
const ambiguousAdtEngines = new Set([5, 9, 10, 12, 23]);
const nemesis = {
  id: 'source-audio-nemesis-adt', name: 'Nemesis', edition: 'ADT', brand: 'Source Audio', category: 'pedals', visualization: 'delay',
  subtitle: 'Complex echoes with an analog dry path.',
  manualUrl: `${sourceAudio}nemesis_midi_implementation.pdf?v=1752577217`,
  mainManualUrl: `${sourceAudio}nemesis_adt_user_manual_compressed.pdf?v=1752634720`,
  defaultChannel: 1,
  connection: 'Connect class-compliant USB MIDI or 5-pin DIN MIDI IN with 9 V power. The receive channel is global and configured in Neuro. Confirm the factory map: custom knob mappings can replace original CCs. This is the current Nemesis ADT, not the original Nemesis.',
  appearance: appearance('#323330', '#f1ecd9', '#e1bc5f'),
  presets: { count: 128, offset: 0 },
  controls: [
    select(1, 'Engine · verified indices', 'Engines', choices(nemesisEngineNames).filter(({ value }) => !ambiguousAdtEngines.has(value)), 0,
      'Only indices matching both the ADT manual and manufacturer-linked MIDI table. Conflicting indices are omitted, not guessed.', true),
    ...nemesisKnobs.map(([cc, name, section, hint, physical]) => range(cc, name, section, 127, 64, hint, !!physical)),
    select(24, 'Pitch Shift', 'Pitch', Array.from({ length: 126 }, (_, value) => ({
      value, label: `${value >= 63 ? 'Reverse · ' : ''}${value < 63 ? 31 - value : value - 94} semitones`,
    })), 31, 'Full map: +31 to −31 semitones, followed by −31 to +31 in reverse. 126 and 127 are reserved.'),
    select(31, 'Feedback Maximum', 'Knobs', choices(['1.00× · no self-oscillation', '1.25×', '1.50×', '2.00×']), 0, 'Values above 1× may self-oscillate: start with low Feedback.'),
    toggle(32, 'LFO Sync to Delay', 'Modulation', 1),
    toggle(33, 'Invert Wet Phase · Left', 'Routing', 1),
    toggle(34, 'Invert Wet Phase · Right', 'Routing', 1),
    select(35, 'I/O Routing', 'Routing', choices(['Auto Detect', 'Mono → Mono/Stereo · hardware bypass', 'Mono → Wet 1 / Dry 2', 'Mono → Stereo · soft bypass', 'Stereo → Stereo', 'Feedback Loop Insert', 'External Loop Pre-Delay']), 0, 'The table declares 0–15 but explains only 0–6; other values are not offered.'),
    select(36, 'Multi-Feedback', 'Taps', choices(['Engine default', 'Tap 1 only · 1.0', 'Tap 2 only · 1.0', 'Tap 1 + 2 · 0.5 each'])),
    toggle(37, 'Sum Stereo to Mono', 'Routing', 1),
    select(39, 'Intensity Knob Remap', 'Assignments', choices(['Factory default', 'Output Volume', 'Diffusion', 'Distortion', 'Low Cut Filter', 'High Cut Filter', 'Sample Rate Reduction', 'Sweep Filter Frequency', 'Sweep Filter Q', 'Sweep Filter Depth', 'Sweep Filter Mix', 'Wow and Flutter Noise', 'Tremolo Depth', 'Pitch Control', 'Delay Effect Send Level'])),
    select(40, 'Mod Knob Remap', 'Assignments', choices(['Time Modulation', 'Tape Modulation', 'Filter Modulation', 'Tremolo Depth'])),
    select(41, 'Rate Knob Remap', 'Assignments', choices(['Modulation Rate', 'Tape Speed'])),
    select(42, 'Tempo Division', 'Synchronization', choices(['4 · whole note', '3 · dotted half', '2 · half note', '1.618 · golden ratio', '3/2 · dotted quarter', '4/3 · swing', '1 · quarter note', '3/4 · dotted eighth', '2/3 · swing', '0.618 · inverse golden ratio', '1/2 · eighth note', '1/3 · triplet', '1/4 · sixteenth note', '1/6 · sextuplet', '1/8 · thirty-second note']), 6, 'Scales delay relative to Tap Tempo or MIDI Clock.', true),
    range(50, 'Octave Shift', 'Pitch', 125, 63, 'The table declares 0–125 but mentions +octave at 127. Preserves the declared range; unison is 63.'),
    action(80, 'Previous Preset', 'Presets', 127, 'Steps through the 4 or 8 hardware-accessible presets; ADT has the 8-preset extension enabled by default.'),
    action(82, 'Next Preset', 'Presets'), action(93, 'Remote Tap', 'Performance', 127, 'Each message is a tempo tap.', true),
    toggle(97, 'Infinite Hold', 'Performance', 127, 0, '64–127 holds audio; 0–63 releases, like holding physical TAP.', true),
    toggle(101, 'Effect On/Off', 'Performance', 127, 0, '0–63 bypasses; 64–127 engages.', true),
    { ...action(102, 'Toggle Bypass', 'Performance', 127, 'Any value toggles bypass once. Inverts local CC101 state; does not confirm previously unknown state.'), apply: toggleBypass },
    range(103, 'Recall Preset · bypassed', 'Presets', 127, 0), range(104, 'Recall Preset · engaged', 'Presets', 127, 0),
  ],
  limitations: [
    'The current ADT manual describes 26 engines, but the official MIDI PDF still lists 24 original Nemesis engines. Indices 5, 9, 10, 12 and 23 conflict; 24 and 25 are absent from CC1. Chapter numbers are not assumed to be the new CC map.',
    'Resonant Analog, Oil Can, Drum Echo, Degrade, Sweeper and Rhythmic exist in ADT, but remote selection at these indices requires updated manufacturer confirmation. Hardware/Neuro selection remains available.',
    'CC4 is reserved and never sent. CC35 gives no names for 7–15; CC50 has contradictory PDF limits. Unconfirmed values are not sent.',
    'CC38 is a bypass alias of CC101, omitted to avoid divergent local states. CC102 toggles the same bypass: its hook inverts CC101 locally without confirming hardware or clearing unknown-state markers.',
    'MIDI Clock is received, but Start/Stop/Continue are not documented. No save CC, readback or SysEx command is implemented here.',
  ],
};

const reverbModes = [
  ['Concert Hall', 'Modern Hall'], ['Classic Plate', 'Studio Plate'],
  ['Bright Spring', 'Dark Spring', 'Overdriven Spring', 'Drip Spring', 'Spring + Trem'],
  ['L.A. Studio'], ['Sparkle', 'Glummer'],
  ['Modulated', 'Chorused Reverb', 'Flanged Reverb', 'Tremolo Reverb'],
  ['Triggered Swell', 'Gate Swell with Octave', 'Freezification', 'Seed'],
  ['Single Tap Delay', 'Blend-able Delay', 'Filtered Feedback Delay', 'Skitter'],
  ['Reverse with Decay', 'Reverse and Stop', 'Reversed Delay'], ['Resonant', 'Casper'],
  ['50’s Radio', 'Warble'], ['Glitch', 'Gated Reverb', 'Destroyer Pad'],
];
const empress = {
  id: 'empress-reverb', name: 'Reverb', brand: 'Empress', category: 'pedals', visualization: 'reverb',
  subtitle: 'Delicate spaces, unusual tails and deep landscapes.',
  manualUrl: 'https://empresseffects.com/cdn/shop/files/RVRB_user_manual_v6.41_rev01_web.pdf?v=11708901370976542366',
  mainManualUrl: 'https://empresseffects.com/cdn/shop/files/RVRB_user_manual_v6.41_rev01_web.pdf?v=11708901370976542366',
  defaultChannel: 1,
  connection: 'Set Control Port to MIDI and select the channel in Advanced Configuration before sending messages. The 6.35 mm jack receives MIDI on tip and transmits on ring. Use a compatible MIDI/TRS adapter or Empress MIDIBox2; do not connect DIN directly through an audio cable. MIDI control is unavailable during Advanced Configuration.',
  appearance: appearance('#ecebea', '#343433', '#429ed3'),
  presets: { count: 35, offset: 1 },
  controls: [
    range(10, 'Expression', 'Expression', 127, 0, 'Zero is heel, 127 toe; configure destinations with Save and hardware knobs.'),
    range(11, 'Recall Preset', 'Presets', 35, 1, 'Value is the preset number. Address 0 is manual in scrolling mode; manual is unavailable in bank mode.'),
    select(20, 'Mode + Submode', 'Reverb', reverbModes.flatMap((names, mode) => names.map((label, submode) => ({ value: mode * 8 + submode, label }))), 0,
      'Value packs mode × 8 + submode, both zero-based. Thing 1 and Thing 2 change function with the algorithm.', true),
    ...['Decay Time', 'Mix', 'Volume', 'Low Damp', 'Hi Damp', 'Thing 1', 'Thing 2'].map((name, index) =>
      range(21 + index, name, 'Knobs', 127, 64, index >= 5 ? 'Mode-dependent function: may control pre-delay, modulation, feedback, octaves, swell or texture.' : 'Zero is the minimum knob position; 127 is maximum.', true)),
    ...[[35, 'Select'], [36, 'Scroll'], [37, 'Bypass'], [38, 'Save']].map(([cc, name]) => ({
      ...select(cc, `${name} · physical switch`, 'Footswitches', [
        { value: 0, label: 'Release' }, { value: 64, label: 'Tap' }, { value: 127, label: 'Hold' },
      ], 0, '64 simulates a tap; 127 holds until zero is received. Save and switch combinations can write presets.', true),
      ...(cc === 38 ? { confirmation: 'Save can write changes when combined with other switches. Continue?' } : {}),
    })),
    { ...select(39, 'Save to Preset', 'Presets', Array.from({ length: 36 }, (_, value) => ({ value, label: `Address ${value}` })), 1,
      'Actual save command, not recall: 0–35 selects the destination. Bank and scrolling systems display addresses differently.'),
      confirmation: 'Save current settings to this Empress address? Existing contents will be overwritten.' },
    { ...toggle(51, 'MIDI Clock On/Off', 'Synchronization', 127, 0, 'Enabled by default on hardware. Tap-enabled engines receive quarter notes, 24 clocks per beat.'), initial: 127 },
    toggle(60, 'Effect On/Off', 'Performance', 127, 0, 'Zero bypasses; 127 engages.'),
  ],
  limitations: [
    '35 stored presets, recalled by PC1–35. CC39 also declares address 0, but manual mode is not counted as extra writable memory.',
    'Revision 6.41 mode map: only existing submodes are offered. The looper uses physical switches; no looper transport CCs are invented.',
    'Save is documented and confirmation-protected; readback is not implemented. MIDI Start/Stop/Continue are not documented.',
  ],
};

for (const [pedal, numbers] of [
  [mobius, [80, 82]],
  [eq2, [80, 82, 94, 103, 104]],
  [nemesis, [1, 80, 82, 103, 104]],
  [empress, [11, 35]],
]) {
  for (const control of pedal.controls) {
    if (numbers.includes(control.number)) control.invalidatesState = true;
  }
}

export const additionalPedals = [sl2, deco, mobius, eq2, nemesis, empress];

const endpointMap = {
  'boss-sl-2': { 16: ['Quiet effect', 'Loud effect'], 80: ['Minimum command', 'Maximum command'] },
  'strymon-deco-v2': {
    12: ['Clean', 'Saturated'], 13: ['Quiet', 'Loud'], 14: ['Dark', 'Bright'], 15: ['Full lows', 'Trimmed lows'],
    18: ['Flanging', 'Echo'], 19: ['Stable', 'Strong wobble'], 20: ['Reference Deck', 'Lag Deck'],
    21: ['Cut', 'Boost'], 22: ['Short', 'Long'], 100: ['Heel', 'Toe'],
  },
  'strymon-mobius': {
    9: ['Assigned minimum', 'Assigned maximum'], 15: ['Quiet', 'Loud'], 16: ['Assigned minimum', 'Assigned maximum'],
    17: ['Slow', 'Fast'], 18: ['Shallow', 'Deep'], 25: ['Low regeneration', 'High regeneration'],
    26: ['Low manual sweep', 'High manual sweep'], 29: ['Dry', 'Wet'], 30: ['Dark', 'Bright'],
    34: ['Quiet horn', 'Loud horn'], 35: ['Clean', 'Driven'], 36: ['Slow', 'Fast'], 37: ['Slow transition', 'Fast transition'],
    40: ['Low shape', 'High shape'], 41: ['Less bass', 'More bass'], 42: ['Low headroom', 'High headroom'],
    45: ['Low regeneration', 'High regeneration'], 46: ['First waveshape', 'Last documented waveshape'],
    47: ['Narrow', 'Wide'], 50: ['Low resonance', 'High resonance'], 51: ['No dry signal', 'Full dry signal'],
    52: ['Low frequency', 'High frequency'], 54: ['Low shift', 'High shift'], 55: ['Dry', 'Wet'],
    56: ['First LFO shape', 'Last LFO shape'], 57: ['Fast rise', 'Slow rise'], 63: ['Clean', 'Worn vinyl'],
    64: ['Dry', 'Wet'], 68: ['Low headroom', 'High headroom'], 69: ['Narrow', 'Wide'],
    100: ['Heel', 'Toe'], 115: ['Narrow', 'Wide'],
  },
  'source-audio-eq2': {
    0: ['Muted', '+12 dB'], 1: ['Muted', '+6 dB'], 2: ['Muted', '+6 dB'],
    69: ['−18 dB', '+18 dB'], 70: ['−18 dB', '+18 dB'], 71: ['10 Hz', '80 Hz'], 72: ['10 Hz', '80 Hz'],
    100: ['Heel', 'Toe'], 103: ['Preset 1', 'Preset 128'], 104: ['Preset 1', 'Preset 128'],
  },
  'source-audio-nemesis-adt': {
    2: ['Short delay', 'Engine maximum'], 3: ['About 10 ms', 'About 2.6 s'], 5: ['No repeats', 'Feedback maximum'],
    6: ['Dry', 'Wet'], 7: ['No modulation', 'Deep modulation'], 8: ['Slow / low tape speed', 'Fast / high tape speed'],
    9: ['Assigned minimum', 'Assigned maximum'], 10: ['Muted', '+8 dB'], 11: ['Distinct attacks', 'Diffuse attacks'],
    12: ['Clean', 'Distorted'], 13: ['Full lows', 'Reduced lows'], 14: ['Dark', 'Bright'],
    15: ['Full sample rate', 'Reduced sample rate'], 16: ['Low frequency', 'High frequency'],
    17: ['Broad', 'Resonant'], 18: ['Shallow', 'Deep'], 19: ['No sweep filter', 'Full sweep filter'],
    20: ['Stable', 'Strong wow/flutter'], 21: ['Slow', 'Fast'], 22: ['Clean', 'Noisy / distorted'],
    23: ['No tremolo', 'Rectified tremolo'], 25: ['Muted', '+6 dB'], 26: ['Left', 'Right'],
    27: ['Muted', '+6 dB'], 28: ['Left', 'Right'], 29: ['Short', 'Same as Tap 1'], 30: ['Dark', 'Bright'],
    50: ['Lower octave', 'Upper documented limit'], 51: ['No delay input', 'Full delay input'],
    103: ['Preset 1', 'Preset 128'], 104: ['Preset 1', 'Preset 128'],
  },
  'empress-reverb': {
    10: ['Heel', 'Toe'], 11: ['Manual / address 0', 'Preset 35'], 21: ['Short decay', 'Long decay'],
    22: ['Dry', 'Wet'], 23: ['Quiet', 'Loud'], 24: ['Full lows', 'Damped lows'], 25: ['Full highs', 'Damped highs'],
    26: ['Mode minimum', 'Mode maximum'], 27: ['Mode minimum', 'Mode maximum'],
  },
};
const panelOrders = {
  'boss-sl-2': ['Pedal', 'Performance', 'Expression'],
  'strymon-deco-v2': ['Tape Saturation', 'Doubletracker', 'Performance', 'Synchronization', 'Expression', 'Presets'],
  'strymon-mobius': ['Knobs', 'Footswitches', 'Chorus', 'Flanger', 'Rotary', 'Vibe', 'Phaser', 'Filter', 'Formant', 'Vintage Trem', 'Pattern Trem', 'Autoswell', 'Destroyer', 'Quadrature', 'Performance', 'Synchronization', 'Routing', 'Expression', 'Presets'],
  'source-audio-eq2': ['Channel 1', 'Channel 2', 'Levels', 'Input', 'Routing', 'Performance', 'Expression', 'Presets'],
  'source-audio-nemesis-adt': ['Knobs', 'Time', 'Engines', 'Performance', 'Levels', 'Taps', 'Texture', 'Filters', 'Tape', 'Modulation', 'Pitch', 'Routing', 'Assignments', 'Synchronization', 'Presets'],
  'empress-reverb': ['Reverb', 'Knobs', 'Footswitches', 'Performance', 'Synchronization', 'Expression', 'Presets'],
};
for (const pedal of additionalPedals) {
  pedal.panelOrder = panelOrders[pedal.id];
  for (const control of pedal.controls) {
    if (control.kind === 'range') {
      control.endpoints = endpointMap[pedal.id][control.number] || ['Low', 'High'];
      if (pedal === eq2 && control.number >= 3 && control.number <= 22) {
        control.endpoints = ['−18 dB', '+18 dB'];
        control.visual = 'fader';
      } else if (pedal === eq2 && control.number >= 23 && control.number <= 42) control.endpoints = ['20 Hz', '20 kHz'];
      else if (pedal === eq2 && control.number >= 43 && control.number <= 62) control.endpoints = ['Q 0.5', 'Q 10.0'];
      control.optionsHint = `${control.endpoints.join(' → ')}. ${control.hint}`;
    } else {
      delete control.endpoints;
      delete control.optionsHint;
    }
    if (control.physical && (control.kind === 'action' || control.kind === 'toggle' || control.section === 'Footswitches')) control.visual = 'footswitch';
    else if (control.physical && control.kind === 'select') control.visual = pedal === mobius || pedal === nemesis || pedal === empress ? 'encoder' : 'toggle';
    if (pedal === empress && control.number === 38) control.visual = 'toggle';
  }
}
for (const [pedal, order] of [[deco, [12, 13, 14, 11, 10, 18, 20, 19, 17, 16]], [mobius, [19, 17, 18, 15, 9, 16]]]) {
  pedal.controls.sort((a, b) => {
    const rank = (control) => order.includes(control.number) ? order.indexOf(control.number) : order.length;
    return rank(a) - rank(b);
  });
}
