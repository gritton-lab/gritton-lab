/**
 * A measured mouse layer-5 pyramidal neuron (Allen Institute specimen 485574832) with
 * illustrative firing. The morphology is real; the activity is choreographed, not simulated.
 *
 * Most spikes stay local: a short flash around the soma, basal dendrites and axon that fades
 * within ~100 µm. Every few spikes one carries all the way up the apical trunk and lights the
 * whole tuft. Each event is a front travelling outward by path distance from the soma.
 *
 * Data (public/data/reconstructed-neuron.json): per segment, its 3D path (p, µm), diameter (d),
 * kind (soma | dend | apic | axon) and path distance from the soma (r, µm).
 */
type Point = [number, number, number];
interface Segment { p: Point[]; d: number; k: string; r: number }
interface Spike { t0: number; big: boolean }

const DATA_URL = '/data/reconstructed-neuron.json';

/** Local spikes: slow front, short reach, strength falling off quickly with distance. */
const LOCAL = { speed: 1400, width: 45, decay: 70, reach: 130, linger: 0.14 };
/** Spikes that climb the whole cell: faster front, full strength out to the tuft. */
const FULL = { speed: 3600, width: 110, linger: 0.28 };
/** Seconds between spikes, and how many local spikes come before each full one. */
const GAP: [number, number] = [0.3, 0.65];
const LOCAL_RUN: [number, number] = [2, 4];

export async function createReconstructedNeuron(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Wait until the figure is near the viewport before downloading the morphology.
  await new Promise<void>((resolve) => {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); resolve(); }
    }, { rootMargin: '400px 0px' });
    io.observe(root);
  });

  let geometry: Segment[];
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(res.statusText);
    geometry = (await res.json()).geometry;
  } catch {
    root.dataset.state = 'error';
    return;
  }

  const N = geometry.length;
  const points = geometry.flatMap((g) => g.p);
  const extent = (k: number) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))];
  const center = [0, 1, 2].map((k) => { const [lo, hi] = extent(k); return (lo + hi) / 2; });
  const [yLo, yHi] = extent(1);
  const span = yHi - yLo;
  const radius = Math.max(...points.map((p) => Math.hypot(p[0] - center[0], p[2] - center[2])));
  const maxReach = Math.max(...geometry.map((g) => g.r));

  const between = (a: number, b: number) => a + Math.random() * (b - a);
  const randInt = ([a, b]: [number, number]) => a + Math.floor(Math.random() * (b - a + 1));

  // ---------- firing ----------
  let clock = 0;
  let spikes: Spike[] = [];
  let nextAt = 0.3, untilFull = randInt(LOCAL_RUN);

  const schedule = () => {
    while (clock >= nextAt) {
      const big = untilFull <= 0;
      spikes.push({ t0: nextAt, big });
      untilFull = big ? randInt(LOCAL_RUN) : untilFull - 1;
      nextAt += between(...GAP) + (big ? 0.25 : 0);
    }
    spikes = spikes.filter((s) => clock - s.t0 < (s.big ? maxReach / FULL.speed + 0.8 : 0.6));
  };

  /** How lit a segment at path distance r is, `age` seconds after a spike. */
  const response = (r: number, kind: string, age: number, big: boolean) => {
    if (age < 0) return 0;
    if (big) {
      const front = FULL.speed * age, passed = age - r / FULL.speed;
      const wave = Math.exp(-(((r - front) / FULL.width) ** 2));
      const glow = passed > 0 ? 0.4 * Math.exp(-passed / FULL.linger) : 0;
      return (1 - 0.18 * (r / maxReach)) * Math.max(wave, glow);
    }
    if (kind === 'apic' && r > LOCAL.reach) return 0;
    const front = LOCAL.speed * age, passed = age - r / LOCAL.speed;
    const wave = Math.exp(-(((r - front) / LOCAL.width) ** 2));
    const glow = passed > 0 ? 0.35 * Math.exp(-passed / LOCAL.linger) : 0;
    return 0.85 * Math.exp(-r / LOCAL.decay) * Math.max(wave, glow);
  };

  const level = (i: number) => {
    const g = geometry[i];
    let lit = 0;
    for (const s of spikes) lit = Math.max(lit, response(g.r, g.k, clock - s.t0, s.big));
    return Math.min(1, lit);
  };

  // ---------- view ----------
  let yaw = between(-0.65, 0.65), pitch = between(-0.08, 0.08), zoom = 1, wobble = between(0, 100);
  let drift = between(-0.03, 0.03);
  let width = 1, height = 1, frame = 0, last = 0, manualUntil = 0;
  let visible = true, playing = !reduced.matches;
  let drag: [number, number] | null = null;

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
      const g = geometry[i], first = project(g.p[0]);
      const lit = level(i);
      const color = `${Math.round(132 + lit * 120)},${Math.round(175 + lit * 75)},${Math.round(207 + lit * 45)}`;
      ctx.strokeStyle = `rgba(${color},${0.62 + lit * 0.38})`;
      ctx.lineWidth = Math.max(1.1, Math.min(12, g.d * first[2] * 1.25));
      ctx.beginPath();
      ctx.moveTo(first[0], first[1]);
      for (let v = 1; v < g.p.length; v++) { const q = project(g.p[v]); ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
      if (lit > 0.12) { ctx.strokeStyle = `rgba(${color},${lit * 0.22})`; ctx.lineWidth += 5; ctx.stroke(); }
    }
  };

  const request = () => { if (!frame) frame = requestAnimationFrame(tick); };
  function tick(now: number) {
    frame = 0;
    const delta = last ? Math.min((now - last) / 1000, 0.08) : 0;
    last = now;
    const running = playing && visible && !document.hidden;
    if (running) {
      clock += delta;
      schedule();
      if (!drag && now > manualUntil) { yaw += delta * drift; wobble += delta; }
    }
    draw();
    if (running) request(); else last = 0;
  }

  /** Under reduced motion: a single still frame of a full spike halfway up the cell. */
  const showStill = () => {
    spikes = [{ t0: 0, big: true }];
    clock = (maxReach * 0.5) / FULL.speed;
  };
  if (!playing) showStill();

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    width = Math.max(1, box.width); height = Math.max(1, box.height);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    request();
  };

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
    if (e.key === ' ') { playing = !playing; last = 0; }
    if (e.key === 'ArrowLeft') yaw -= 0.15;
    if (e.key === 'ArrowRight') yaw += 0.15;
    if (e.key === 'ArrowUp') pitch = Math.max(-0.6, pitch - 0.1);
    if (e.key === 'ArrowDown') pitch = Math.min(0.6, pitch + 0.1);
    if (e.key === '+' || e.key === '=') zoom = Math.min(1.8, zoom + 0.1);
    if (e.key === '-') zoom = Math.max(0.6, zoom - 0.1);
    if (e.key === 'r' || e.key === 'R') { yaw = -0.15; pitch = 0; zoom = 1; }
    request();
  });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; request(); }).observe(root);
  document.addEventListener('visibilitychange', () => { last = 0; request(); });
  reduced.addEventListener('change', () => {
    playing = !reduced.matches;
    if (!playing) showStill();
    last = 0;
    request();
  });
  new ResizeObserver(resize).observe(canvas);

  root.dataset.state = 'ready';
  resize();
}
