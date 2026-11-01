const moodModes = {
  '21:0': 'A dense cluster of echoes can stay distinct or dissolve into a diffuse tail. TIME changes size and decay together; MODIFY moves from multi-tap to reverb. Ramp MODIFY to travel between the two textures.',
  '21:2': 'A clean delay that can also act as a looper. TIME changes the interval without bending the pitch of existing echoes; MODIFY controls feedback. At maximum, repeats sustain and accumulate. Route the micro-loop into Wet to copy it into the delay.',
  '21:3': 'Continuously samples your playing and plays windows at different speeds and directions. Short TIME approaches pitch shifting; longer TIME creates delayed harmonized phrases. MODIFY steps through semitone intervals.',
  '23:0': 'Slices the loop and repeats the current slice while detecting input sound. LENGTH chooses slice size; MODIFY sets sensitivity. Quiet playing with high sensitivity creates dynamically controlled pauses and stretches.',
  '23:2': 'Plays the micro-loop like tape. LENGTH shortens the loop; MODIFY selects octave-stepped forward and reverse speeds. Move CLOCK during overdubs to build layers that play at different speeds.',
  '23:3': 'Spreads the micro-loop through time, from recognizable phrases to sustained textures. LENGTH sets fragment size; MODIFY controls transformation and direction. Move slowly to discover continuous transitions.',
};
const badModes = {
  '21:0': 'Spectral reverb analyzes and resynthesizes the instrument into a synthetic ambience. TIME sets decay; MODIFY emphasizes the artificial character. Lower CLOCK darkens the texture; higher settings introduce bright artifacts. Freeze turns the tail into a pad.',
  '21:2': 'Instead of fading echoes, repeats stay at the same level. TIME sets the interval and MODIFY the repeat count; at maximum, they accumulate like a looper. Freeze preserves the phrase so you can play over it.',
  '21:3': 'Layers of ascending and descending fourths, fifths and octaves. TIME separates notes; MODIFY chooses the harmony and denser combinations. A little TIME adds a vintage harmonizer lag; Freeze keeps the chord repeating.',
  '23:0': 'Turns distinct micro-loop sounds into a sequence of up to eight steps. LENGTH changes step size and speed; MODIFY sets the input threshold that reshuffles the pattern. Capture short notes or record in another mode for more predictable patterns.',
  '23:2': 'Five stations reinterpret the same recording. MODIFY scans and blends stations with interference; LENGTH changes a station-specific parameter. Use the station selector to hear each interpretation separately.',
  '23:3': 'The louder parts of the loop receive a transformation that follows their level. LENGTH chooses the mask character; MODIFY sets the threshold. Increasing MODIFY disguises more of the loop.',
};
const stationHelp = [
  [0, 'Tape: LENGTH changes speed and direction of full-loop playback.'],
  [32, 'Ambient: LENGTH slows playback without changing pitch, creating long textures.'],
  [63, 'Orchestral: LENGTH chooses how many voices enter and leave the arrangement.'],
  [97, 'Shoegaze: LENGTH scans layers of frozen moments from the loop.'],
  [127, 'Dance: LENGTH changes the rotation rate between normal, half-speed and double-speed playback.'],
];
const lostEffects = {
  'Slow-verb': 'A gradually swelling reverb for shoegaze layers. TIME controls swell and size, MODIFY decay, and ALT diffusion. Hold freezes the tail into a pad. Low ALT approaches blurred echoes.',
  'Useful Ambience': 'Reverb that enlarges and softens the other effect. TIME controls size, MODIFY decay, and ALT diffusion. Hold sustains the tail indefinitely. Place it last to unite granular, synth or modulation textures.',
  'Orchestral Swell': 'A harmonized swell accompanying the instrument. TIME sets onset, MODIFY pitch, and ALT feedback. Slow attacks separate the accompaniment from the notes you play.',
  'Pitch Repeater': 'Sequences of harmonized echoes. TIME separates notes, MODIFY chooses intervals, and ALT controls repeat count. Start with minimum ALT to hear individual intervals.',
  'Pinging Phaser': 'A phaser with up to 64 poles, from gentle sweeps to resonant notes. TIME sets rate, MODIFY poles, and ALT resonance. Hold pauses the movement; move MODIFY to explore percussive filter sounds.',
  'Spectral Modulator': 'A synthesized copy of the signal passes through spectral modulation. TIME sets rate, MODIFY depth, and ALT band resonance and clipping. Hold pauses motion to explore digital distortion.',
  'Tape Echo': 'Tape delay with up to four seconds and adjustable aging. TIME sets the interval, MODIFY repeats, and ALT instability. Hold captures an infinite repeat. Darker EQ warms the echoes; brighter EQ thins them.',
  'Grain Tumbler': 'Samples and rearranges audio into grains. TIME chooses grain size and frequency, MODIFY feedback, and ALT percussive or soft attacks. Hold preserves the current pattern. Change TIME after capture to alter its rhythm.',
  'Impulse Synthesizer': 'Polyphonic sub-octave synthesis for chords and slow accompaniment. TIME sets portamento, MODIFY texture, and ALT filter opening and closing. Hold sustains a pad. Try routing it into Useful Ambience.',
  'Sympathetic Resonator': 'A polyphonic resonator following instrument pitch. TIME sets tracking speed, MODIFY feedback and sustain, and ALT octave. Hold fixes the current pitch so resonance no longer follows new notes.',
  'Ensemble Expander': 'Multi-voice chorus with wide movement. TIME controls rate, MODIFY depth, and ALT voice count. Hold replaces cyclic motion with smooth random variation. Fewer voices approach classic chorus.',
  'Gen Lite': 'Compact degraded tape with modulation, noise and small faults. TIME sets rate, MODIFY depth and noise, and ALT crinkles and snags. Hold stops the tape at the speed set by TIME. GLUE adds compression.',
};
const genHelp = {
  14: 'WOW is slow, irregular tape movement. Start low for subtle instability; increase it for struggling machinery. DRY at Unity blends clean signal for chorus.',
  15: 'Processed signal volume. Center is unity gain; maximum is twice the level. Ramp speed has an independent control in the interface.',
  16: 'Selects EQ profiles of real cassette, VHS and camera recorders. Use the model library to jump to a profile and compare models with the same phrase.',
  17: 'FLUTTER is fast tape flutter in pitch and volume. Add just enough for a subtle vintage texture. Combine it with WOW for more convincing tape movement.',
  18: 'SATURATE recreates magnetic tape saturation. It interacts with MODEL and Input gain: adjust all three to move from gentle compression to distortion.',
  19: 'FAILURE introduces drops, snags, crinkles and pops. DROP BYP, SNAG BYP and HUM BYP isolate fault types; ALT sets noise levels.',
  21: 'STOP brakes the tape, FILTER removes the model EQ, and FAIL maximizes faults. Engage AUX to apply the function; AUX onset sets transition speed.',
  22: 'Clean signal amount: None leaves only tape; Small preserves some attack; Unity blends clean signal at input level. Unity with WOW produces chorus.',
  23: 'Tape machine hiss and mechanical noise amount. Adjust each source independently in ALT.',
  24: 'AUX transition time, from immediate to very slow. Useful for gradual tape stops.',
  26: 'True bypass leaves an unprocessed analog path; DSP bypass keeps the digital path available.',
  27: 'Hiss level introduced by the NOISE selector.',
  28: 'Mechanical noise: center is silent; one side adds VCR noise, the other hum.',
  29: 'Crinkle and pop level introduced by FAILURE.',
  32: 'Adapts saturation to the input: Line, Instrument or High gain. High gain makes distortion easier and may introduce aliasing with strong signals.',
};
const classicHelp = {
  16: 'Resonant low-pass filter. Turn down to remove high frequencies.',
  18: 'GEN changes the sample rate. Turn down to degrade the sound and introduce digital aliasing.',
  19: 'Resonant high-pass filter. Turn up to remove low frequencies.',
};
const shared = {
  'Ramp speed': 'Speed of automatic movement for parameters assigned in the ramping bank.',
  BOUNCE: 'Returns the movement to its starting point and repeats the journey.',
  SWEEP: 'Chooses the sweep region: Bottom or Top.',
  POLARITY: 'Chooses whether movement starts Forward or Reverse.',
  'Expression over MIDI': 'Moves expression-assigned parameters. Use the assignment switches in the left bank.',
  'MIDI clock': 'Follows an external DAW or controller tempo, or keeps timing independent.',
  MISO: 'Adapts a mono input to stereo processing and output.',
  SPREAD: 'Widens the stereo image; choose its destination in Hidden / ALT.',
  TRAILS: 'Allows effect tails to fade naturally after bypassing the channel.',
  'DRY KILL': 'Removes the clean signal, useful for parallel chains or auxiliary sends.',
  'Dry kill': 'Removes the clean signal, useful for parallel chains or auxiliary sends.',
  LATCH: 'Keeps Hold active after releasing the footswitch; press again to exit.',
  'L SWAP': 'Replaces left-channel families with right-channel families to combine any two effects.',
  'R SWAP': 'Replaces right-channel families with left-channel families to combine any two effects.',
  BANK: 'Switches the two physical presets between slots 1/2 and 3/4.',
  UNSYNC: 'Releases TIME from synchronization for continuous tuning and off-grid effects.',
  Attack: 'Time for sound to rise after a note starts.',
  Decay: 'Time for the envelope to reach the Sustain level.',
  Sustain: 'Level maintained while a note is held.',
  Release: 'Fade time after releasing a note.',
  Portamento: 'Glide time between consecutive pitches.',
};
export function modeDetail(pedal, state, cc, value = state[cc]) {
  if (pedal.effects) {
    const family = pedal.effects({ ...state, [cc]: value }, cc);
    const modify = state[cc === 21 ? 17 : 19];
    return modify === 64 ? `${lostEffects[family[1]]} ${lostEffects[family[2]]}` : lostEffects[family[modify < 64 ? 1 : 2]];
  }
  if (pedal.id === 'mood-mkii') return moodModes[`${cc}:${value}`];
  if (pedal.id === 'bad-mood') return badModes[`${cc}:${value}`];
  if (pedal.id === 'generation-loss-mkii' && value === 3 && state[72] && state[76] && state[77]) {
    return 'FREEZE captures and sustains the previous sound for processing with WOW, FLUTTER and Classic filters. Engage AUX to freeze and again to release. Use Classic, AUX at FAIL, and DROP BYP/SNAG BYP enabled.';
  }
  return pedal.modes.find((mode) => mode.cc === cc && mode.value === value)?.description;
}
export function controlHelp(pedal, control, state) {
  const cc = control.cc;
  if (pedal.id === 'generation-loss-mkii' && (classicHelp[cc] || genHelp[cc])) {
    return state[72] && classicHelp[cc] ? classicHelp[cc] : genHelp[cc];
  }
  if (control.group === 'pedal' && [14, 16, 17, 19].includes(cc)) {
    if (pedal.id === 'bad-mood' && cc === 16 && state[23] === 2) {
      return stationHelp.find(([value]) => value === state[19])?.[1] || 'LENGTH changes the RADIO station parameter. Select a station to explore its function; MODIFY scans and blends the five interpretations.';
    }
    return modeDetail(pedal, state, cc === 14 || cc === 17 ? 21 : 23);
  }
  if (control.group === 'pedal' && [21, 23].includes(cc)) return modeDetail(pedal, state, cc);
  if (control.group === 'pedal' && cc === 18) {
    return pedal.id === 'lost-found' ? 'Balances left and right channels. Center gives both; the endpoints favor one. In series, SPILL also applies the second effect to the clean signal.'
      : 'CLOCK changes pitch, speed and character of both channels together. Move it during overdubs to build harmonies at different speeds.';
  }
  if (cc === 15 && control.group === 'pedal') return 'Balances clean and processed signals. Increase for deeper textures; reduce to preserve instrument attack.';
  if (cc === 22 && control.group === 'pedal') return pedal.id === 'lost-found'
    ? 'L → R processes effects in series; L + R in parallel; R → L reverses the order. Try changing the order of synth, reverb and delay.'
    : 'Chooses the Wet input: instrument, micro-loop plus instrument, or micro-loop only. Loop only keeps the instrument clean while transforming the recording.';
  if (control.group === 'dip-left' && cc >= 61 && cc <= 65) return `Includes ${control.name} in automatic movement or expression. Set the starting point with the knob and the rate with Ramp speed.`;
  if (shared[control.name]) return shared[control.name];
  if (control.group === 'hidden' && cc === 32) return 'Chooses which channel receives stereo spread: one or both. A mono loop can feed a stereo ambience.';
  if (control.group === 'hidden' && cc === 31) return 'Synchronizes micro-loop duration to Wet, keeps channels independent, or relates Wet timing to the micro-loop. Try changing it while the loop plays.';
  if (pedal.id === 'mood-mkii' && control.group === 'hidden') {
    const hints = {
      24: 'Wet stereo width. Fit the ambience into the stereo field.',
      25: 'Ramping waveform: triangle, square, sine, sample & hold or smooth random. Sets the character of assigned parameter movement.',
      26: 'Fades older layers during overdubs. Low values create evolving loops; at maximum, old layers remain.',
      27: 'Wet high-frequency filter. Darken the ambience to move it back in the mix.',
      28: 'Volume balance between Wet and Micro-loop.',
      29: 'Direct micro-loop mix, keeping the recording present as it passes through Wet effects.',
      33: 'Half approaches the original generation buffer length; Full uses the complete MKII buffer.',
    };
    if (hints[cc]) return hints[cc];
  }
  if (pedal.id === 'lost-found') {
    if (cc === 24 || cc === 26) return modeDetail(pedal, state, cc === 24 ? 21 : 23);
    if (cc === 25) return 'In series, also applies the second effect to the clean signal. Combine SPILL with BLEND to balance direct and cascaded signals.';
    if (cc === 27 || cc === 29) return 'Bipolar channel EQ: turn down to remove highs, up to remove lows. Center leaves the spectrum unchanged.';
    if (cc === 28) return 'Compression and saturation at the end of the chain. Start low to unite the effects; increase for density and character.';
    if (cc === 105 || cc === 106) return modeDetail(pedal, state, cc === 105 ? 21 : 23);
  }
  if (pedal.id === 'bad-mood') {
    if (cc === 24) return 'Dynamic amplitude and frequency modulation. CROSS input selects the instrument or cross-channel source. Start low and increase while playing.';
    if (cc === 25) return 'Relative Wet and Micro-loop volume; center balances both channels.';
    if (cc === 28) return 'Saturation and destruction at the end of the chain. Increase for stronger character across the texture.';
    if (cc === 33) return 'Chooses the CROSS source: Wet modulates Loop, instrument modulates both, or Loop modulates Wet.';
    if (cc === 26) return 'Controls the fading of old overdub layers: evolving loops or sounds that remain.';
    if (cc === 27) return 'Bipolar EQ: remove highs to darken or remove lows to thin the sound. EQ destination selects one channel or both.';
    if (cc === 29) return 'Direct micro-loop mix: keeps part of the recording present as it passes through Wet.';
  }
  if (cc === pedal.hiddenCc) return 'Enables the alternate menu on the physical pedal. To edit these parameters in the interface, simply select Hidden / ALT.';
  if (cc === 105) return 'Freezes the Wet channel in an infinite repeat. Disable it again to release the tail.';
  if (cc === 106) return 'Adds the clean instrument to the current micro-loop. Move CLOCK during recording to create layers at different speeds.';
  if (control.kind === 'save') return 'Saves the current pedal configuration to the selected slot, replacing its existing sound.';
  if (cc === 0) return 'Bends pitch up to four semitones in either direction. Center keeps the original tuning.';
  if (cc === 1) return 'Synth mode performance modulation.';
  if (cc === 57 && control.group === 'synth') return 'Transposes the captured sound by octaves to set the keyboard register.';
  if (cc === 58) return 'Open keeps continuous output; Note On/Off gates with the note; ADSR applies Attack, Decay, Sustain and Release.';
  if (cc === 52) return 'Pauses or resumes ramping without changing the starting points.';
  if (control.confirmation) return control.confirmation;
  return control.hint?.replace(/CC\d+/g, '').replace(/\s+/g, ' ').trim() || '';
}
export function controlName(pedal, control, state) {
  if (pedal.id === 'generation-loss-mkii' && state[72]) {
    const classic = { 16: 'LOW PASS', 18: 'GENERATION', 19: 'HIGH PASS' };
    if (classic[control.cc]) return classic[control.cc];
  }
  if (control.cc === pedal.hiddenCc) return 'Alternate hardware menu';
  return control.name.replace(/\s*·?\s*CC\d+(?: legacy)?/g, '');
}
export function controlChoices(pedal, control, state) {
  if (pedal.effects && [21, 23].includes(control.cc)) {
    return control.choices.map((choice) => ({ ...choice, label: pedal.effects({ ...state, [control.cc]: choice.value }, control.cc)[0] }));
  }
  if (pedal.id === 'generation-loss-mkii' && control.cc === 21 && state[72] && state[76] && state[77]) {
    return control.choices.map((choice) => choice.value === 3 ? { ...choice, label: 'FREEZE' } : choice);
  }
  return control.choices;
}
