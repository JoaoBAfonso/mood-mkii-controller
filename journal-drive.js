import { audioExtensions, journalSections } from './journal-store.js?v=3.5.0';

export const driveScope = 'https://www.googleapis.com/auth/drive.readonly';
const apiRoot = 'https://www.googleapis.com/drive/v3/';
const folderType = 'application/vnd.google-apps.folder';
const fileFields = 'id,name,mimeType,size,createdTime,modifiedTime,version,capabilities(canDownload)';

export function driveFolderId(value) {
  const input = value.trim();
  if (/^[\w-]+$/.test(input)) return input;
  let url;
  try { url = new URL(input); } catch { throw new Error('Enter a Google Drive folder link or folder ID.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com') throw new Error('Use a folder link from drive.google.com.');
  const id = /\/folders\/([\w-]+)(?:\/|$)/.exec(url.pathname)?.[1];
  if (!id) throw new Error('Choose a Drive folder, not an individual file.');
  return id;
}

export function validateDriveSettings(clientId, folder) {
  const client = clientId.trim();
  if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(client)) throw new Error('Enter the Web application OAuth Client ID, not a client secret.');
  return { clientId: client, folderId: driveFolderId(folder) };
}

export function driveEntry(file, path) {
  if (!file || !/^[\w-]+$/.test(file.id || '') || typeof file.name !== 'string' || typeof file.mimeType !== 'string') {
    throw new Error('Drive returned invalid file metadata.');
  }
  if (file.mimeType.startsWith('application/vnd.google-apps.')) return undefined;
  if (!(file.mimeType.startsWith('audio/') || audioExtensions.test(file.name))) return undefined;
  const size = Number(file.size);
  if (!Number.isFinite(size) || size < 0) throw new Error(`Drive returned an invalid size for "${file.name}".`);
  if (!size) return undefined;
  const createdAt = Date.parse(file.createdTime);
  const updatedAt = Date.parse(file.modifiedTime);
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) throw new Error(`Drive returned invalid dates for "${file.name}".`);
  const section = path.find((name) => journalSections.some((section) => section.toLowerCase() === name.toLowerCase()));
  return {
    id: `drive:${file.id}`, driveId: file.id, source: 'drive', version: String(file.version || file.modifiedTime),
    title: file.name.replace(/\.[^.]+$/, '').slice(0, 200) || 'Untitled sound',
    section: journalSections.find((name) => name.toLowerCase() === section?.toLowerCase()) || 'Sketches',
    notes: '', tags: [], fileName: file.name, createdAt, updatedAt, size,
    mimeType: file.mimeType, path: path.join(' / '), canDownload: file.capabilities?.canDownload === true,
  };
}

export function createDriveClient({ token, signal, onUnauthorized, fetcher = globalThis.fetch }) {
  async function request(resource, parameters = {}) {
    const accessToken = token();
    const url = new URL(resource, apiRoot);
    url.search = new URLSearchParams(parameters).toString();
    const response = await fetcher(url.href, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal, cache: 'no-store', credentials: 'omit',
    });
    if (!response.ok) {
      if (response.status === 401) onUnauthorized();
      // Never echo response bodies: they can contain account or request details.
      const detail = response.status === 401 ? 'Your Drive session expired. Connect again.' :
        response.status === 403 ? 'Drive denied this request. Check the API, read permission, quota and file download restrictions.' :
          response.status === 404 ? 'This Drive file or folder is unavailable to the connected account.' :
            `Drive request failed (${response.status}). Try again.`;
      throw new Error(detail);
    }
    return response;
  }
  return {
    account: async () => (await (await request('about', { fields: 'user(displayName,emailAddress)' })).json()).user,
    async library(folderId) {
      folderId = driveFolderId(folderId);
      const root = await (await request(`files/${folderId}`, { fields: fileFields })).json();
      if (root.mimeType !== folderType) throw new Error('The selected Drive item is not a folder.');
      const folders = [{ id: folderId, path: [] }];
      const visited = new Set([folderId]);
      const entries = [];
      for (let index = 0; index < folders.length; index++) {
        const folder = folders[index];
        let pageToken;
        const pages = new Set();
        do {
          const parameters = {
            q: `'${folder.id}' in parents and trashed = false`, pageSize: '1000',
            fields: `nextPageToken,files(${fileFields})`,
          };
          if (pageToken) parameters.pageToken = pageToken;
          const result = await (await request('files', parameters)).json();
          if (!Array.isArray(result.files)) throw new Error('Drive returned an invalid folder listing.');
          for (const file of result.files) {
            if (file.mimeType === folderType) {
              if (!/^[\w-]+$/.test(file.id) || typeof file.name !== 'string') throw new Error('Drive returned an invalid subfolder.');
              if (!visited.has(file.id)) { visited.add(file.id); folders.push({ id: file.id, path: [...folder.path, file.name] }); }
            } else {
              const entry = driveEntry(file, folder.path);
              if (entry) entries.push(entry);
            }
          }
          pageToken = result.nextPageToken;
          if (pageToken && (typeof pageToken !== 'string' || pages.has(pageToken))) throw new Error('Drive returned invalid pagination.');
          if (pageToken) pages.add(pageToken);
        } while (pageToken);
      }
      return { name: root.name, entries };
    },
    async audio(entry) {
      if (!/^[\w-]+$/.test(entry.driveId || '')) throw new Error('Invalid Drive audio file ID.');
      if (!entry.canDownload) throw new Error('The owner has disabled downloads for this file.');
      const blob = await (await request(`files/${entry.driveId}`, { alt: 'media' })).blob();
      if (!blob.size) throw new Error('Drive returned an empty audio file.');
      return blob.type.startsWith('audio/') ? blob : new Blob([blob], { type: entry.mimeType });
    },
  };
}

