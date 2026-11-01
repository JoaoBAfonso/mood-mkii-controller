import { pedals } from './pedals.js?v=3.0.0';
import { instruments } from './instruments.js?v=3.0.0';

const section = new URLSearchParams(location.search).get('section');
if (section && !['pedals', 'synths'].includes(section)) {
  document.getElementById('hub-description').textContent = 'Secção desconhecida. Escolhe Pedais ou Sintetizadores.';
}
if (['pedals', 'synths'].includes(section)) {
  document.getElementById('category-library').hidden = true;
  document.getElementById('category-return').hidden = false;
  document.getElementById('pedal-library').hidden = false;
  document.getElementById('pedal-library').setAttribute('aria-label', section === 'pedals' ? 'Selecionar pedal' : 'Selecionar sintetizador');
  document.getElementById('hub-title').textContent = section === 'pedals' ? 'O teu pedalboard.' : 'O teu estúdio de síntese.';
  document.getElementById('hub-description').textContent = 'Escolhe um instrumento, explora os controlos e organiza a tua atuação.';
  document.title = `${section === 'pedals' ? 'Pedais' : 'Sintetizadores'} · MIDI Studio`;
}
const catalog = section === 'pedals' ? [...pedals, ...instruments.filter((instrument) => instrument.category === 'pedals')] : section === 'synths' ? instruments.filter((instrument) => instrument.category === 'synths') : [];
for (const pedal of catalog) {
  const link = document.createElement('a');
  const legacy = !pedal.category || typeof pedal.category !== 'string' || !['pedals', 'synths'].includes(pedal.category);
  link.className = `pedal-choice ${legacy ? `theme-${pedal.id}` : ''}`;
  link.href = legacy ? `controller.html?pedal=${pedal.id}` : `instrument.html?instrument=${pedal.id}`;
  link.setAttribute('aria-label', `Controlar ${pedal.name}${pedal.variant ? ` · ${pedal.variant}` : ''}`);
  const preview = document.createElement('div');
  preview.className = 'mini-stage';
  preview.setAttribute('aria-hidden', 'true');
  if (legacy) preview.innerHTML = `<div class="mini-pedal"><div class="mini-knobs">${'<i></i>'.repeat(6)}</div><div class="mini-toggles"><i></i><i></i><i></i></div><div class="mini-logo">${pedal.title}<small>${pedal.edition || 'L + R'}</small></div><div class="mini-switches"><i></i><i></i></div></div>`;
  else {
    for (const [key, value] of Object.entries(pedal.appearance)) if (key !== 'layout') preview.style.setProperty(`--device-${key}`, value);
    const hardware = document.createElement('div'); hardware.className = 'instrument-preview';
    const maker = document.createElement('span'); maker.textContent = pedal.brand;
    const knobs = document.createElement('div'); knobs.className = 'preview-knobs';
    for (let index = 0; index < 6; index++) knobs.append(document.createElement('i'));
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
  const open = document.createElement('span'); open.className = 'choice-open'; open.textContent = 'Abrir controlador ↗';
  content.append(variant, name, description, open); link.append(preview, content);
  document.getElementById('pedal-library').append(link);
}
