import test from 'node:test';
import assert from 'node:assert/strict';
import { audioPeaks, timeLabel, visualProfiles } from '../journal-audio.js';

test('waveform peaks represent the entire sound and include both stereo channels', () => {
  assert.deepEqual(audioPeaks([new Float32Array([0, -.5, 0, 0]), new Float32Array([0, 0, .75, 0])], 2), [.5, .75]);
  assert.deepEqual(audioPeaks([new Float32Array(100)], 10), Array(10).fill(0));
  assert.deepEqual(audioPeaks([new Float32Array([.5])], 4), [.5, .5, .5, .5]);
  assert.throws(() => audioPeaks([]));
  assert.throws(() => audioPeaks([new Float32Array(0)]));
  assert.throws(() => audioPeaks([new Float32Array(10)], 0));
});
test('track timestamps and all six profiles have explicit dimensions', () => {
  assert.equal(timeLabel(65.8), '01:05');
  assert.equal(timeLabel(Infinity), '00:00');
  assert.equal(timeLabel(-1), '00:00');
  assert.equal(new Set(visualProfiles.map((profile) => profile.id)).size, 6);
  for (const family of ['2D', '3D', 'Creative']) assert.equal(visualProfiles.filter((profile) => profile.family === family).length, 2);
});
