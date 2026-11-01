# Chase Bliss · MIDI Studio

Independent, Portuguese-language Web MIDI controllers for **MOOD MKII**, **Lost + Found (green)**, **Generation Loss MKII** and **BAD MOOD (Ink)**. Select a pedal on the landing page, open its dedicated controller, and use **Pedais** to return.

**Website:** https://JoaoBAfonso.github.io/mood-mkii-controller/

## Features

- Four dedicated, bookmarkable controller pages with model-specific CC maps, normal/Hidden/ALT banks, mode diagrams and original pedal illustrations.
- MOOD MKII: 61 CCs; Lost + Found: 51; Generation Loss MKII: 41; BAD MOOD: 62. Commands are based on each model's manual, not inherited indiscriminately.
- Green Lost + Found theme, blue VHS Generation Loss theme and monochrome patterned BAD MOOD Ink theme alongside the existing lavender MOOD.

### MOOD MKII

- Original CSS illustration matching the physical control layout: TIME / MIX / LENGTH, both MODIFY knobs, CLOCK, three toggles, preset toggle and footswitches.
- All **61 documented CC numbers**, including hidden parameters, DIP switches, ramping, global settings, legacy tap tempo, preset saving and Synth controls.
- Knob dragging, native sliders, precise numeric input and keyboard-accessible controls.
- Separate normal/Hidden pedal banks, retaining each parameter's value when switching modes.
- Tocar/Hidden tabs select the displayed bank without changing the hardware's CC104 state.
- Selectable mode diagrams for Reverb, Delay, Slip, Env, Tape and Stretch, plus routing and ramping waveform illustrations.
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

