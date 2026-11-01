import { pedals } from './pedals.js?v=3.4.0';
import { instruments } from './instruments.js?v=3.4.0';
import { instrumentPanels } from './instrument-panels.js?v=3.4.0';

const section = new URLSearchParams(location.search).get('section');
if (section && !['pedals', 'synths'].includes(section)) {
  document.getElementById('hub-description').textContent = 'Unknown section. Choose a category below.';
}
if (['pedals', 'synths'].includes(section)) {
  document.getElementById('category-library').hidden = true;
  document.getElementById('category-return').hidden = false;
  document.getElementById('pedal-library').hidden = false;
  document.getElementById('pedal-library').setAttribute('aria-label', section === 'pedals' ? 'Select pedal' : 'Select synthesizer');
  document.getElementById('hub-title').textContent = section === 'pedals' ? 'Your pedalboard.' : 'Your synth studio.';
  document.getElementById('hub-description').textContent = 'Choose an instrument, explore its controls and prepare your performance.';
  document.title = `${section === 'pedals' ? 'Pedals' : 'Synthesizers'} · MIDI Studio`;
}
const catalog = section === 'pedals' ? [...pedals, ...instruments.filter((instrument) => instrument.category === 'pedals')] : section === 'synths' ? instruments.filter((instrument) => instrument.category === 'synths') : [];
for (const pedal of catalog) {
  const link = document.createElement('a');
  const legacy = !pedal.category || typeof pedal.category !== 'string' || !['pedals', 'synths'].includes(pedal.category);
  link.className = `pedal-choice ${legacy ? `theme-${pedal.id}` : ''}`;
  link.href = legacy ? `controller.html?pedal=${pedal.id}` : `instrument.html?instrument=${pedal.id}`;
  link.setAttribute('aria-label', `Control ${pedal.name}${pedal.variant ? ` · ${pedal.variant}` : ''}`);
  const preview = document.createElement('div');
  preview.className = 'mini-stage';
  preview.setAttribute('aria-hidden', 'true');
  if (legacy) preview.innerHTML = `<div class="mini-pedal"><div class="mini-knobs">${'<i></i>'.repeat(6)}</div><div class="mini-toggles"><i></i><i></i><i></i></div><div class="mini-logo">${pedal.title}<small>${pedal.edition || 'L + R'}</small></div><div class="mini-switches"><i></i><i></i></div></div>`;
  else {
    const panel = instrumentPanels[pedal.id];
    for (const [key, value] of Object.entries({ ...pedal.appearance, surface: panel.surface, ink: panel.ink, accent: panel.accent })) if (key !== 'layout') preview.style.setProperty(`--device-${key}`, value);
    const hardware = document.createElement('div'); hardware.className = `instrument-preview preview-${pedal.id} preview-${pedal.appearance.layout}`;
    const maker = document.createElement('span'); maker.textContent = pedal.brand;
    const knobs = document.createElement('div'); knobs.className = 'preview-face';
    knobs.style.aspectRatio = String(panel.ratio);
    for (const slot of [...panel.slots, ...(panel.references || []), ...(panel.eq ? [{ x: 34, y: 36, w: 32, h: 20, visual: 'knob' }] : [])]) {
      const mark = document.createElement('i'); mark.className = `preview-${slot.visual}`;
      for (const [key, value] of Object.entries({ left: slot.x, top: slot.y, width: slot.w, height: slot.h })) mark.style[key] = `${value}%`;
      knobs.append(mark);
    }
    if (pedal.id === 'source-audio-eq2') {
      const screen = document.createElement('div'); screen.className = 'preview-eq';
      for (let index = 0; index < 10; index++) screen.append(document.createElement('i'));
      hardware.append(screen);
    }
    const name = document.createElement('strong'); name.textContent = pedal.name;
    hardware.append(maker, knobs, name);
    if (['keyboard', 'drum'].includes(pedal.appearance.layout)) {
      const keys = document.createElement('div'); keys.className = pedal.appearance.layout === 'drum' ? 'preview-pads' : 'preview-keys';
      for (let index = 0; index < 8; index++) keys.append(document.createElement('i'));
      hardware.append(keys);
    }
    preview.append(hardware);
  }
  const content = document.createElement('div');
  content.className = 'choice-content';
  const variant = document.createElement('span'); variant.className = 'eyebrow'; variant.textContent = pedal.variant || `${pedal.brand}${pedal.edition ? ` · ${pedal.edition}` : ''}`;
  const name = document.createElement('h2'); name.textContent = pedal.name;
  const description = document.createElement('p'); description.textContent = pedal.subtitle;
  const open = document.createElement('span'); open.className = 'choice-open'; open.textContent = 'Open controller ↗';
  content.append(variant, name, description, open); link.append(preview, content);
  document.getElementById('pedal-library').append(link);
}
