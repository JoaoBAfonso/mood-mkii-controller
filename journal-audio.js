export const visualProfiles = [
  { id: 'spectrum', name: 'Spectrum bars', family: '2D' },
  { id: 'scope', name: 'Oscilloscope', family: '2D' },
  { id: 'terrain', name: 'Spectral terrain', family: '3D' },
  { id: 'orbit', name: 'Orbital sculpture', family: '3D' },
  { id: 'ribbons', name: 'Liquid ribbons', family: 'Creative' },
  { id: 'prism', name: 'Prismatic bloom', family: 'Creative' },
];

export function audioPeaks(channels, count = 100) {
  if (!channels.length || !Number.isInteger(count) || count < 1) throw new Error('Invalid waveform input.');
  const length = channels[0].length;
  if (!length || channels.some((channel) => channel.length !== length)) throw new Error('Invalid audio channel lengths.');
  const peaks = new Array(count).fill(0);
  for (let bar = 0; bar < count; bar++) {
    const first = Math.floor(bar * length / count);
    const last = Math.max(first + 1, Math.floor((bar + 1) * length / count));
    for (const channel of channels) {
      for (let index = first; index < Math.min(last, length); index++) {
        peaks[bar] = Math.max(peaks[bar], Math.abs(channel[index]));
      }
    }
  }
  return peaks;
}

export function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function drawWaveform(canvas, peaks, progress = 0) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * scale); canvas.height = Math.round(rect.height * scale);
  const context = canvas.getContext('2d');
  context.scale(scale, scale);
  const { width, height } = rect;
  const step = width / peaks.length;
  for (const [index, peak] of peaks.entries()) {
    context.fillStyle = index / peaks.length < progress ? '#ff782d' : '#798391';
    const barHeight = Math.max(1, Math.min(1, peak) * (height - 8));
    context.fillRect(index * step + 1, (height - barHeight) / 2, Math.max(1, step - 2), barHeight);
  }
  if (progress > 0) {
    context.fillStyle = '#ffe2c9'; context.fillRect(progress * width, 0, 1, height);
  }
}

export function createAudioAnalysis() {
  let context;
  let chain = Promise.resolve();
  const cache = new WeakMap();
  function getContext() {
    if (!context) {
      const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Constructor) throw new Error('Web Audio is unavailable in this browser.');
      context = new Constructor();
    }
    return context;
  }
  return {
    context: getContext,
    peaks(blob) {
      if (!cache.has(blob)) {
        const task = chain.then(async () => {
          const decoded = await getContext().decodeAudioData(await blob.arrayBuffer());
          const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
          return { peaks: audioPeaks(channels), duration: decoded.duration };
        });
        // Keep subsequent independent files analysable after a failed decode.
        chain = task.then(() => undefined, () => undefined);
        cache.set(blob, task);
      }
      return cache.get(blob);
    },
  };
}

export function createVisualizer(canvas, analyser, profile, playing) {
  const context = canvas.getContext('2d');
  const bins = new Uint8Array(analyser.frequencyBinCount);
  const wave = new Uint8Array(analyser.fftSize);
  const history = [];
  let frame;
  let stopped = false;
  let ticks = 0;
  let lastTime = 0;
  function draw(timestamp) {
    if (stopped) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden || timestamp - lastTime < 33) return;
    lastTime = timestamp;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * scale) || canvas.height !== Math.round(height * scale)) {
      canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    }
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = '#0e1219'; context.fillRect(0, 0, width, height);
    analyser.getByteFrequencyData(bins); analyser.getByteTimeDomainData(wave);
    const levels = Array.from({ length: 48 }, (_, index) => {
      const start = Math.floor((index / 48) ** 2 * bins.length);
      const end = Math.max(start + 1, Math.floor(((index + 1) / 48) ** 2 * bins.length));
      let peak = 0;
      for (let bin = start; bin < end; bin++) peak = Math.max(peak, bins[bin]);
      return peak / 255;
    });
    if (playing() && !matchMedia('(prefers-reduced-motion: reduce)').matches) ticks += .015;
    const mode = profile();
    const energy = levels.reduce((total, value) => total + value, 0) / levels.length;
    context.lineWidth = 1.5;
    if (mode === 'spectrum') {
      for (const [index, value] of levels.entries()) {
        const x = index * width / 48;
        const bar = value * height * .8;
        const gradient = context.createLinearGradient(0, height, 0, height - Math.max(1, bar));
        gradient.addColorStop(0, '#ff782d'); gradient.addColorStop(1, '#ffe0b7');
        context.fillStyle = gradient; context.fillRect(x + 2, height - 20 - bar, Math.max(1, width / 48 - 4), Math.max(1, bar));
      }
    } else if (mode === 'scope') {
      context.strokeStyle = '#ffad64'; context.beginPath();
      for (let index = 0; index < wave.length; index++) {
        const x = index / (wave.length - 1) * width;
        const y = height / 2 + (wave[index] / 128 - 1) * height * .4;
        if (!index) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    } else if (mode === 'terrain' || mode === 'orbit') {
      if (playing()) { history.unshift(levels); if (history.length > 32) history.pop(); }
      const project = (x, y, z) => {
        const angle = mode === 'orbit' ? ticks : -.28;
        const rx = x * Math.cos(angle) + z * Math.sin(angle);
        const rz = z * Math.cos(angle) - x * Math.sin(angle);
        const perspective = 3 / (4 + rz);
        return [width / 2 + rx * width * .36 * perspective, height * .65 + (y + rz * .28) * height * .4 * perspective];
      };
      const rows = mode === 'terrain' ? history : [levels];
      rows.forEach((row, depth) => {
        context.strokeStyle = `hsla(${25 + depth},95%,${70 - depth}%,${1 - depth / 40})`; context.beginPath();
        row.forEach((value, index) => {
          const angle = index / (row.length - 1) * Math.PI * 2;
          const point = mode === 'terrain' ? project(index / 47 * 2 - 1, -value, depth / 16 - 1) :
            project(Math.cos(angle) * (1 + value * .4), -value * .8, Math.sin(angle));
          if (!index) context.moveTo(...point); else context.lineTo(...point);
          if (mode === 'orbit') {
            const base = project(Math.cos(angle), .3, Math.sin(angle));
            context.moveTo(...base); context.lineTo(...point);
          }
        });
        context.stroke();
      });
    } else {
      const petals = mode === 'prism' ? 12 : 6;
      context.save(); context.translate(width / 2, height / 2);
      for (let petal = 0; petal < petals; petal++) {
        context.save(); context.rotate(petal / petals * Math.PI * 2 + ticks * .15);
        context.strokeStyle = `hsla(${18 + petal * 9},95%,${60 + energy * 25}%,.8)`;
        context.beginPath();
        for (let index = 0; index < 96; index++) {
          const value = (wave[Math.floor(index / 96 * wave.length)] / 128 - 1);
          const t = index / 95;
          const x = (t - .5) * Math.min(width, height) * .8;
          const y = mode === 'ribbons' ? Math.sin(t * Math.PI * 4 + ticks) * energy * height * .16 + value * height * .2 :
            Math.sin(t * Math.PI) * (energy * height * .3 + value * height * .2);
          if (!index) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.stroke(); context.restore();
      }
      context.restore();
    }
    canvas.dataset.profile = mode;
  }
  frame = requestAnimationFrame(draw);
  return () => { stopped = true; cancelAnimationFrame(frame); };
}
