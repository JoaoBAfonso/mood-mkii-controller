export const journalSections = ['Released', 'Work in Progress', 'Sketches', 'Recordings'];
export const audioExtensions = /\.(wav|mp3|m4a|aac|ogg|oga|opus|flac|aiff|aif|webm)$/i;

export function validateEntry(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.id || typeof entry.title !== 'string' ||
      !entry.title.trim() || entry.title.length > 200 || !journalSections.includes(entry.section) ||
      typeof entry.notes !== 'string' || entry.notes.length > 10000 || !Array.isArray(entry.tags) ||
      entry.tags.length > 30 || entry.tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.length > 80) ||
      typeof entry.fileName !== 'string' || !entry.fileName || entry.fileName.length > 500 ||
      !Number.isFinite(entry.createdAt) || !Number.isFinite(entry.updatedAt) ||
      !(entry.audio instanceof Blob) || !entry.audio.size ||
      !(entry.audio.type.startsWith('audio/') || audioExtensions.test(entry.fileName))) {
    throw new Error('Invalid journal entry or audio file.');
  }
  return entry;
}

export function filterEntries(entries, { section = '', query = '', tag = '', sort = 'newest' } = {}) {
  const text = query.trim().toLowerCase();
  return entries.filter((entry) => (!section || entry.section === section) &&
    (!tag || entry.tags.includes(tag)) &&
    (!text || [entry.title, entry.notes, ...entry.tags].join(' ').toLowerCase().includes(text)))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'en') :
      sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
}

export function openJournal() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('midi-studio-sound-journal', 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Close other Sound Journal tabs and reload to open local storage.')); };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) { database.close(); return; }
      database.onversionchange = () => database.close();
      const transaction = (mode, operation) => new Promise((done, fail) => {
        let tx;
        try {
          tx = database.transaction('entries', mode);
          const result = operation(tx.objectStore('entries'));
          tx.oncomplete = () => done(result?.result);
          tx.onabort = () => fail(tx.error || new Error('Local storage transaction was aborted.'));
        } catch (error) { tx?.abort(); fail(error); }
      });
      resolve({
        all: () => transaction('readonly', (store) => store.getAll()),
        save: (entries) => {
          entries.forEach(validateEntry);
          return transaction('readwrite', (store) => { entries.forEach((entry) => store.put(entry)); });
        },
        remove: (id) => transaction('readwrite', (store) => store.delete(id)),
      });
    };
  });
}

export async function encodeBackup(entries) {
  const data = [];
  for (const entry of entries) {
    validateEntry(entry);
    const audio = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(entry.audio);
    });
    data.push({ ...entry, audio });
  }
  return JSON.stringify({ format: 'midi-studio-sound-journal', version: 1, entries: data });
}

export function decodeBackup(text) {
  const backup = JSON.parse(text);
  if (backup?.format !== 'midi-studio-sound-journal' || backup.version !== 1 || !Array.isArray(backup.entries)) {
    throw new Error('Choose a Sound Journal backup exported by this app.');
  }
  const ids = new Set();
  return backup.entries.map((entry) => {
    if (typeof entry.audio !== 'string') throw new Error('Backup contains missing audio.');
    const match = /^data:([^;,]*);base64,([A-Za-z0-9+/]*={0,2})$/.exec(entry.audio);
    if (!match) throw new Error('Backup contains invalid audio encoding.');
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    const decoded = validateEntry({ ...entry, audio: new Blob([bytes], { type: match[1] }) });
    if (ids.has(decoded.id)) throw new Error('Backup contains duplicate entry IDs.');
    ids.add(decoded.id);
    return decoded;
  });
}
