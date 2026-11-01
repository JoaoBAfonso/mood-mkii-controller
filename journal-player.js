import { createAudioAnalysis, createVisualizer, drawWaveform, timeLabel, visualProfiles } from './journal-audio.js?v=3.4.0';

export function createJournalPlayer({ notify, canPlay = () => true }) {
  const $ = (id) => document.getElementById(id);
  const root = $('sound-player');
  const audio = $('player-audio');
  const analysis = createAudioAnalysis();
  let queue = [];
  let current = -1;
  let sourceUrl;
  let sourceBlob;
  let peaks;
  let analyser;
  let mediaSource;
  let stopVisual = () => {};
  let generation = 0;
  let returnFocus;
  const currentEntry = () => queue[current];
  function error(message) {
    $('player-error').textContent = message; $('player-error').hidden = !message;
    if (message) notify(message);
  }
  function updateProgress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    $('player-progress').max = String(duration || 1);
    $('player-progress').value = String(audio.currentTime || 0);
    $('player-progress').disabled = !duration;
    $('player-progress').setAttribute('aria-valuetext', `${timeLabel(audio.currentTime)} of ${timeLabel(duration)}`);
    $('player-time').textContent = `${timeLabel(audio.currentTime)} / ${timeLabel(duration)}`;
    if (peaks && !root.classList.contains('minimized')) drawWaveform($('player-waveform'), peaks, duration ? audio.currentTime / duration : 0);
    $('player-toggle').textContent = audio.paused ? 'Play' : 'Pause';
  }
  function renderQueue() {
    $('player-queue').replaceChildren();
    for (const [index, entry] of queue.entries()) {
      const row = document.createElement('li');
      row.classList.toggle('current', index === current);
      const play = document.createElement('button'); play.textContent = `${index + 1}. ${entry.title}`;
      play.setAttribute('aria-label', `Play queued track ${index + 1}: ${entry.title}`);
      if (index === current) play.setAttribute('aria-current', 'true');
      play.onclick = () => load(index);
      const up = document.createElement('button'); up.textContent = '↑'; up.setAttribute('aria-label', `Move ${entry.title} up`);
      up.disabled = index === 0;
      up.onclick = () => {
        [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]];
        if (current === index) current--;
        else if (current === index - 1) current++;
        renderQueue();
      };
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${entry.title} from queue`);
      remove.onclick = () => {
        queue.splice(index, 1);
        if (index === current) {
          if (queue.length) load(Math.min(index, queue.length - 1)); else close();
        } else { if (index < current) current--; renderQueue(); }
      };
      row.append(play, up, remove); $('player-queue').append(row);
    }
    $('player-track-position').textContent = queue.length ? `Track ${current + 1} of ${queue.length}` : 'Queue empty';
    $('player-previous').disabled = current <= 0;
    $('player-next').disabled = current < 0 || current >= queue.length - 1;
  }
  function show(expanded) {
    if (!currentEntry()) return;
    if (!root.open) returnFocus = document.activeElement;
    if (root.open) root.close();
    root.classList.toggle('minimized', !expanded);
    document.body.classList.toggle('player-expanded', expanded);
    document.body.classList.add('has-player');
    if (expanded) root.showModal(); else root.show();
    $('player-size').textContent = expanded ? 'Minimize' : 'Expand';
    $('player-size').setAttribute('aria-label', expanded ? 'Minimize player' : 'Expand player');
    if (!expanded) returnFocus?.focus();
    updateProgress(); restartVisual();
  }
  function restartVisual() {
    stopVisual();
    if (analyser && root.open && !root.classList.contains('minimized')) {
      stopVisual = createVisualizer($('player-visualizer'), analyser, () => $('visual-profile').value, () => !audio.paused);
    }
  }
  async function play() {
    if (!canPlay()) { error('Stop the recording before playing a sound.'); return; }
    const token = generation;
    try {
      if (analyser) await analysis.context().resume();
      if (token !== generation) return;
      if (!canPlay()) { error('Stop the recording before playing a sound.'); return; }
      await audio.play();
    } catch (failure) {
      if (token === generation && failure.name !== 'AbortError') error(`Could not play this track: ${failure.message}. Try Play again or download the original.`);
    }
  }
  function load(index, expanded, autoplay = true) {
    if (!queue[index]) return;
    const wasOpen = root.open;
    audio.pause(); stopVisual(); generation++;
    const token = generation;
    current = index; peaks = undefined;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceBlob = currentEntry().audio; sourceUrl = URL.createObjectURL(sourceBlob);
    audio.src = sourceUrl;
    $('player-title').textContent = currentEntry().title;
    $('player-section').textContent = currentEntry().section;
    $('player-download').href = sourceUrl; $('player-download').download = currentEntry().fileName;
    $('player-waveform').getContext('2d').clearRect(0, 0, $('player-waveform').width, $('player-waveform').height);
    error(''); renderQueue();
    if (!wasOpen || expanded !== undefined) show(expanded ?? true);
    try {
      if (!analyser) {
        const context = analysis.context();
        const nextAnalyser = context.createAnalyser(); nextAnalyser.fftSize = 1024; nextAnalyser.smoothingTimeConstant = .8;
        mediaSource ??= context.createMediaElementSource(audio);
        mediaSource.connect(nextAnalyser); nextAnalyser.connect(context.destination);
        analyser = nextAnalyser;
      }
    } catch (failure) { error(`Live visualizers unavailable: ${failure.message}`); }
    analysis.peaks(sourceBlob).then((data) => {
      if (token !== generation) return;
      peaks = data.peaks; updateProgress();
    }, (failure) => { if (token === generation) error(`Waveform unavailable for this format: ${failure.message}. Playback may still be supported.`); });
    restartVisual(); updateProgress(); if (autoplay) play();
  }
  function close() {
    generation++; audio.pause(); audio.removeAttribute('src'); audio.load(); stopVisual();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = undefined; sourceBlob = undefined; queue = []; current = -1; peaks = undefined;
    root.close(); document.body.classList.remove('has-player', 'player-expanded'); returnFocus?.focus();
  }
  for (const family of ['2D', '3D', 'Creative']) {
    const group = document.createElement('optgroup'); group.label = family;
    for (const profile of visualProfiles.filter((profile) => profile.family === family)) group.append(new Option(profile.name, profile.id));
    $('visual-profile').append(group);
  }
  $('visual-profile').onchange = restartVisual;
  $('player-size').onclick = () => show(root.classList.contains('minimized'));
  $('player-close').onclick = close;
  $('player-toggle').onclick = () => { if (audio.paused) play(); else audio.pause(); };
  $('player-previous').onclick = () => load(current - 1);
  $('player-next').onclick = () => load(current + 1);
  $('player-progress').oninput = () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number($('player-progress').value); updateProgress(); };
  $('player-volume').oninput = () => { audio.volume = Number($('player-volume').value); };
  $('player-clear').onclick = () => { if (currentEntry()) { queue = [currentEntry()]; current = 0; renderQueue(); } };
  root.addEventListener('cancel', (event) => { event.preventDefault(); show(false); });
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('play', () => {
    for (const other of document.querySelectorAll('audio')) if (other !== audio) other.pause();
    updateProgress();
  });
  audio.addEventListener('pause', updateProgress);
  audio.addEventListener('error', () => { if (currentEntry() && sourceUrl) error(`This browser could not play "${currentEntry().title}". Download the original or choose another track.`); });
  audio.addEventListener('ended', () => {
    if ($('player-repeat').value === 'one') { audio.currentTime = 0; play(); }
    else if (current < queue.length - 1) load(current + 1);
    else if ($('player-repeat').value === 'all' && queue.length) load(0);
    else updateProgress();
  });
  window.addEventListener('resize', updateProgress);
  window.addEventListener('pagehide', () => { audio.pause(); stopVisual(); });
  return {
    preview: (blob) => analysis.peaks(blob),
    open(items) {
      if (!canPlay()) { error('Stop the recording before playing a sound.'); return; }
      if (!items.length) { notify('Select at least one sound to play.'); return; }
      queue = [...items]; load(0, true);
    },
    add(items) {
      if (!canPlay()) { error('Stop the recording before adding sounds.'); return; }
      if (!items.length) { notify('Select at least one sound to add.'); return; }
      if (!currentEntry()) { queue = [...items]; load(0, false, false); }
      else { queue.push(...items); renderQueue(); }
      notify(`Added ${items.length} ${items.length === 1 ? 'sound' : 'sounds'} to the player queue.`);
    },
    pause: () => audio.pause(),
    reconcile(entries) {
      const active = currentEntry();
      if (!active) return;
      const latest = new Map(entries.map((entry) => [entry.id, entry]));
      if (!latest.has(active.id)) { close(); return; }
      // Metadata edits must not interrupt the active Blob or its playback position.
      current = queue.slice(0, current).filter((entry) => latest.has(entry.id)).length;
      queue = queue.filter((entry) => latest.has(entry.id)).map((entry) => latest.get(entry.id));
      if (currentEntry().audio !== sourceBlob) load(current);
      else { $('player-title').textContent = currentEntry().title; $('player-section').textContent = currentEntry().section; renderQueue(); }
    },
  };
}
