import test from 'node:test';
import assert from 'node:assert/strict';
import { journalSections, validateEntry, filterEntries, decodeBackup } from '../journal-store.js';

const entry = (changes = {}) => ({ id: 'one', title: 'First sound', section: 'Sketches', notes: 'Tape texture',
  tags: ['guitar'], fileName: 'sound.wav', createdAt: 1, updatedAt: 1,
  audio: new Blob(['audio'], { type: 'audio/wav' }), ...changes });

test('journal sections and entry validation retain only valid audio and bounded metadata', () => {
  assert.deepEqual(journalSections, ['Released', 'Work in Progress', 'Sketches', 'Recordings']);
  assert.equal(validateEntry(entry()).id, 'one');
  for (const changes of [{ title: ' ' }, { section: 'Ideas' }, { audio: new Blob([]) }, { tags: [3] },
    { tags: Array(31).fill('tag') }, { createdAt: NaN }, { notes: 'a'.repeat(10001) },
    { fileName: 'file.txt', audio: new Blob(['text'], { type: 'text/plain' }) }]) {
    assert.throws(() => validateEntry(entry(changes)));
  }
});
test('journal filters combine section, text and tags without mutating the source', () => {
  const list = [entry(), entry({ id: 'two', title: 'Ambient', section: 'Released', createdAt: 2, tags: ['synth'] })];
  assert.deepEqual(filterEntries(list, { query: 'TAPE', tag: 'guitar', section: 'Sketches' }).map((item) => item.id), ['one']);
  assert.equal(filterEntries(list, { tag: 'guitar', section: 'Released' }).length, 0);
  assert.deepEqual(filterEntries(list).map((item) => item.id), ['two', 'one']);
  assert.deepEqual(filterEntries(list, { sort: 'oldest' }).map((item) => item.id), ['one', 'two']);
  assert.deepEqual(filterEntries(list, { sort: 'title' }).map((item) => item.id), ['two', 'one']);
  assert.equal(list[0].id, 'one');
});
test('backup validation rejects malformed, duplicate or incompatible entries before storing', async () => {
  const original = { ...entry(), audio: 'data:audio/wav;base64,YXVkaW8=' };
  const backup = (entries) => JSON.stringify({ format: 'midi-studio-sound-journal', version: 1, entries });
  const restored = decodeBackup(backup([original]));
  assert.equal(await restored[0].audio.text(), 'audio');
  for (const text of ['bad json', '{}', backup([original, original]), backup([{ ...original, audio: 'https://example.com/a.wav' }]),
    backup([{ ...original, section: 'Invalid' }]), backup([{ ...original, audio: 'data:audio/wav;base64,' }])]) {
    assert.throws(() => decodeBackup(text));
  }
});