let googleScript;
function loadGoogleIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve(globalThis.google.accounts.oauth2);
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
      const timer = setTimeout(() => fail('Google sign-in timed out. Check your connection or content blocker.'), 15000);
      function fail(message) {
        clearTimeout(timer); script.remove(); googleScript = undefined; reject(new Error(message));
      }
      script.onerror = () => fail('Could not load Google sign-in. Check your connection or content blocker.');
      script.onload = () => {
        clearTimeout(timer);
        if (!globalThis.google?.accounts?.oauth2) { fail('Google sign-in did not initialize.'); return; }
        resolve(globalThis.google.accounts.oauth2);
      };
      document.head.append(script);
    });
  }
  return googleScript;
}

export function createDriveSession({ changed }) {
  let oauth;
  let client;
  let accessToken;
  let expiry = 0;
  let timer;
  let controller;
  let generation = 0;
  let jobs = [];
  let activeJob;
  const pendingAudio = new Map();
  async function downloadNext() {
    if (activeJob || !jobs.length) return;
    const job = jobs.shift(); activeJob = job;
    try {
      if (job.generation !== generation) throw new DOMException('Drive session changed.', 'AbortError');
      const blob = await job.client.audio(job.entry);
      if (job.generation !== generation) throw new DOMException('Drive session changed.', 'AbortError');
      job.entry.audio = blob; job.resolve(blob);
    } catch (error) { job.reject(error); }
    finally {
      if (pendingAudio.get(job.key)?.job === job) pendingAudio.delete(job.key);
      activeJob = undefined; downloadNext();
    }
  }
  function clear(message = 'Drive disconnected. Session audio has been cleared.', pending = false) {
    generation++; clearTimeout(timer); controller?.abort();
    accessToken = undefined; expiry = 0; client = undefined;
    for (const job of jobs) job.reject(new DOMException('Drive session changed.', 'AbortError'));
    jobs = []; pendingAudio.clear(); changed({ connected: false, pending, message });
  }
  function token() {
    if (!accessToken || Date.now() >= expiry) {
      clear('Your Drive session expired. Connect again.'); throw new Error('Your Drive session expired. Connect again.');
    }
    return accessToken;
  }
  return {
    prepare: async () => { oauth = await loadGoogleIdentity(); },
    connect(clientId) {
      if (!oauth) throw new Error('Prepare Google sign-in first, then press Connect.');
      clear('Waiting for Google authorization…', true);
      const version = generation;
      timer = setTimeout(() => {
        if (version === generation) clear('Google authorization timed out. Connect again.');
      }, 120000);
      const oauthClient = oauth.initTokenClient({
        client_id: clientId, scope: driveScope, include_granted_scopes: false,
        callback: (response) => {
          if (version !== generation) return;
          if (response.error || !response.access_token || !oauth.hasGrantedAllScopes(response, driveScope) || !(Number(response.expires_in) > 0)) {
            clear('Drive access was not granted. Authorize read-only access and try again.'); return;
          }
          accessToken = response.access_token;
          clearTimeout(timer);
          expiry = Date.now() + Number(response.expires_in) * 1000;
          controller = new AbortController();
          client = createDriveClient({ token, signal: controller.signal, onUnauthorized: () => clear('Your Drive session expired. Connect again.') });
          timer = setTimeout(() => clear('Your Drive session expired. Connect again.'), Number(response.expires_in) * 1000);
          changed({ connected: true, message: 'Connected. Reading your selected folder…' });
        },
        error_callback: (error) => {
          if (version === generation) clear(error.type === 'popup_closed' ? 'Google sign-in was cancelled.' : 'Google sign-in could not open. Allow pop-ups and try again.');
        },
      });
      oauthClient.requestAccessToken({ prompt: 'select_account' });
    },
    async library(folderId) {
      const active = client; const version = generation;
      if (!active) throw new Error('Connect to Google Drive first.');
      const account = await active.account();
      const library = await active.library(folderId);
      if (version !== generation) throw new DOMException('Drive session changed.', 'AbortError');
      return { ...library, account };
    },
    audio(entry, { priority = false } = {}) {
      if (entry.audio) return Promise.resolve(entry.audio);
      if (!client) return Promise.reject(new Error('Connect to Google Drive first.'));
      const key = `${entry.id}:${entry.version}`;
      if (!pendingAudio.has(key)) {
        let job;
        const task = new Promise((resolve, reject) => {
          job = { key, entry, client, generation, resolve, reject };
        });
        pendingAudio.set(key, { task, job });
        if (priority) jobs.unshift(job); else jobs.push(job);
        downloadNext();
      } else if (priority) {
        const job = pendingAudio.get(key).job;
        const index = jobs.indexOf(job);
        if (index >= 0) { jobs.splice(index, 1); jobs.unshift(job); }
      }
      return pendingAudio.get(key).task;
    },
    async disconnect() {
      const previous = accessToken; clear();
      if (previous && oauth) {
        await new Promise((resolve, reject) => {
          const message = 'The local session was cleared, but Google could not revoke consent. Remove access in your Google Account connections.';
          const timeout = setTimeout(() => reject(new Error(message)), 15000);
          try {
            oauth.revoke(previous, (result) => {
              clearTimeout(timeout);
              if (result.successful) resolve(); else reject(new Error(message));
            });
          } catch (error) { clearTimeout(timeout); reject(new Error(`${message} ${error.message}`)); }
        });
      }
    },
    clear,
  };
}
