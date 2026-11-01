# MOOD MKII · MIDI Studio

Independent, Portuguese-language Web MIDI controller for the **Chase Bliss MOOD MKII** (not the original MOOD).

**Website:** https://JoaoBAfonso.github.io/mood-mkii-controller/

## Features

- Original CSS illustration matching the physical control layout: TIME / MIX / LENGTH, both MODIFY knobs, CLOCK, three toggles, preset toggle and footswitches.
- All **61 documented CC numbers**, including hidden parameters, DIP switches, ramping, global settings, legacy tap tempo, preset saving and Synth controls.
- Knob dragging, native sliders, precise numeric input and keyboard-accessible controls.
- Separate normal/Hidden pedal banks, retaining each parameter's value when switching modes.
- Demo mode that sends nothing to hardware, explicit MIDI errors, hot-plug support and an outgoing MIDI monitor.
- Preset recall via PC0 (Live) and PC1–122; save via CC111 with overwrite confirmation.
- Note On/Off keyboard, velocity, ADSR, portamento and documented CC0 pitch bend.
- Factory reset and MIDI reset protected by explicit confirmation.
- No runtime dependencies, accounts, tracking, remote fonts or audio processing.

## Connection

Open the HTTPS site in a Web MIDI-compatible browser, preferably desktop Chrome or Edge. Connect a USB–MIDI interface to the computer, then connect its output to the pedal's **1/4-inch TRS MIDI input using Chase Bliss-compatible conversion**, such as MIDIBox. The pedal is not a USB MIDI device, and not every generic TRS adapter is compatible.

Click **Ligar MIDI**, grant permission, select the interface output and choose the pedal channel (default **2**). Turn demo mode off to send real messages. Connecting never automatically sends the displayed settings. A connected interface is not proof that the pedal is receiving messages.

To change the pedal's channel, hold both footswitches while powering it on and send a Program Change on the intended channel.

## MIDI source and limitations

Mapping source: [official MOOD MKII MIDI manual](https://www.chasebliss.com/s/MOOD-MKII_MIDI-Manual_Pedal_Chase-Bliss.pdf), linked from the [manufacturer's manual archive](https://www.chasebliss.com/manuals).

The manual does **not document SysEx or a state readback protocol**. This application does not request SysEx access, invent commands, read physical knob positions or claim bidirectional synchronization. Changes made on the physical pedal do not reach the site. Values are UI starting points/last successful sends, not hardware telemetry; a successful send does not mean the pedal acknowledged it. After recalling a preset or resetting, values from before the command are marked `~` in both the pedal and the command panels. Sending an individual CC removes that parameter's stale marker.

### Hidden bank and state isolation

Clicking **Hidden menu (CC104)** on the site switches the virtual pedal's controls to their dedicated Hidden CCs. Entering/leaving the bank sends **only CC104**; leaving restores the normal UI values without replaying or overwriting them. Re-entering restores the Hidden values. The mapping follows the [main manual's Hidden Options diagram](https://www.chasebliss.com/s/MOOD-MKII_Manual_Pedal_Chase-Bliss.pdf):

| Position | Normal | Hidden |
|---|---|---|
| Top left | TIME · CC14 | Stereo width · CC24 |
| Top centre | MIX · CC15 | Ramping waveform · CC25 |
| Top right | LENGTH · CC16 | Fade · CC26 |
| Bottom left | MODIFY Wet · CC17 | Tone · CC27 |
| Bottom centre | CLOCK · CC18 | Level balance · CC28 |
| Bottom right | MODIFY Loop · CC19 | Direct micro-loop · CC29 |
| Left toggle | WET · CC21 | Sync · CC31 |
| Centre toggle | ROUTING · CC22 | Spread destination · CC32 |
| Right toggle | LOOP mode · CC23 | Buffer length · CC33 |

The dedicated Hidden panel remains usable without activating Hidden, and mirrors the virtual pedal in both directions. CC25's physical knob sends the entire 0–127 range; the panel selects the corresponding waveform interval.

Demo and each hardware output/channel retain independent UI state for the current page session. Switching destination sends no settings and restores only that destination's previous UI values, not hardware telemetry. Reloading resets these UI starting points. Failed CC sends do not change the stored values or bank; failed PC sends restore the preset selector. Slots beyond 2 are displayed explicitly rather than as an empty selection.

The main knobs can be mode-dependent. Exact TIME/LENGTH synced ranges are in their tooltips; CLOCK and Tape/Stretch speed show stepped labels. The manual overlaps CLOCK value 16 between 3k/4k; the display assigns 16 to 4k, but sends the exact requested byte. Some documented synced ranges end at 128; MIDI data is always restricted to 0–127.

CC31: 0/1 = Loop → Wet, 2 = no sync, >2 = Wet → Loop. CC106 is **overdub**, not loop freeze. CC0 is the manual's 7-bit pitch bend control, not a standard 14-bit Pitch Bend message.

MIDI clock following/divisions can be configured; a DAW/controller must supply the clock externally. No browser clock generator or MIDI-input forwarding is included. Synth mode requires an existing sound in the pedal; the browser does not generate audio. Active notes are released on key release/cancel, tab changes, window blur and MIDI output/channel changes, using the original output and channel. Clock changes, Synth exit, preset recall and resets first release active notes. Failed Note Off sends remain pending for retry through **Parar notas ativas**; preset/reset/Clock commands are blocked until those releases succeed. Successful Note Off sends appear in the monitor.

Preset slots 1/2 match the right/left physical toggle. Saving overwrites hardware presets; no local preset file is implied. Destructive commands require confirmation. Save confirmation identifies and captures the exact slot, and confirmation is rejected if the destination changes.

## Development

Node.js 22 or later:

```sh
npm test
npm start
```

Open http://127.0.0.1:4173. The site itself needs no installation or build step. On Windows PowerShell with restricted script execution, use `npm.cmd test` and `npm.cmd start`.

Browser regression tests (development-only Playwright dependency):

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

The tests use a mocked MIDI output; they do not send anything to physical hardware. They cover Hidden bank restoration and correct bytes, state isolation, failed sends, presets/confirmation, retryable note releases, control coverage, input validation and mobile layouts in both banks.

GitHub Pages deployment runs the MIDI and browser tests and publishes only the six static site files from the `main` branch through [the workflow](.github/workflows/pages.yml). Enable Pages with **GitHub Actions** as the source. Versioned asset URLs prevent a freshly loaded release from mixing new scripts with cached old modules; bump the asset query versions together when publishing incompatible changes.

The illustration is original CSS, not a copied product photograph or brand artwork. Product names identify compatible hardware; this project is not affiliated with or endorsed by Chase Bliss.
