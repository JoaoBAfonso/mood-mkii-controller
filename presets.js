export const presetSlots = 122;
export const libraryKey = (pedalId) => `midi-studio:presets:${pedalId}`;
export const emptyLibrary = (pedalId) => ({ version: 1, pedalId, presets: {}, setlist: [] });

export function validateLibrary(value, pedalId, slotCount = presetSlots) {
  if (!value || typeof value !== 'object' || value.version !== 1 || value.pedalId !== pedalId) {
    throw new Error('This file is not a compatible library for this instrument.');
  }
  if (!value.presets || typeof value.presets !== 'object' || Array.isArray(value.presets) || !Array.isArray(value.setlist)) {
    throw new Error('Invalid library: presets or setlist are missing.');
  }
  const library = emptyLibrary(pedalId);
  for (const [key, preset] of Object.entries(value.presets)) {
    const slot = Number(key);
    if (!Number.isInteger(slot) || slot < 1 || slot > slotCount || String(slot) !== key ||
        !preset || typeof preset.name !== 'string' || preset.name.length > 80 ||
        typeof preset.notes !== 'string' || preset.notes.length > 1000 || typeof preset.favorite !== 'boolean') {
      throw new Error(`Invalid library: check slots (1–${slotCount}), names and notes.`);
    }
    library.presets[key] = { name: preset.name, notes: preset.notes, favorite: preset.favorite };
  }
  if (value.setlist.length > 500 || value.setlist.some((slot) => !Number.isInteger(slot) || slot < 1 || slot > slotCount)) {
    throw new Error(`Invalid setlist: use up to 500 entries from slots 1–${slotCount}.`);
  }
  library.setlist = [...value.setlist];
  return library;
}
export const presetTitle = (library, slot) => slot === 0 ? 'Live' : library.presets[slot]?.name || `Preset ${slot}`;

