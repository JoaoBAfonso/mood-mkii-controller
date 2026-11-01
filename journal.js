import { journalSections, audioExtensions, validateEntry, openJournal, filterEntries, encodeBackup, decodeBackup } from './journal-store.js?v=3.5.0';
import { createJournalPlayer } from './journal-player.js?v=3.5.0';
import { drawWaveform, timeLabel } from './journal-audio.js?v=3.5.0';
import { createDriveSession, validateDriveSettings } from './journal-drive.js?v=3.5.0';

const $ = (id) => document.getElementById(id);
let store;
let entries = [];
let driveEntries = [];
let driveConnected = false;
let driveBusy = false;
let googleReady = false;
let driveGeneration = 0;
let section = '';
let visibleCount = 20;
let editing;
let busy = false;
let recorder;
let stream;
let recordingPending = false;
let recordingStarted = 0;
let clock;
let pendingTake;
let recoveryUrl;
let playerImportMode = 'open';
const urls = new Map();
const notify = (message = '') => {
  $('notification').textContent = message; $('notification').hidden = !message;
  $('edit-error').textContent = message; $('edit-error').hidden = !message || !$('edit-dialog').open;
  if ($('sound-player').open) { $('player-error').textContent = message; $('player-error').hidden = !message; }
};
const sizeLabel = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const libraryEntries = () => [...entries, ...driveEntries];
const drive = createDriveSession({ changed: driveChanged });
const player = createJournalPlayer({ notify, canPlay: () => !recordingPending, resolveAudio: (entry) => drive.audio(entry, { priority: true }) });
const selected = new Set();
let currentView = [];
const waveforms = new Map();
const observer = new IntersectionObserver((items) => {
  for (const item of items) {
    if (!item.isIntersecting) continue;
    observer.unobserve(item.target);
    const entry = libraryEntries().find((entry) => entry.id === item.target.dataset.entry);
    if (!entry) continue;
    const card = item.target;
    const preview = entry.source === 'drive' ? drive.audio(entry).then((audio) => player.preview(audio)) : player.preview(entry.audio);
    preview.then((data) => {
      if (!card.isConnected) return;
      const canvas = card.querySelector('.waveform-preview');
      waveforms.set(canvas, data.peaks); drawWaveform(canvas, data.peaks);
      canvas.dataset.ready = 'true'; card.querySelector('.waveform-status').textContent = `${timeLabel(data.duration)} · Full track waveform`;
    }, (error) => {
      if (card.isConnected) card.querySelector('.waveform-status').textContent = `Waveform unavailable: ${error.message}. You can still try playback or download.`;
    });
  }
}, { rootMargin: '600px' });
const waveResize = new ResizeObserver((items) => { for (const item of items) { const peaks = waveforms.get(item.target); if (peaks) drawWaveform(item.target, peaks); } });
function selectionControls() {
  $('selection-count').textContent = `${selected.size} selected`;
  $('play-selection').disabled = !selected.size || recordingPending;
  $('queue-selection').disabled = !selected.size || recordingPending;
  $('play-view').disabled = !currentView.length || recordingPending;
}
function controls() {
  for (const id of ['import-audio', 'export-backup', 'restore-backup', 'persistent-storage']) $(id).disabled = !store || busy || recordingPending;
  $('record').disabled = !store || busy || recordingPending || Boolean(pendingTake);
  $('stop-recording').disabled = !recorder || recorder.state === 'inactive';
  $('retry-recording').disabled = busy;
  $('recording-title').disabled = recordingPending;
  for (const button of $('entries').querySelectorAll('.entry-actions button')) button.disabled = busy || recordingPending || button.dataset.restricted === 'true';
  $('open-player-files').disabled = !store || busy || recordingPending;
  $('player-add-files').disabled = !store || busy || recordingPending;
  selectionControls();
  driveControls();
}
function driveControls() {
  $('drive-connect').disabled = driveBusy || recordingPending;
  $('drive-connect').textContent = !googleReady ? 'Prepare Google sign-in' : driveConnected ? 'Switch Google account' : 'Connect Google Drive';
  $('drive-refresh').disabled = !driveConnected || driveBusy || recordingPending;
  $('drive-refresh').hidden = !driveConnected;
  $('drive-disconnect').disabled = !driveConnected && !(driveBusy && googleReady);
  $('drive-disconnect').hidden = $('drive-disconnect').disabled;
  $('drive-client-id').disabled = driveConnected || driveBusy;
  $('drive-folder-id').disabled = driveConnected || driveBusy;
}
function driveChanged({ connected, pending = false, message }) {
  driveGeneration++;
  driveConnected = connected;
  driveBusy = pending;
  $('drive-badge').textContent = connected ? 'CONNECTED · READ ONLY' : 'DISCONNECTED';
  $('drive-status').textContent = message;
  if (!connected) { driveEntries = []; render(); }
  driveControls();
  if (connected) refreshDrive();
}
async function refreshDrive() {
  const generation = driveGeneration;
  driveBusy = true; driveControls();
  $('drive-status').textContent = 'Reading the selected folder and its subfolders…';
  try {
    const settings = validateDriveSettings($('drive-client-id').value, $('drive-folder-id').value);
    const result = await drive.library(settings.folderId);
    const previous = new Map(driveEntries.map((entry) => [entry.id, entry]));
    driveEntries = result.entries.map((entry) => {
      const old = previous.get(entry.id);
      if (old?.version === entry.version) return Object.assign(old, entry);
      return entry;
    });
    render();
    $('drive-status').textContent = `${result.account?.emailAddress || result.account?.displayName || 'Google account'} · ${result.name} · ${driveEntries.length} sounds · Read only`;
  } catch (error) {
    if (generation === driveGeneration && error.name !== 'AbortError') { $('drive-status').textContent = `Could not read Drive: ${error.message}`; notify($('drive-status').textContent); }
  } finally {
    if (generation === driveGeneration) { driveBusy = false; driveControls(); }
  }
}
$('drive-connect').onclick = async () => {
  try {
    const settings = validateDriveSettings($('drive-client-id').value, $('drive-folder-id').value);
    localStorage.setItem('midi-studio-drive-settings', JSON.stringify(settings));
    if (!googleReady) {
      driveBusy = true; driveControls(); $('drive-status').textContent = 'Loading Google sign-in…';
      await drive.prepare(); googleReady = true;
      driveBusy = false;
      $('drive-status').textContent = 'Ready. Press Connect Google Drive to choose your account and authorize read-only access.';
    } else {
      drive.connect(settings.clientId);
    }
  } catch (error) {
    $('drive-settings').open = true; $('drive-status').textContent = error.message; notify(error.message);
    driveBusy = false;
  } finally {
    driveControls();
  }
};
$('drive-refresh').onclick = refreshDrive;
$('drive-disconnect').onclick = async () => {
  try { await drive.disconnect(); } catch (error) { $('drive-status').textContent = error.message; notify(error.message); }
};
window.addEventListener('pagehide', () => drive.clear('Drive session ended.'));
try {
  const saved = JSON.parse(localStorage.getItem('midi-studio-drive-settings') || 'null');
  if (saved) {
    const settings = validateDriveSettings(saved.clientId, saved.folderId);
    $('drive-client-id').value = settings.clientId; $('drive-folder-id').value = settings.folderId;
  }
} catch (error) { notify(`Could not restore Drive connection settings: ${error.message}. Enter them again.`); }
async function operate(task) {
  if (busy) { notify('Please wait for the current library operation to finish.'); return; }
  busy = true; controls(); notify();
  try { await task(); }
  catch (error) { notify(`Could not complete this operation: ${error.message}. Your existing library has been kept.`); }
  finally { busy = false; controls(); }
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function releasePlayers() {
  observer.disconnect(); waveResize.disconnect(); waveforms.clear();
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
}
function render() {
  releasePlayers();
  const library = libraryEntries();
  player.reconcile(library);
  for (const id of selected) if (!library.some((entry) => entry.id === id)) selected.delete(id);
  $('entry-count').textContent = String(library.length);
  $('section-filters').replaceChildren();
  for (const name of ['', ...journalSections]) {
    const button = element('button', `${name || 'All sounds'} `); button.type = 'button';
    button.append(element('small', String(library.filter((entry) => !name || entry.section === name).length)));
    button.setAttribute('aria-pressed', String(section === name));
    button.onclick = () => { section = name; visibleCount = 20; render(); };
    $('section-filters').append(button);
  }
  const tag = $('tag-filter').value;
  $('tag-filter').replaceChildren(new Option('All tags', ''));
  const tags = [...new Set(library.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b, 'en'));
  for (const name of tags) $('tag-filter').add(new Option(name, name));
  $('tag-filter').value = tags.includes(tag) ? tag : '';
  const source = $('source-filter').value;
  const filtered = filterEntries(library.filter((entry) => !source || (entry.source || 'local') === source),
    { section, query: $('search').value, tag: $('tag-filter').value, sort: $('sort').value });
  currentView = filtered;
  selectionControls();
  $('results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'sound' : 'sounds'}${section ? ` in ${section}` : ''}`;
  $('entries').replaceChildren();
  for (const entry of filtered.slice(0, visibleCount)) {
    const card = element('article', undefined, 'sound-entry'); card.dataset.entry = entry.id;
    const top = element('div', undefined, 'entry-top');
    top.append(element('span', entry.section, 'section-label'), element('time', new Date(entry.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })));
    const selection = element('label', undefined, 'entry-select');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.has(entry.id);
    checkbox.setAttribute('aria-label', `Select ${entry.title}`);
    checkbox.onchange = () => { if (checkbox.checked) selected.add(entry.id); else selected.delete(entry.id); selectionControls(); };
    selection.append(checkbox, element('span', 'Select')); top.append(selection);
    const url = entry.audio ? URL.createObjectURL(entry.audio) : undefined;
    if (url) urls.set(entry.id, url);
    const waveform = document.createElement('canvas'); waveform.className = 'waveform-preview';
    waveform.setAttribute('role', 'img'); waveform.setAttribute('aria-label', `Full audio waveform: ${entry.title}`);
    const status = element('p', entry.source === 'drive' ? 'Loading private audio for waveform…' : 'Analysing audio for waveform…', 'waveform-status');
    const playback = element('div', undefined, 'entry-playback');
    const play = element('button', 'Play & visualize', 'entry-play primary');
    play.setAttribute('aria-label', `Play ${entry.title}`); play.onclick = () => {
      if (recordingPending) { notify('Stop the recording before playing a sound.'); return; }
      player.open([entry]);
    };
    const add = element('button', '+ Queue'); add.setAttribute('aria-label', `Add ${entry.title} to queue`);
    add.onclick = () => { if (recordingPending) notify('Stop the recording before adding sounds.'); else player.add([entry]); };
    playback.append(play, add);
    card.append(top, element('h3', entry.title), element('p', `${entry.fileName} · ${sizeLabel(entry.audio?.size ?? entry.size)}`, 'entry-file'), waveform, status, playback);
    if (entry.source === 'drive') card.append(element('p', `Google Drive${entry.path ? ` · ${entry.path}` : ''}`, 'entry-source'));
    if (entry.notes) card.append(element('p', entry.notes, 'entry-notes'));
    const tagList = element('div', undefined, 'tags');
    for (const tag of entry.tags) tagList.append(element('span', tag));
    card.append(tagList);
    const actions = element('div', undefined, 'entry-actions');
    const download = entry.source === 'drive' ? element('button', 'Download original') : element('a', 'Download');
    if (entry.source === 'drive') {
      download.disabled = !entry.canDownload;
      download.dataset.restricted = String(!entry.canDownload);
      download.onclick = async () => {
        download.disabled = true;
        try {
          const audio = await drive.audio(entry, { priority: true });
          if (!card.isConnected) return;
          const fileUrl = URL.createObjectURL(audio);
          const link = element('a'); link.href = fileUrl; link.download = entry.fileName; link.click();
          setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        } catch (error) { if (error.name !== 'AbortError') notify(`Could not download audio: ${error.message}`); }
        finally { download.disabled = !entry.canDownload; }
      };
    } else { download.href = url; download.download = entry.fileName; }
    const edit = element('button', 'Edit'); edit.onclick = () => {
      if (busy) { notify('Please wait for the current library operation to finish.'); return; }
      editing = entry.id; $('edit-title').value = entry.title; $('edit-section').value = entry.section;
      $('edit-tags').value = entry.tags.join(', '); $('edit-notes').value = entry.notes; $('edit-error').hidden = true; $('edit-dialog').showModal();
    };
    const remove = element('button', 'Delete', 'delete'); remove.onclick = () => {
      if (!window.confirm(`Delete "${entry.title}" and its local audio? Export a backup first if you want to keep it.`)) return;
      operate(async () => { await store.remove(entry.id); entries = entries.filter((item) => item.id !== entry.id); render(); });
    };
    if (entry.source === 'drive') actions.append(download);
    else actions.append(download, edit, remove);
    card.append(actions); $('entries').append(card);
    observer.observe(card); waveResize.observe(waveform);
  }
  $('empty').hidden = filtered.length > 0;
  $('empty').querySelector('h3').textContent = library.length ? 'No sounds match this view.' : 'A quiet space, ready for a sound.';
  $('empty').querySelector('p').textContent = library.length ? 'Choose another section or clear your search, source and tag filters.' : 'Import audio, record a sketch or connect your private Drive folder.';
  $('show-more').hidden = filtered.length <= visibleCount;
  $('storage-status').textContent = `Local library · ${sizeLabel(entries.reduce((size, entry) => size + entry.audio.size, 0))}`;
}
function makeEntry(audio, fileName, title, selectedSection) {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: title.trim().slice(0, 200) || 'Untitled sound', section: selectedSection,
    notes: '', tags: [], fileName, createdAt: now, updatedAt: now, audio };
}
async function saveEntries(newEntries) {
  await store.save(newEntries);
  const replacements = new Set(newEntries.map((entry) => entry.id));
  entries = [...entries.filter((entry) => !replacements.has(entry.id)), ...newEntries];
  render();
}
$('import-audio').onclick = () => $('audio-files').click();
function importFiles(input, playerMode) {
  const files = [...input.files]; input.value = '';
  if (!files.length) return;
  operate(async () => {
    for (const file of files) if (!file.size || !(file.type.startsWith('audio/') || audioExtensions.test(file.name))) throw new Error(`"${file.name}" is not a supported audio file`);
    const imported = files.map((file) => makeEntry(file, file.name, file.name.replace(/\.[^.]+$/, ''), section || 'Sketches'));
    await saveEntries(imported);
    if ($('source-filter').value === 'drive') $('source-filter').value = 'local';
    $('search').value = ''; $('tag-filter').value = ''; render();
    notify(`Imported ${files.length} ${files.length === 1 ? 'sound' : 'sounds'}.`);
    if (playerMode === 'open') player.open(imported);
    if (playerMode === 'queue') player.add(imported);
  });
}
$('audio-files').onchange = () => importFiles($('audio-files'));
$('open-player-files').onclick = () => { playerImportMode = 'open'; $('player-files').click(); };
$('player-add-files').onclick = () => { playerImportMode = 'queue'; $('player-files').click(); };
$('player-browse').onclick = () => { $('player-size').click(); $('section-filters').scrollIntoView({ block: 'start' }); };
$('player-files').onchange = () => importFiles($('player-files'), playerImportMode);
$('play-view').onclick = () => player.open(currentView);
$('play-selection').onclick = () => player.open(libraryEntries().filter((entry) => selected.has(entry.id)));
$('queue-selection').onclick = () => player.add(libraryEntries().filter((entry) => selected.has(entry.id)));
for (const id of ['search', 'tag-filter', 'sort', 'source-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { visibleCount = 20; render(); });
$('show-more').onclick = () => { visibleCount += 20; render(); };
for (const name of journalSections) $('edit-section').add(new Option(name, name));
$('cancel-edit').onclick = () => $('edit-dialog').close();
$('edit-form').onsubmit = (event) => {
  event.preventDefault();
  operate(async () => {
    const original = entries.find((entry) => entry.id === editing);
    if (!original) throw new Error('This entry is no longer available');
    const tags = [...new Set($('edit-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean))];
    await saveEntries([{ ...original, title: $('edit-title').value.trim(), section: $('edit-section').value,
      notes: $('edit-notes').value, tags, updatedAt: Date.now() }]);
    $('edit-dialog').close();
  });
};
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$('export-backup').onclick = () => operate(async () => {
  const text = await encodeBackup(entries);
  downloadBlob(new Blob([text], { type: 'application/json' }), `sound-journal-${new Date().toISOString().slice(0, 10)}.json`);
  notify('Backup download started. It includes the full local audio library; check that the file finishes downloading.');
});
$('restore-backup').onclick = () => $('backup-file').click();
$('backup-file').onchange = () => {
  const file = $('backup-file').files[0]; $('backup-file').value = '';
  if (!file) return;
  operate(async () => {
    const restored = decodeBackup(await file.text());
    const duplicates = restored.filter((item) => entries.some((entry) => entry.id === item.id)).length;
    if (!window.confirm(`Restore ${restored.length} sounds? ${duplicates} matching entries will be replaced. Other sounds will be kept.`)) return;
    await saveEntries(restored);
    if ($('source-filter').value === 'drive') { $('source-filter').value = 'local'; render(); }
    notify(`Restored ${restored.length} sounds.`);
  });
};
$('persistent-storage').onclick = () => operate(async () => {
  if (!navigator.storage?.persist) throw new Error('Durable storage requests are unavailable in this browser');
  notify(await navigator.storage.persist() ? 'Durable storage granted. Keep exporting backups as well.' : 'Durable storage was not granted. Your library still works; keep regular backups.');
});
function stopTracks() { stream?.getTracks().forEach((track) => track.stop()); stream = undefined; clearInterval(clock); }
function displayTime() {
  const seconds = Math.floor((Date.now() - recordingStarted) / 1000);
  $('recording-time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function clearRecovery() {
  $('recovery-player').pause(); $('recovery-player').removeAttribute('src'); $('recovery-player').load();
  if (recoveryUrl) URL.revokeObjectURL(recoveryUrl);
  recoveryUrl = undefined; pendingTake = undefined; $('recovery').hidden = true;
}
async function saveTake() {
  if (!pendingTake) return;
  const take = pendingTake;
  await saveEntries([take]); clearRecovery(); section = 'Recordings';
  $('source-filter').value = 'local';
  $('search').value = ''; $('tag-filter').value = ''; render();
  $('recording-status').textContent = 'Saved to Recordings. Ready for the next take.'; notify('Recording saved locally.');
}
$('retry-recording').onclick = () => operate(saveTake);
$('record').onclick = async () => {
  if (recordingPending || busy || pendingTake || !store) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { notify('Audio recording is unavailable. Use Chrome or Edge on HTTPS, or import an audio file.'); return; }
  recordingPending = true; controls(); notify(); $('recording-status').textContent = 'Waiting for microphone permission…';
  const chunks = [];
  const title = $('recording-title').value.trim() || `Recording ${new Date().toLocaleString('en')}`;
  let recordingError = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    player.pause();
    for (const player of document.querySelectorAll('audio')) player.pause();
    const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = (event) => { recordingError = event.error?.message || 'Audio capture failed'; notify(recordingError); if (recorder.state !== 'inactive') recorder.stop(); };
    recorder.onstop = async () => {
      const type = recorder.mimeType || chunks[0]?.type || 'audio/webm';
      stopTracks(); recorder = undefined; document.body.classList.remove('recording'); $('stop-recording').hidden = true; $('record').hidden = false;
      const audio = new Blob(chunks, { type });
      if (!audio.size) {
        recordingPending = false; controls(); notify('The recording contained no audio. Check your input and try again.'); $('recording-status').textContent = 'No audio was saved.'; return;
      }
      const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      pendingTake = makeEntry(audio, `recording-${new Date(recordingStarted).toISOString().replace(/[:.]/g, '-')}.${extension}`, title, 'Recordings');
      if (recordingError) pendingTake.notes = `Capture interrupted: ${recordingError}`;
      recoveryUrl = URL.createObjectURL(audio); $('recovery-player').src = recoveryUrl;
      $('recovery-download').href = recoveryUrl; $('recovery-download').download = pendingTake.fileName; $('recovery').hidden = false;
      recordingPending = false;
      await operate(saveTake);
      if (pendingTake) $('recording-status').textContent = 'Your take could not be saved. Download it or retry saving below.';
      else if (recordingError) notify(`Capture interrupted: ${recordingError}. The available audio was saved to Recordings.`);
      controls();
    };
    recorder.start(1000); recordingStarted = Date.now(); displayTime(); clock = setInterval(displayTime, 250);
    $('record').hidden = true; $('stop-recording').hidden = false; document.body.classList.add('recording');
    $('recording-status').textContent = 'Recording your input. Stop to save this take locally.'; controls();
  } catch (error) {
    stopTracks(); recorder = undefined; recordingPending = false; controls();
    $('recording-status').textContent = 'Recording did not start.';
    notify(`Could not start recording: ${error.message}. Check microphone permissions and your audio input.`);
  }
};
$('stop-recording').onclick = () => {
  if (recorder?.state === 'recording') { recorder.stop(); $('recording-status').textContent = 'Finishing and saving your take…'; controls(); }
};
window.addEventListener('beforeunload', (event) => {
  if (recordingPending || pendingTake || busy) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', stopTracks);
try {
  store = await openJournal(); entries = await store.all(); entries.forEach(validateEntry); render(); controls();
} catch (error) {
  store = undefined; controls(); $('storage-status').textContent = 'Local storage unavailable';
  notify(`Could not open the sound journal: ${error.message}. Allow browser storage and reload; no files have been imported.`);
}
