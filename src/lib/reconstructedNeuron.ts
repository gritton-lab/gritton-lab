/**
 * A measured mouse layer-5 pyramidal neuron (Allen Institute specimen 485574832) replaying
 * membrane voltages precomputed in NEURON with the Allen all-active model 497232312.
 * Each branch is coloured by how far its own compartment has depolarised from rest; nothing
 * here is invented or shuffled — the renderer only interpolates between stored samples.
 *
 * Data (public/data): reconstructed-neuron.json holds the geometry and trial metadata;
 * reconstructed-neuron.bin holds uint8 voltages, voltage_mV = value / 2 - 100,
 * sample-major then segment, one block per trial.
 */
type Point = [number, number, number];
interface NeuronData {
  sampleMs: number;
  durationMs: number;
  segments: number;
  scenarios: { mode: string; samples: number }[];
  geometry: { p: Point[]; d: number }[];
}

const DATA_URL = '/data/reconstructed-neuron';
/** A moment just after the first somatic spike of the target trial, for the still frame. */
const STILL_MS = 177.5;

export async function createReconstructedNeuron(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Wait until the figure is close to the viewport before downloading ~160 kB of data.
  await new Promise<void>((resolve) => {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); resolve(); }
    }, { rootMargin: '400px 0px' });
    io.observe(root);
  });

  let data: NeuronData, bytes: Uint8Array;
  try {
    const [meta, bin] = await Promise.all([
      fetch(`${DATA_URL}.json`).then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
      fetch(`${DATA_URL}.bin`).then((r) => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); }),
    ]);
    data = meta; bytes = new Uint8Array(bin);
  } catch {
    root.dataset.state = 'error';
    return;
  }

  const N = data.segments;
  const offsets = data.scenarios.map((_, i) => data.scenarios.slice(0, i).reduce((sum, s) => sum + s.samples * N, 0));

  const points = data.geometry.flatMap((g) => g.p);
  const extent = (k: number) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))];
  const center = [0, 1, 2].map((k) => { const [lo, hi] = extent(k); return (lo + hi) / 2; });
  const [yLo, yHi] = extent(1);
  const span = yHi - yLo;
  const radius = Math.max(...points.map((p) => Math.hypot(p[0] - center[0], p[2] - center[2])));

  const between = (a: number, b: number) => a + Math.random() * (b - a);
  let selected = 0, time = STILL_MS;
  let playback = between(30, 48), nextPlayback = playback;
  let drift = between(-0.025, 0.025), nextDrift = drift;
  let yaw = between(-0.65, 0.65), pitch = between(-0.08, 0.08), zoom = 1, wobble = between(0, 100);
  let width = 1, height = 1, frame = 0, last = 0, manualUntil = 0;
  let visible = true, playing = !reduced.matches;
  let drag: [number, number] | null = null;

  const nextTrial = () => {
    // Always replay a complete computed trial; never mix voltages between trials.
    selected = Math.floor(Math.random() * data.scenarios.length);
    time = between(0, 55);
    nextPlayback = between(30, 48);
    nextDrift = between(-0.025, 0.025);
  };
  if (playing) { selected = Math.floor(Math.random() * data.scenarios.length); time = between(65, 110); }

  const voltage = (i: number, t: number) => {
    const s = data.scenarios[selected], base = offsets[selected];
    const a = Math.min(s.samples - 1, t / data.sampleMs), j = Math.floor(a), k = Math.min(j + 1, s.samples - 1), f = a - j;
    return (bytes[base + j * N + i] * (1 - f) + bytes[base + k * N + i] * f) / 2 - 100;
  };

  const project = (p: Point): [number, number, number] => {
    const x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
    const xx = x * Math.cos(yaw) - z * Math.sin(yaw), zz = x * Math.sin(yaw) + z * Math.cos(yaw);
    const viewPitch = pitch + (playing ? 0.025 * Math.sin(wobble * 0.13) : 0);
    const yy = y * Math.cos(viewPitch) - zz * Math.sin(viewPitch);
    const scale = Math.min((height * 0.9) / span, (width * 0.86) / (2 * radius)) * zoom;
    return [width * 0.5 + xx * scale, height * 0.5 + yy * scale, scale];
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < N; i++) {
      const g = data.geometry[i], first = project(g.p[0]);
      const level = Math.max(0, Math.min(1, (voltage(i, time) - voltage(i, 0)) / 65));
      const color = `${Math.round(132 + level * 120)},${Math.round(175 + level * 75)},${Math.round(207 + level * 45)}`;
      ctx.strokeStyle = `rgba(${color},${0.48 + level * 0.52})`;
      ctx.lineWidth = Math.max(0.8, Math.min(12, g.d * first[2]));
      ctx.beginPath();
      ctx.moveTo(first[0], first[1]);
      for (let v = 1; v < g.p.length; v++) { const q = project(g.p[v]); ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
      if (level > 0.12) { ctx.strokeStyle = `rgba(${color},${level * 0.18})`; ctx.lineWidth += 5; ctx.stroke(); }
    }
  };

  const request = () => { if (!frame) frame = requestAnimationFrame(tick); };
  function tick(now: number) {
    frame = 0;
    const delta = last ? Math.min((now - last) / 1000, 0.08) : 0;
    last = now;
    const running = playing && visible && !document.hidden;
    if (running) {
      playback += (nextPlayback - playback) * (1 - Math.exp(-delta * 0.6));
      drift += (nextDrift - drift) * (1 - Math.exp(-delta * 0.5));
      time += delta * playback;
      if (time >= data.durationMs) nextTrial();
      if (!drag && now > manualUntil) { yaw += delta * drift; wobble += delta; }
    }
    draw();
    if (running) request(); else last = 0;
  }

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    request();
  };

  const syncButton = () => {
    const button = root.querySelector<HTMLButtonElement>('[data-neuron-toggle]');
    if (!button) return;
    button.setAttribute('aria-pressed', String(!playing));
    button.textContent = playing ? 'Pause' : 'Play';
  };
  const toggle = () => { playing = !playing; last = 0; syncButton(); request(); };

  canvas.addEventListener('pointerdown', (e) => {
    manualUntil = performance.now() + 6000;
    drag = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw += (e.clientX - drag[0]) * 0.007;
    pitch = Math.max(-0.6, Math.min(0.6, pitch + (e.clientY - drag[1]) * 0.003));
    drag = [e.clientX, e.clientY];
    request();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(type, () => { drag = null; manualUntil = performance.now() + 6000; });

  canvas.addEventListener('keydown', (e) => {
    const keys = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    manualUntil = performance.now() + 6000;
    if (e.key === ' ') return toggle();
    if (e.key === 'ArrowLeft') yaw -= 0.15;
    if (e.key === 'ArrowRight') yaw += 0.15;
    if (e.key === 'ArrowUp') pitch = Math.max(-0.6, pitch - 0.1);
    if (e.key === 'ArrowDown') pitch = Math.min(0.6, pitch + 0.1);
    if (e.key === '+' || e.key === '=') zoom = Math.min(1.8, zoom + 0.1);
    if (e.key === '-') zoom = Math.max(0.6, zoom - 0.1);
    if (e.key === 'r' || e.key === 'R') { yaw = -0.15; pitch = 0; zoom = 1; }
    request();
  });
  root.querySelector('[data-neuron-toggle]')?.addEventListener('click', toggle);

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; request(); }).observe(root);
  document.addEventListener('visibilitychange', () => { last = 0; request(); });
  reduced.addEventListener('change', () => { playing = !reduced.matches; last = 0; syncButton(); request(); });
  new ResizeObserver(resize).observe(canvas);

  root.dataset.state = 'ready';
  syncButton();
  resize();
}