export function createPresetManager({ pedal, panel, quick, recall, current, targetKey, confirm, notify, onChange }) {
  const slotCount = pedal.presets?.count ?? presetSlots;
  const supportsLive = !pedal.presets || pedal.presets.live !== undefined;
  const deviceName = pedal.category === 'synths' ? 'instrument' : 'pedal';
  let library = emptyLibrary(pedal.id);
  try {
    const saved = localStorage.getItem(libraryKey(pedal.id));
    if (saved !== null) library = validateLibrary(JSON.parse(saved), pedal.id, slotCount);
  } catch (error) { notify(`Could not read the local library: ${error.message}`); }
  let selected = 1;
  let page = 0;
  const cursors = new Map();
  const $ = (id) => document.getElementById(id);
  panel.innerHTML = `
    <div class="preset-manager">
      <div class="preset-library-heading"><h3>Your library</h3><div class="library-files"><button id="preset-export">Export</button><button id="preset-import">Import</button><input id="preset-file" type="file" accept=".json,application/json" hidden></div></div>
      <p class="panel-description">Name the ${deviceName}'s slots and prepare your set. Names and notes stay in this browser.</p>
      <div class="library-filters"><label>Search<input id="preset-search" type="search" placeholder="Name, note or slot"></label><label class="favorite-filter"><input id="preset-only-favorites" type="checkbox"> Favorites only</label></div>
      <div id="preset-grid" class="preset-grid" aria-label="Preset slots"></div>
      <div class="library-pagination"><button id="preset-page-prev" aria-label="Previous page">←</button><span id="preset-page-label" aria-live="polite"></span><button id="preset-page-next" aria-label="Next page">→</button></div>
      <section class="preset-editor" aria-label="Edit preset">
        <div class="preset-editor-heading"><label>Slot<input id="preset-slot" type="number" min="1" max="${slotCount}" step="1" value="1"></label><label>Name<input id="preset-name" maxlength="80" placeholder="Sound name"></label><label class="preset-favorite"><input id="preset-favorite" type="checkbox"> Favorite</label></div>
        <label>Performance notes<textarea id="preset-notes" maxlength="1000" rows="2" placeholder="Song, section, transition, tempo…"></textarea></label>
        <div class="preset-actions"><button id="preset-organize">Save name and notes</button><button id="preset-add-setlist">Add to setlist</button><button id="recall-preset" class="primary">Load preset</button></div>
        <div id="preset-save-control"></div>
      </section>
      <section class="setlist-section" aria-label="Setlist"><h3>Setlist</h3><p class="hint">Follow your set with Previous / Next. A preset can appear more than once.</p><ol id="preset-setlist"></ol><p id="setlist-empty">Add presets in performance order.</p></section>
      <p class="preset-local-status" id="preset-local-status" role="status" aria-live="polite"></p>
    </div>`;
  quick.innerHTML = `<div class="current-preset"><span>PRESET</span><strong id="current-preset-name">Choose a preset</strong><small id="current-preset-position"></small></div><div class="quick-preset-actions"><button id="preset-previous" aria-label="Previous preset">← Previous</button><button id="preset-next" aria-label="Next preset">Next →</button>${supportsLive ? '<button id="live-preset">Live</button>' : ''}<button id="open-presets">Library</button></div>`;
  const metadata = () => library.presets[selected] || { name: '', notes: '', favorite: false };
  const candidate = () => structuredClone(library);
  function commit(next) {
    try {
      const checked = validateLibrary(next, pedal.id, slotCount);
      localStorage.setItem(libraryKey(pedal.id), JSON.stringify(checked));
      library = checked;
      $('preset-local-status').textContent = 'Library saved in this browser.';
      render();
      onChange();
      return true;
    } catch (error) {
      notify(`Could not save the library: ${error.message}`);
      return false;
    }
  }
  function readSlot() {
    const input = $('preset-slot');
    if (input.value === '' || !input.validity.valid) {
      notify(`Choose a whole-number slot from 1 to ${slotCount}.`);
      return null;
    }
    return Number(input.value);
  }
  function choose(slot) {
    selected = slot;
    const preset = metadata();
    $('preset-slot').value = slot;
    $('preset-name').value = preset.name;
    $('preset-notes').value = preset.notes;
    $('preset-favorite').checked = preset.favorite;
    renderGrid();
  }
  function filteredSlots() {
    const query = $('preset-search').value.trim().toLocaleLowerCase('en');
    return Array.from({ length: slotCount }, (_, index) => index + 1).filter((slot) => {
      const preset = library.presets[slot];
      return (!$('preset-only-favorites').checked || preset?.favorite) &&
        `${slot} ${preset?.name || ''} ${preset?.notes || ''}`.toLocaleLowerCase('en').includes(query);
    });
  }
  function renderGrid() {
    const slots = filteredSlots();
    const pages = Math.max(1, Math.ceil(slots.length / 12));
    page = Math.min(page, pages - 1);
    $('preset-grid').replaceChildren();
    for (const slot of slots.slice(page * 12, page * 12 + 12)) {
      const button = document.createElement('button');
      button.className = 'preset-tile'; button.dataset.slot = slot;
      button.setAttribute('aria-pressed', String(slot === selected));
      button.classList.toggle('current', String(slot) === current());
      const number = document.createElement('small'); number.textContent = `${String(slot).padStart(3, '0')}${library.presets[slot]?.favorite ? ' ★' : ''}`;
      const name = document.createElement('strong'); name.textContent = presetTitle(library, slot);
      button.append(number, name); button.onclick = () => choose(slot);
      $('preset-grid').append(button);
    }
    if (!slots.length) {
      const empty = document.createElement('p'); empty.textContent = 'No presets match your search.'; $('preset-grid').append(empty);
    }
    $('preset-page-label').textContent = `${slots.length} slots · ${page + 1} / ${pages}`;
    $('preset-page-prev').disabled = page === 0;
    $('preset-page-next').disabled = page === pages - 1;
  }
  const sequence = () => library.setlist.length ? library.setlist : Array.from({ length: slotCount }, (_, index) => index + 1);
  function position() {
    const list = sequence();
    const signature = JSON.stringify(list);
    const cursor = cursors.get(targetKey());
    if (cursor?.signature === signature && String(list[cursor.index]) === current()) return cursor.index;
    return list.indexOf(Number(current() || -1));
  }
  function loadPosition(index) {
    const list = sequence();
    if (index < 0 || index >= list.length) return;
    if (recall(list[index])) {
      cursors.set(targetKey(), { signature: JSON.stringify(list), index });
      update();
    }
  }
  function renderSetlist() {
    const focus = document.activeElement;
    const focusIndex = focus?.dataset.setlistIndex;
    const focusAction = focus?.dataset.setlistAction;
    $('preset-setlist').replaceChildren();
    library.setlist.forEach((slot, index) => {
      const row = document.createElement('li');
      const play = document.createElement('button'); play.className = 'setlist-play';
      play.textContent = `${index + 1}. ${presetTitle(library, slot)}`;
      play.setAttribute('aria-label', `Load entry ${index + 1}: ${presetTitle(library, slot)}`);
      play.setAttribute('aria-current', String(position() === index));
      const tag = document.createElement('small'); tag.textContent = `Slot ${slot}`; play.append(tag);
      play.onclick = () => loadPosition(index); row.append(play);
      for (const [action, label, text] of [['up', 'Move up', '↑'], ['down', 'Move down', '↓'], ['remove', 'Remove', '×']]) {
        const button = document.createElement('button'); button.textContent = text;
        button.dataset.setlistIndex = index; button.dataset.setlistAction = action;
        button.setAttribute('aria-label', `${label} entry ${index + 1}`);
        button.disabled = (action === 'up' && index === 0) || (action === 'down' && index === library.setlist.length - 1);
        button.onclick = () => {
          const next = candidate();
          if (action === 'remove') next.setlist.splice(index, 1);
          else {
            const other = index + (action === 'up' ? -1 : 1);
            [next.setlist[index], next.setlist[other]] = [next.setlist[other], next.setlist[index]];
          }
          commit(next);
        };
        row.append(button);
      }
      $('preset-setlist').append(row);
    });
    $('setlist-empty').hidden = library.setlist.length > 0;
    if (focusIndex !== undefined) {
      const index = Math.min(Number(focusIndex), library.setlist.length - 1);
      $('preset-setlist').querySelector(`[data-setlist-index="${index}"][data-setlist-action="${focusAction}"]`)?.focus();
    }
  }
  function update() {
    const slot = current();
    $('current-preset-name').textContent = slot === '' ? 'Choose a preset' : presetTitle(library, Number(slot));
    const index = position();
    $('current-preset-position').textContent = library.setlist.length && index >= 0 ? `Setlist · ${index + 1} / ${library.setlist.length}` : slot && slot !== '0' ? `Slot ${slot}` : '';
    $('preset-previous').disabled = index <= 0;
    $('preset-next').disabled = index === sequence().length - 1;
    renderGrid();
    renderSetlist();
  }
  function render() { update(); }
  $('preset-search').oninput = $('preset-only-favorites').onchange = () => { page = 0; renderGrid(); };
  $('preset-page-prev').onclick = () => { page--; renderGrid(); };
  $('preset-page-next').onclick = () => { page++; renderGrid(); };
  $('preset-slot').onchange = () => { const slot = readSlot(); if (slot !== null) choose(slot); };
  $('preset-organize').onclick = () => {
    const slot = readSlot(); if (slot === null) return;
    const next = candidate();
    next.presets[slot] = { name: $('preset-name').value.trim(), notes: $('preset-notes').value, favorite: $('preset-favorite').checked };
    if (commit(next)) choose(slot);
  };
  $('preset-add-setlist').onclick = () => {
    const slot = readSlot(); if (slot === null) return;
    const next = candidate(); next.setlist.push(slot); commit(next);
  };
  $('recall-preset').onclick = () => {
    const slot = readSlot();
    if (slot !== null && recall(slot)) { cursors.delete(targetKey()); update(); }
  };
  if (supportsLive) $('live-preset').onclick = () => { if (recall(0)) { cursors.delete(targetKey()); update(); } };
  $('preset-previous').onclick = () => loadPosition(position() - 1);
  $('preset-next').onclick = () => loadPosition(position() + 1);
  $('preset-export').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `${pedal.id}-presets.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('preset-import').onclick = () => $('preset-file').click();
  $('preset-file').onchange = async () => {
    const file = $('preset-file').files[0]; $('preset-file').value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('The file must be no larger than 1 MB.');
      const imported = validateLibrary(JSON.parse(await file.text()), pedal.id, slotCount);
      confirm(`Replace local names, notes, favorites and setlist? The ${deviceName}'s presets will not change.`, () => {
        if (commit(imported)) { cursors.clear(); choose(selected); update(); }
      });
    } catch (error) { notify(`Could not import: ${error.message}`); }
  };
  choose(selected); update();
  return { update, readSlot, title: (slot) => presetTitle(library, slot) };
}
