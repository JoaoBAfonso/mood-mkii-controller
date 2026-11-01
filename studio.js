import { pedals } from './pedals.js?v=2.0.0';

for (const pedal of pedals) {
  const link = document.createElement('a');
  link.className = `pedal-choice theme-${pedal.id}`;
  link.href = `controller.html?pedal=${pedal.id}`;
  link.setAttribute('aria-label', `Controlar ${pedal.name} · ${pedal.variant}`);
  const preview = document.createElement('div');
  preview.className = 'mini-stage';
  preview.setAttribute('aria-hidden', 'true');
  preview.innerHTML = `<div class="mini-pedal"><div class="mini-knobs">${'<i></i>'.repeat(6)}</div><div class="mini-toggles"><i></i><i></i><i></i></div><div class="mini-logo">${pedal.title}<small>${pedal.edition || 'L + R'}</small></div><div class="mini-switches"><i></i><i></i></div></div>`;
  const content = document.createElement('div');
  content.className = 'choice-content';
  const variant = document.createElement('span'); variant.className = 'eyebrow'; variant.textContent = pedal.variant;
  const name = document.createElement('h2'); name.textContent = pedal.name;
  const description = document.createElement('p'); description.textContent = pedal.subtitle;
  const meta = document.createElement('span'); meta.className = 'choice-meta'; meta.textContent = `${pedal.controls.length} CC · Presets${pedal.synth ? ' · Synth' : ''}`;
  const open = document.createElement('span'); open.className = 'choice-open'; open.textContent = 'Abrir controlador ↗';
  content.append(variant, name, description, meta, open); link.append(preview, content);
  document.getElementById('pedal-library').append(link);
}