Mapping sources, linked from the [manufacturer's manual archive](https://www.chasebliss.com/manuals):

| Pedal | MIDI reference | Controller |
|---|---|---|
| MOOD MKII | [Official MIDI manual](https://www.chasebliss.com/s/MOOD-MKII_MIDI-Manual_Pedal_Chase-Bliss.pdf) | [MOOD MKII](https://joaobafonso.github.io/mood-mkii-controller/controller.html?pedal=mood-mkii) |
| Lost + Found | [Official MIDI manual](https://www.chasebliss.com/s/Lost-Found_MIDI-Manual_Pedal_Chase-Bliss.pdf) | [Lost + Found](https://joaobafonso.github.io/mood-mkii-controller/controller.html?pedal=lost-found) |
| Generation Loss MKII | [Official MIDI manual](https://www.chasebliss.com/s/Generation-Loss-MKII_MIDI-Manual_Pedal_Chase-Blisspdf.pdf) | [Generation Loss MKII](https://joaobafonso.github.io/mood-mkii-controller/controller.html?pedal=generation-loss-mkii) |
| BAD MOOD | [Official MIDI manual](https://www.chasebliss.com/s/BAD-MOOD_MIDI-Manual_Chase-Bliss.pdf) | [BAD MOOD Ink](https://joaobafonso.github.io/mood-mkii-controller/controller.html?pedal=bad-mood) |

Each controller also links its complete manual. The existing MOOD features below describe MOOD MKII specifically; differences for the other models are listed separately.

The manual does **not document SysEx or a state readback protocol**. This application does not request SysEx access, invent commands, read physical knob positions or claim bidirectional synchronization. Changes made on the physical pedal do not reach the site. Values are UI starting points/last successful sends, not hardware telemetry; a successful send does not mean the pedal acknowledged it. After recalling a preset or resetting, values from before the command are marked `~` in both the pedal and the command panels. Sending an individual CC removes that parameter's stale marker.

### Hidden bank and state isolation

Selecting the **Tocar** tab shows the normal pedal bank; selecting **Hidden** shows the dedicated Hidden CC bank. Mouse and keyboard tab navigation restore the bank's existing values **without sending MIDI or changing CC104**. The other tabs retain the current pedal view. The caption explicitly separates the visible bank from CC104's last UI state.

Clicking **Hidden menu · hardware (CC104)** sends **only CC104** and shows the corresponding bank. Neither tab navigation nor hardware mode changes replay or overwrite the other bank's values. The mapping follows the [main manual's Hidden Options diagram](https://www.chasebliss.com/s/MOOD-MKII_Manual_Pedal_Chase-Bliss.pdf):

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

### Other pedal-specific behavior

- **Lost + Found:** TIME/MODIFY on each side; centre MIX/BLEND. Hidden maps to ALT L/R, SPILL, EQ L/R, GLUE and SPREAD destination. CC25 is a continuous SPILL parameter, not a waveform. Three effect families per side contain A/B algorithms selected with MODIFY; the A/B buttons send 0/127 and Neutral sends 64. L SWAP/R SWAP replace a channel's effect families with those of the opposite side, exposing all twelve algorithms. BANK changes the physical preset selector's right/left targets to 3/4 (not the effect algorithms). MIDI PC slots remain 0–122. Random L/R/both commands mark values non-synchronized rather than inventing their resulting settings. Tap subdivisions include thirteen documented choices.
- **Generation Loss MKII:** independent ALT values including AUX onset, ramp speed, bypass type, noise levels and input gain. **CC104 is inverted: 0 enters ALT; 1 exits.** The UI's ON/OFF indicates whether ALT is active, not whether the byte is nonzero. Toggle CC21/22/23 and input gain use 1/2/3. The model menu sends the thirteen exact documented CC16 points; arbitrary intermediate knob values are shown as raw CC values rather than assigning undocumented model boundaries. CLASSIC (CC72) relabels MODEL/LP, SATURATE/GEN, FAILURE/HP, retains their CC values and disables the model menu. FREEZE is available via Classic + AUX FAIL + DROP BYP/SNAG BYP. DSP bypass uses documented representative values 0/127; the unspecified boundary 64 is not emitted by that selector. No Synth, MIDI clock controls, tap tempo or factory reset are invented.
- **BAD MOOD Ink:** SOUP/RELAY/FLIP and BURST/RADIO/MASK mode cards; Hidden CROSS/BALANCE/FADE/EQ/GLUE/BLEND, master volume and CROSS input. CC25 is continuous BALANCE and CC33 chooses CROSS source, not the MOOD waveform/buffer controls. The RADIO menu sends the five official station points; raw scan values remain available. FLIP exposes all 48 official CC17 chord intervals as numbered choices, with exact boundary labels, without guessing their voicings. Its clock divisions include nine choices distinct from MOOD's. Synth controls, EQ destination and its own DIP map are included.

### Navigation and safety

Routes use `controller.html?pedal=...`, so bookmarks and browser back/forward work on static GitHub Pages without server rewrites. Unknown model identifiers show an explicit error and no controller.

No model is detected automatically. Opening a page or choosing another pedal requests no MIDI permission and sends no values. Each newly opened controller starts with its own UI values and requires output/channel selection; values are not migrated between pedal models. Back/forward may restore a previous page's last UI state through the browser's page cache; this is still not telemetry. Normal/Hidden view navigation never replays a bank. Leaving via **Pedais** releases active notes on their original destination and blocks the navigation if Note Off fails; browser unload also attempts release and requests confirmation on failure.

MIDI tests use mocked outputs only. Real pedal reception, firmware behavior and physical appearance have not been verified on hardware.

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

The tests use a mocked MIDI output; they do not send anything to physical hardware. They cover exact CC lists for all models, select/DIP/action bytes, model points and chord boundaries, selector/history navigation, bank restoration, per-model ALT semantics, original MOOD regressions, state isolation, failed sends, presets/confirmation, retryable note releases, control coverage, input validation and mobile/tablet/desktop layouts.

The shared engine is [app.js](app.js), pedal descriptors and model-specific behavior are in [pedals.js](pedals.js), and the original MOOD map remains in [controls.js](controls.js). [index.html](index.html) / [studio.js](studio.js) implement selection, and [controller.html](controller.html) is the common accessible controller template.

GitHub Pages deployment runs the MIDI and browser tests and publishes all static site modules/pages plus the local font assets from the `main` branch through [the workflow](.github/workflows/pages.yml). Enable Pages with **GitHub Actions** as the source. Versioned asset URLs prevent a freshly loaded release from mixing new scripts with cached old modules; bump the asset query versions together when publishing incompatible changes.

## Visual reference

The [user-supplied MOOD MKII manual](https://static1.squarespace.com/static/622176a9b8d15d57ffbf5700/t/64111ea7c3f6d569218566b4/1678843563430/MOOD+MKII_Manual_Pedal_Chase+Bliss.pdf) informed the visual language: white paper, deep purple ink, lavender and pink accents, geometric headings, ruled sections, simple knob diagrams and red DIP-switch housings. Mode explanations are concise original summaries of the documented behavior, not copied manual text.

The geometric **Outfit** font is an open-source substitute, not an extracted proprietary manual font. It is served locally; its [SIL Open Font License](assets/fonts/OFL.txt) is included. Mode schematics, the pedal and the abstract header artwork are original inline SVG/CSS, not copied product photographs, manual illustrations or brand logos. The mode diagrams and routing schema are conceptual UI aids, not audio visualizations or hardware telemetry. Product names identify compatible hardware; this project is not affiliated with or endorsed by Chase Bliss.
