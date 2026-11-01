# MOOD MKII · MIDI Studio

Independent, Portuguese-language Web MIDI controller for the **Chase Bliss MOOD MKII** (not the original MOOD).

**Website:** https://JoaoBAfonso.github.io/mood-mkii-controller/

## Features

- Original CSS illustration matching the physical control layout: TIME / MIX / LENGTH, both MODIFY knobs, CLOCK, three toggles, preset toggle and footswitches.
- All **61 documented CC numbers**, including hidden parameters, DIP switches, ramping, global settings, legacy tap tempo, preset saving and Synth controls.
- Knob dragging, native sliders, precise numeric input and keyboard-accessible controls.
- Demo mode that sends nothing to hardware, explicit MIDI errors, hot-plug support and an outgoing MIDI monitor.
- Preset recall via PC0 (Live) and PC1–122; save via CC111 with overwrite confirmation.
- Note On/Off keyboard, velocity, ADSR, portamento and documented CC0 pitch bend.
- Factory reset and MIDI reset protected by explicit confirmation.
- No dependencies, accounts, tracking, remote fonts or audio processing.

## Connection

Open the HTTPS site in a Web MIDI-compatible browser, preferably desktop Chrome or Edge. Connect a USB–MIDI interface to the computer, then connect its output to the pedal's **1/4-inch TRS MIDI input using Chase Bliss-compatible conversion**, such as MIDIBox. The pedal is not a USB MIDI device, and not every generic TRS adapter is compatible.

Click **Ligar MIDI**, grant permission, select the interface output and choose the pedal channel (default **2**). Turn demo mode off to send real messages. Connecting never automatically sends the displayed settings. A connected interface is not proof that the pedal is receiving messages.

To change the pedal's channel, hold both footswitches while powering it on and send a Program Change on the intended channel.

## MIDI source and limitations

Mapping source: [official MOOD MKII MIDI manual](https://www.chasebliss.com/s/MOOD-MKII_MIDI-Manual_Pedal_Chase-Bliss.pdf), linked from the [manufacturer's manual archive](https://www.chasebliss.com/manuals).

The manual does **not document SysEx or a state readback protocol**. This application does not request SysEx access, invent commands, read physical knob positions or claim bidirectional synchronization. Values are UI starting points/last successful sends, not hardware telemetry; a successful send does not mean the pedal acknowledged it. After recalling a preset or resetting, displayed values are explicitly marked unsynchronized.

The main knobs can be mode-dependent. Exact TIME/LENGTH synced ranges are in their tooltips; CLOCK and Tape/Stretch speed show stepped labels. The manual overlaps CLOCK value 16 between 3k/4k; the display assigns 16 to 4k, but sends the exact requested byte. Some documented synced ranges end at 128; MIDI data is always restricted to 0–127.

CC31: 0/1 = Loop → Wet, 2 = no sync, >2 = Wet → Loop. CC106 is **overdub**, not loop freeze. CC0 is the manual's 7-bit pitch bend control, not a standard 14-bit Pitch Bend message.

MIDI clock following/divisions can be configured; a DAW/controller must supply the clock externally. No browser clock generator or MIDI-input forwarding is included. Synth mode requires an existing sound in the pedal; the browser does not generate audio. Active notes are released on key release/cancel, tab changes, window blur and MIDI output/channel changes, using the original output and channel.

Preset slots 1/2 match the right/left physical toggle. Saving overwrites hardware presets; no local preset file is implied. Destructive commands require confirmation.

## Development

Node.js 22 or later:

```sh
npm test
npm start
```

Open http://127.0.0.1:4173. No installation or build step is needed. On Windows PowerShell with restricted script execution, use `npm.cmd test` and `npm.cmd start`.

GitHub Pages deployment runs the tests and publishes only the six static site files from the `main` branch through [the workflow](.github/workflows/pages.yml). Enable Pages with **GitHub Actions** as the source.

The illustration is original CSS, not a copied product photograph or brand artwork. Product names identify compatible hardware; this project is not affiliated with or endorsed by Chase Bliss.
