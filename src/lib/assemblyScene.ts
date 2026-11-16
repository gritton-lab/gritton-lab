/**
 * Stochastic neural assemblies — hundreds of neurons firing independently while random,
 * never-repeating groups (small, long, large, near or far apart) slowly drift into and
 * out of synchrony. Calcium-imaging look: fast flash, slow fade, nuclear-excluded somata.
 * Ported from Neuron HTML Mockups/04-stochastic-assemblies.html.
 */
export function createAssemblyScene(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const newButton = root.querySelector<HTMLButtonElement>('[data-assembly-new]');
  const hint = root.querySelector<HTMLElement>('[data-assembly-hint]');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const c = ctx;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- utilities ----------
  const TAU = Math.PI * 2;
  const rand = Math.random;
  const U = (a: number, b: number) => a + (b - a) * rand();
  const UI = (a: number, b: number) => Math.floor(U(a, b + 1));
  let spare: number | null = null;
  const gauss = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = rand();
    const v = rand(), m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(TAU * v);
    return m * Math.cos(TAU * v);
  };
  const expo = (mean: number) => -Math.log(1 - rand()) * mean;
  const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
  const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const wrapPi = (a: number) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const mk = (w: number, h: number) => { const e = document.createElement('canvas'); e.width = Math.max(1, w | 0); e.height = Math.max(1, h | 0); return e; };

  // Illinois blue tints and white, matching the site's panel palette.
  const glowC = [168, 205, 245], hotC = [255, 255, 255], dimC = [181, 200, 226], pilC = [117, 155, 209];
  const rgba = (col: number[], a: number) => `rgba(${col[0]},${col[1]},${col[2]},${a})`;

  // ---------- state ----------
  type Pt = { x: number; y: number; nx: number; ny: number; s: number; l: number };
  type Edge = { a: number; b: number; main: Path2D; twigs: Path2D };
  type Assembly = {
    id: number; kind: string; members: number[]; edges: Edge[];
    omega: number; phase: number; t: number; rise: number; hold: number; fall: number; peak: number; k: number; wave: number;
  };
  let W = 1, H = 1, DPR = 1;
  let rx0 = 0, ry0 = 0, rw = 1, rh = 1;          // region the tissue occupies
  let N = 0;
  let X = new Float32Array(0), Y = X, R = X, ANG = X, THETA = X, OMEGA = X, BG = X, AMP = X, TAUD = X, CA = X, F = X, BASE = X, SBAND = X, LAG = X, KN = X;
  let ASM = new Int32Array(0);
  let dendrites: Path2D[] = [];
  let curve: Pt[] = [];
  let assemblies: Assembly[] = [];
  let nextId = 1, spawnTimer = 1.2, inhib = 0;
  let staticLayer: HTMLCanvasElement | null = null;
  let sprites: { soma: HTMLCanvasElement; hot: HTMLCanvasElement; haze: HTMLCanvasElement } | null = null;
  let visible = false, frame: number | undefined, lastTime = 0;
  const SPEED = 4;   // everything (firing, calcium, assemblies) runs at this multiple of real time
  const animate = () => !reducedMotion.matches;

  // ---------- geometry ----------
  const bez = (p: number[][], t: number) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
  };
  function buildCurve() {
    const j = () => U(-0.07, 0.07);
    const tall = rw / rh < 1.25;
    // Normalised control points inside the region: a diagonal S on desktop, a sweep on mobile.
    const ctrl = tall
      ? [[0.88, -0.08], [0.12 + j(), 0.3 + j()], [0.95 + j(), 0.66 + j()], [0.28, 1.08]]
      : [[-0.06, 0.25 + j()], [0.3 + j(), 1.15 + j()], [0.68 + j(), -0.2 + j()], [1.06, 0.7 + j()]];
    const p = ctrl.map(([x, y]) => [rx0 + x * rw, ry0 + y * rh]);
    curve = [];
    let len = 0, prev: number[] | null = null;
    for (let i = 0; i <= 500; i++) {
      const q = bez(p, i / 500);
      if (prev) len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      curve.push({ x: q[0], y: q[1], l: len, nx: 0, ny: 0, s: 0 });
      prev = q;
    }
    curve.forEach((pt, i) => {
      const a = curve[Math.max(0, i - 1)], b = curve[Math.min(curve.length - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1;
      pt.nx = -dy / m; pt.ny = dx / m; pt.s = pt.l / len;
    });
  }
  const curveAt = (s: number) => {
    const f = clamp(s, 0, 1) * (curve.length - 1), i = Math.floor(f), t = f - i;
    const a = curve[i], b = curve[Math.min(curve.length - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: a.nx, ny: a.ny };
  };
  const nearestS = (x: number, y: number) => {
    let best = Infinity, bs = 0;
    for (let i = 0; i < curve.length; i += 3) {
      const d = (curve[i].x - x) ** 2 + (curve[i].y - y) ** 2;
      if (d < best) { best = d; bs = curve[i].s; }
    }
    return bs;
  };

  // ---------- tissue ----------
  function generate() {
    if (W < 700) { rx0 = 0; ry0 = 0; rw = W; rh = H * 0.46; }
    else { rx0 = W * 0.4; ry0 = 0; rw = W * 0.6; rh = H; }
    buildCurve();
    const area = rw * rh;
    const target = Math.round(clamp(area / 1000, 260, 1000));
    const unit = Math.sqrt(area) / 900;
    const rMean = clamp(4.8 * unit, 3, 6.5);
    const thick = Math.min(rw, rh) * 0.26;
    const gap = rMean * 1.0;
    const gridSize = rMean * 4.5, gw = Math.ceil(W / gridSize) + 2, gh = Math.ceil(H / gridSize) + 2;
    const grid: number[][] = Array.from({ length: gw * gh }, () => []);
    type P = { x: number; y: number; r: number; ang: number; s: number; band: boolean };
    const pts: P[] = [];
    const fits = (x: number, y: number, r: number) => {
      const gx = Math.floor(x / gridSize) + 1, gy = Math.floor(y / gridSize) + 1;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const cell = grid[(gy + oy) * gw + gx + ox]; if (!cell) continue;
        for (const k of cell) { const p = pts[k]; if ((p.x - x) ** 2 + (p.y - y) ** 2 < (p.r + r + gap) ** 2) return false; }
      }
      return true;
    };
    const put = (p: P) => { pts.push(p); grid[(Math.floor(p.y / gridSize) + 1) * gw + Math.floor(p.x / gridSize) + 1]?.push(pts.length - 1); };
    const inside = (x: number, y: number) => x > rx0 - 20 && x < rx0 + rw + 10 && y > ry0 - 10 && y < ry0 + rh + 10 && x > 0 && y > 0 && x < W && y < H;

    const bandTarget = Math.round(target * 0.8);
    let tries = 0;
    while (pts.length < bandTarget && tries++ < bandTarget * 40) {
      const s = rand(), cp = curveAt(s);
      const lt = thick * (0.75 + 0.35 * Math.sin(s * 9.1 + 1.3) + 0.15 * Math.sin(s * 23.7));
      const off = gauss() * lt * 0.36 + lt * 0.08 * Math.sin(s * 17);
      const x = cp.x + cp.nx * off + gauss() * 2, y = cp.y + cp.ny * off + gauss() * 2;
      if (!inside(x, y)) continue;
      const r = rMean * U(0.78, 1.25);
      if (!fits(x, y, r)) continue;
      put({ x, y, r, ang: Math.atan2(cp.ny, cp.nx) + gauss() * 0.28, s, band: true });
    }
    tries = 0;
    while (pts.length < target && tries++ < target * 40) {
      const x = U(rx0, rx0 + rw), y = U(ry0, ry0 + rh), r = rMean * U(0.7, 1.1);
      if (!inside(x, y) || !fits(x, y, r)) continue;
      put({ x, y, r, ang: U(0, TAU), s: nearestS(x, y), band: false });
    }

    N = pts.length;
    const f32 = () => new Float32Array(N);
    X = f32(); Y = f32(); R = f32(); ANG = f32(); THETA = f32(); OMEGA = f32(); BG = f32(); AMP = f32();
    TAUD = f32(); CA = f32(); F = f32(); BASE = f32(); SBAND = f32(); LAG = f32(); KN = f32();
    ASM = new Int32Array(N).fill(-1);
    dendrites = pts.map((p, i) => {
      X[i] = p.x; Y[i] = p.y; R[i] = p.r; ANG[i] = p.ang; SBAND[i] = p.s;
      THETA[i] = U(0, TAU);
      OMEGA[i] = TAU * U(0.18, 0.75);
      BG[i] = clamp(0.028 * Math.exp(0.85 * gauss()), 0.003, 0.4);   // heavy-tailed: most quiet, a few chatty
      AMP[i] = U(0.55, 1.25);
      TAUD[i] = U(0.55, 1.5);
      BASE[i] = U(0.05, 0.2);
      return makeDendrite(p, rMean);
    });
    assemblies = [];
    spawnTimer = 1.2;
    buildStatic();
  }

  function makeDendrite(p: { x: number; y: number; r: number; ang: number; band: boolean }, rMean: number) {
    const path = new Path2D();
    // Tortuous neurite: the heading kinks at every short stride and is only loosely tugged back
    // toward its course, so each process crinkles and wanders instead of running straight.
    const branch = (x: number, y: number, ang: number, len: number) => {
      const pts: number[][] = [[x, y, ang]];
      let a = ang + gauss() * 0.2, done = 0;
      path.moveTo(x, y);
      while (done < len) {
        const stride = Math.min(len - done + 0.01, rMean * U(0.35, 1.0));
        a += gauss() * 0.42 + wrapPi(ang - a) * 0.3;
        x += Math.cos(a) * stride; y += Math.sin(a) * stride;
        path.lineTo(x, y);
        pts.push([x, y, a]);
        done += stride;
      }
      return pts;
    };
    if (p.band) {
      const len = rMean * U(5, 11);
      const trunk = branch(p.x + Math.cos(p.ang) * p.r * 0.9, p.y + Math.sin(p.ang) * p.r * 0.9, p.ang, len);
      const [ex, ey, ea] = trunk[trunk.length - 1];
      if (rand() < 0.7) branch(ex, ey, ea + U(0.3, 0.7), len * U(0.3, 0.55));
      if (rand() < 0.7) branch(ex, ey, ea - U(0.3, 0.7), len * U(0.3, 0.55));
      // oblique branches leaving the apical trunk partway up
      for (let k = UI(0, 2); k > 0; k--) {
        const o = trunk[UI(1, Math.max(1, trunk.length - 2))];
        branch(o[0], o[1], o[2] + (rand() < 0.5 ? -1 : 1) * U(0.6, 1.2), len * U(0.18, 0.4));
      }
      for (let k = UI(1, 3); k > 0; k--) {
        const a = p.ang + Math.PI + U(-1.1, 1.1);
        branch(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r, a, rMean * U(1.6, 3.2));
      }
    } else {
      const nb = UI(3, 5);
      for (let k = 0; k < nb; k++) {
        const a = p.ang + (k / nb) * TAU + U(-0.4, 0.4);
        branch(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r, a, rMean * U(2, 4.5));
      }
    }
    return path;
  }

  // ---------- pre-rendered art ----------
  function radial(stops: [number, string][]) {
    const S = 96, e = mk(S, S), g2 = e.getContext('2d')!, g = g2.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    g2.fillStyle = g; g2.fillRect(0, 0, S, S);
    return e;
  }
  function buildStatic() {
    sprites = {
      // bright cytoplasm ring around a dimmer nucleus (GCaMP is nuclear-excluded)
      soma: radial([[0, rgba(glowC, 0.55)], [0.22, rgba(glowC, 0.75)], [0.36, rgba(glowC, 1)], [0.46, rgba(glowC, 0.55)], [0.62, rgba(glowC, 0.14)], [1, rgba(glowC, 0)]]),
      hot: radial([[0, rgba(hotC, 0.9)], [0.3, rgba(hotC, 0.7)], [0.5, rgba(hotC, 0.08)], [1, rgba(hotC, 0)]]),
      haze: radial([[0, rgba(pilC, 0.5)], [0.4, rgba(pilC, 0.16)], [1, rgba(pilC, 0)]]),
    };
    staticLayer = mk(W * DPR, H * DPR);
    const s = staticLayer.getContext('2d')!;
    s.setTransform(DPR, 0, 0, DPR, 0, 0);
    s.globalCompositeOperation = 'lighter';
    for (let i = 0; i < curve.length; i += 6) {
      const p = curve[i], rad = Math.min(rw, rh) * 0.2;
      const g = s.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, rgba(pilC, 0.02)); g.addColorStop(1, rgba(pilC, 0));
      s.fillStyle = g; s.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
    }
    s.lineCap = 'round';
    s.lineWidth = 0.9;
    for (let i = 0; i < N; i++) { s.strokeStyle = rgba(dimC, 0.05 + BASE[i] * 0.25); s.stroke(dendrites[i]); }
    s.globalCompositeOperation = 'source-over';
    for (let i = 0; i < N; i++) {
      const r = R[i];
      s.save(); s.translate(X[i], Y[i]); s.rotate(ANG[i]);
      s.beginPath(); s.ellipse(0, 0, r * 1.12, r * 0.92, 0, 0, TAU);
      s.fillStyle = rgba(dimC, 0.07 + BASE[i] * 0.55); s.fill();
      s.beginPath(); s.ellipse(-r * 0.05, 0, r * 0.55, r * 0.48, 0, 0, TAU);
      s.fillStyle = 'rgba(8,20,40,0.35)'; s.fill();
      s.restore();
    }
  }

  // ---------- assemblies ----------
  const freeIdx = () => { const a: number[] = []; for (let i = 0; i < N; i++) if (ASM[i] < 0) a.push(i); return a; };
  const localCluster = (cands: number[], cx: number, cy: number, n: number, sparsity: number) => {
    const sorted = cands.map((i) => [i, (X[i] - cx) ** 2 + (Y[i] - cy) ** 2]).sort((a, b) => a[1] - b[1]);
    const out: number[] = [];
    for (const [i] of sorted) { if (rand() > sparsity) out.push(i); if (out.length >= n) break; }
    return out;
  };
  const pickKind = () => { const r = rand(); return r < 0.34 ? 'small' : r < 0.58 ? 'distributed' : r < 0.84 ? 'long' : 'large'; };

  // Lightning-bolt links. Nothing here is a chord with noise on it: the route first doglegs away
  // from the direct line, then a leader zig-zags along it in sharp, uneven strides, throwing off
  // forked side branches as it goes — the way a stepped leader (or a real axon) finds its target.

  // One leader run: step toward the target, kinking hard to one side then the other.
  function jagged(x0: number, y0: number, x1: number, y1: number, step: number, kink: number) {
    const pts: number[][] = [[x0, y0]];
    let x = x0, y = y0, side = rand() < 0.5 ? -1 : 1;
    for (let guard = 0; guard < 300; guard++) {
      const dx = x1 - x, dy = y1 - y, left = Math.hypot(dx, dy);
      if (left < step * 1.25) break;
      if (rand() < 0.7) side = -side;                                     // mostly alternate, sometimes run on
      const dev = side * Math.min(1.2, kink * (0.3 + Math.abs(gauss()))); // never a gentle bend
      const len = Math.min(left * 0.75, step * U(0.4, 1.8));              // short stabs and long reaches
      const a = Math.atan2(dy, dx) + dev;
      x += Math.cos(a) * len; y += Math.sin(a) * len;
      pts.push([x, y]);
    }
    pts.push([x1, y1]);
    return pts;
  }
  function boltPoints(x0: number, y0: number, x1: number, y1: number, step: number, kink: number, wander: number) {
    // coarse route: one or two rounds of off-centre doglegs, so the whole bolt bows off the direct line
    let way: number[][] = [[x0, y0], [x1, y1]];
    const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    const passes = L > step * 14 ? 2 : 1;
    for (let pass = 0; pass < passes; pass++) {
      const next: number[][] = [way[0]];
      for (let i = 1; i < way.length; i++) {
        const ax = way[i - 1][0], ay = way[i - 1][1], bx = way[i][0], by = way[i][1];
        const sl = Math.hypot(bx - ax, by - ay) || 1;
        const off = (rand() < 0.5 ? -1 : 1) * sl * wander * U(0.45, 1) * (pass ? 0.7 : 1);
        const along = U(0.3, 0.7);
        next.push([ax + (bx - ax) * along - ((by - ay) / sl) * off, ay + (by - ay) * along + ((bx - ax) / sl) * off]);
        next.push(way[i]);
      }
      way = next;
    }
    // fine structure: a jagged leader between each pair of waypoints
    const pts: number[][] = [way[0]];
    for (let i = 1; i < way.length; i++) {
      const seg = jagged(way[i - 1][0], way[i - 1][1], way[i][0], way[i][1], step, kink);
      for (let k = 1; k < seg.length; k++) pts.push(seg[k]);
    }
    return pts;
  }
  function makeBolt(x0: number, y0: number, x1: number, y1: number, span: number) {
    const main = new Path2D(), twigs = new Path2D();
    const L = Math.hypot(x1 - x0, y1 - y0);
    const trace = (p: Path2D, pts: number[][]) => { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); };
    const step = clamp(L / 8, 3.2, Math.max(3.2, span * 0.011));
    const trunk = boltPoints(x0, y0, x1, y1, step, 0.62, 0.3);
    trace(main, trunk);
    // forks: every link gets at least one, longer links several; each leaves at an acute angle
    // in the direction of travel and may fork again
    const count = clamp(Math.round(L / (span * 0.03)) + UI(0, 1), 1, 8);
    const sprout = (pts: number[][], len: number, depth: number) => {
      if (pts.length < 3) return;
      const idx = UI(1, pts.length - 2);
      const px = pts[idx][0], py = pts[idx][1], q = pts[idx + 1];
      const dir = Math.atan2(q[1] - py, q[0] - px) + (rand() < 0.5 ? -1 : 1) * U(0.4, 1.05);
      const tw = boltPoints(px, py, px + Math.cos(dir) * len, py + Math.sin(dir) * len, Math.max(2.6, step * 0.7), 0.7, 0.22);
      trace(twigs, tw);
      if (depth > 0 && rand() < 0.6) sprout(tw, len * U(0.4, 0.65), depth - 1);
    };
    for (let k = 0; k < count; k++) sprout(trunk, clamp(L * U(0.14, 0.4), 7, Math.max(7, span * 0.06)), 2);
    return { main, twigs };
  }

  function buildEdges(m: number[], longRange: boolean) {
    const edges: Edge[] = [], n = m.length, seen = new Set<number>();
    const maxLen2 = (Math.min(rw, rh) * 0.13) ** 2;
    const add = (a: number, b: number) => {
      const key = a < b ? a * 100000 + b : b * 100000 + a;
      if (a === b || seen.has(key)) return; seen.add(key);
      edges.push({ a, b, ...makeBolt(X[a], Y[a], X[b], Y[b], Math.min(rw, rh)) });
    };
    const nn = n > 200 ? 1 : 2;
    for (let p = 0; p < n; p++) {
      const i = m[p], best: [number, number][] = [];
      for (let q = 0; q < n; q++) {
        if (q === p) continue;
        const d = (X[m[q]] - X[i]) ** 2 + (Y[m[q]] - Y[i]) ** 2;
        if (best.length < nn || d < best[best.length - 1][0]) { best.push([d, m[q]]); best.sort((x, y) => x[0] - y[0]); if (best.length > nn) best.pop(); }
      }
      for (const [d, j] of best) if (d < maxLen2 || longRange) add(i, j);
      if (longRange && rand() < 0.12) add(i, m[UI(0, n - 1)]);
    }
    return edges;
  }

  function spawnAssembly(forced?: { x: number; y: number }) {
    const free = freeIdx();
    if (free.length < 30) return;
    const kind = forced ? 'small' : pickKind();
    const pickCenter = () => free[UI(0, free.length - 1)];
    const span = Math.min(rw, rh);
    let members: number[] = [], wave = 0;

    if (kind === 'small') {
      const cc = pickCenter();
      const cx = forced ? forced.x : X[cc], cy = forced ? forced.y : Y[cc];
      members = localCluster(free, cx, cy, forced ? UI(10, 26) : UI(3, 16), U(0.05, 0.45));
    } else if (kind === 'distributed') {
      const k = UI(2, 4), centers: number[] = [];
      for (let guard = 0; centers.length < k && guard < 200; guard++) {
        const cc = pickCenter();
        if (centers.every((o) => Math.hypot(X[o] - X[cc], Y[o] - Y[cc]) > span * 0.35)) centers.push(cc);
      }
      const used = new Set<number>();
      for (const cc of centers) for (const i of localCluster(free.filter((f) => !used.has(f)), X[cc], Y[cc], UI(3, 14), U(0.1, 0.5))) used.add(i);
      for (let s = UI(0, 10); s > 0; s--) used.add(free[UI(0, free.length - 1)]);
      members = [...used];
    } else if (kind === 'long') {
      const len = U(0.12, 0.55), s0 = U(-0.05, 1 - len * 0.6), p = U(0.12, 0.5);
      const lane = rand() < 0.5 ? 0 : rand() < 0.5 ? -1 : 1;   // sometimes one side of the band only
      for (const i of free) {
        if (SBAND[i] < s0 || SBAND[i] > s0 + len) continue;
        if (lane) { const cp = curveAt(SBAND[i]); if (Math.sign((X[i] - cp.x) * cp.nx + (Y[i] - cp.y) * cp.ny) !== lane) continue; }
        if (rand() < p) members.push(i);
      }
      if (rand() < 0.55) wave = U(4, 14) * (rand() < 0.5 ? -1 : 1);   // traveling wave along the band
      if (members.length > 200) members = members.sort(() => rand() - 0.5).slice(0, 200);
      for (const i of members) LAG[i] = wave ? -wave * SBAND[i] : 0;
    } else {
      const cc = pickCenter(), Rr = span * U(0.18, 0.36), p = U(0.35, 0.75);
      for (const i of free) if (rand() < p * Math.exp(-((Math.hypot(X[i] - X[cc], Y[i] - Y[cc]) / Rr) ** 2))) members.push(i);
      if (rand() < 0.3) wave = U(3, 8);   // occasional radial wave
      for (const i of members) LAG[i] = wave ? -wave * Math.hypot(X[i] - X[cc], Y[i] - Y[cc]) / span : 0;
    }
    if (kind === 'small' || kind === 'distributed') for (const i of members) LAG[i] = 0;
    if (members.length < 2) return;

    const a: Assembly = {
      id: nextId++, kind, members, edges: buildEdges(members, kind === 'distributed'),
      omega: TAU * U(0.3, 0.85), phase: U(0, TAU), t: 0,
      rise: forced ? U(1.5, 3) : U(2.5, 8) * (kind === 'large' ? 1.4 : 1),
      hold: kind === 'small' ? U(2, 9) : U(3, 14),
      fall: U(2.5, 8), peak: forced ? 1 : U(0.65, 1), k: 0, wave,
    };
    for (const i of members) ASM[i] = a.id;
    assemblies.push(a);
  }

  function updateAssemblies(dt: number) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const busy = assemblies.reduce((n, a) => n + a.members.length, 0) / Math.max(1, N);
      if (assemblies.length < 6 && busy < 0.55) spawnAssembly();
      spawnTimer = expo(rand() < 0.2 ? 6 : 2.2);   // irregular: flurries and lulls
    }
    let drive = 0;
    for (const a of assemblies) drive += a.k * a.members.length;
    inhib = Math.min(0.7, (drive / Math.max(1, N)) * 2.5);
    for (let j = assemblies.length - 1; j >= 0; j--) {
      const a = assemblies[j];
      a.t += dt;
      a.phase += a.omega * dt;
      a.omega = clamp(a.omega + gauss() * 0.25 * Math.sqrt(dt), TAU * 0.2, TAU * 1.1);
      const k = a.t < a.rise ? smooth(a.t / a.rise) : a.t < a.rise + a.hold ? 1 : 1 - smooth((a.t - a.rise - a.hold) / a.fall);
      a.k = k * a.peak;
      if (a.t > a.rise + a.hold + a.fall) {
        for (const i of a.members) if (ASM[i] === a.id) ASM[i] = -1;
        assemblies.splice(j, 1);
      }
    }
  }

  const byId = new Map<number, Assembly>();
  function stepNeurons(dt: number) {
    byId.clear(); for (const a of assemblies) byId.set(a.id, a);
    const sq = Math.sqrt(dt);
    for (let i = 0; i < N; i++) {
      const a = ASM[i] >= 0 ? byId.get(ASM[i]) : undefined;
      const k = a ? a.k : 0;
      KN[i] = k;
      let w = OMEGA[i], noise = 1.5;
      if (a) {
        w += (a.omega - w) * k;                                                        // tempo entrains
        w += (0.4 + 3.6 * k) * k * Math.sin(wrapPi(a.phase + LAG[i] - THETA[i]));      // phase pulls in
        noise = 1.5 * (1 - 0.93 * k);
      }
      const quiet = a ? 1 : 1 - inhib;   // bystanders quiet down while big groups converge
      THETA[i] += w * dt + noise * sq * gauss();
      let spikes = 0;
      if (THETA[i] >= TAU) {
        THETA[i] -= TAU;
        if (rand() < (0.07 + 0.92 * k) * quiet) spikes += 1 + (k > 0.4 && rand() < k * 0.85 ? UI(1, 2) : 0);
      } else if (THETA[i] < 0) THETA[i] += TAU;
      if (rand() < BG[i] * (1 - 0.85 * k) * quiet * dt) spikes++;
      if (spikes) CA[i] += AMP[i] * (1 + 0.9 * k) * spikes;
      CA[i] *= Math.exp(-dt / (TAUD[i] * (1 - 0.45 * k)));
      const target = CA[i] / (CA[i] + 0.85);
      F[i] += (target - F[i]) * Math.min(1, dt / (target > F[i] ? 0.07 : 0.12));
    }
  }

  // ---------- render ----------
  function draw() {
    if (!staticLayer || !sprites) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(staticLayer, 0, 0);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const { soma, hot, haze } = sprites;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const f = F[i]; if (f < 0.05) continue;
      const s = R[i] * (11 + 7 * KN[i]);
      c.globalAlpha = f * (0.14 + 0.3 * KN[i]);
      c.drawImage(haze, X[i] - s, Y[i] - s, s * 2, s * 2);
    }
    c.lineCap = 'round';
    c.strokeStyle = rgba(glowC, 1);
    c.lineWidth = 1.1;
    for (let i = 0; i < N; i++) {
      const f = F[i]; if (f < 0.2) continue;
      c.globalAlpha = (f - 0.2) * 0.55;
      c.stroke(dendrites[i]);
    }
    for (let i = 0; i < N; i++) {
      const f = F[i]; if (f < 0.015) continue;
      const s = R[i] * 2.5;
      c.globalAlpha = Math.min(1, f * 1.35);
      c.drawImage(soma, X[i] - s, Y[i] - s, s * 2, s * 2);
      if (f > 0.45) {
        const h = R[i] * 1.5;
        c.globalAlpha = Math.min(1, (f - 0.45) * 1.8);
        c.drawImage(hot, X[i] - h, Y[i] - h, h * 2, h * 2);
      }
    }
    // synchrony links: light up between members firing together
    const glowStroke = rgba(glowC, 1), hotStroke = rgba(hotC, 1);
    c.miterLimit = 4;
    for (const a of assemblies) {
      if (a.k < 0.15) continue;
      const kk = Math.pow(a.k, 1.5);
      const lw = 0.8 + 0.6 * a.k;
      for (const e of a.edges) {
        const together = Math.min(F[e.a], F[e.b]);
        if (together < 0.12) continue;
        const al = kk * (together - 0.12) * 0.9;
        c.strokeStyle = glowStroke;
        c.lineJoin = 'round';
        c.globalAlpha = al * 0.22; c.lineWidth = lw * 3.2; c.stroke(e.main);   // soft glow
        c.lineJoin = 'miter';                                                  // keep every kink sharp
        c.globalAlpha = al; c.lineWidth = lw; c.stroke(e.main);
        c.globalAlpha = al * 0.85; c.lineWidth = lw * 0.7; c.stroke(e.twigs);
        c.strokeStyle = hotStroke;                                             // white-hot core
        c.globalAlpha = Math.min(1, al * 0.9); c.lineWidth = lw * 0.5; c.stroke(e.main);
      }
    }
    c.lineJoin = 'round';
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  // ---------- loop ----------
  const warm = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 30) { updateAssemblies(1 / 30); stepNeurons(1 / 30); } };
  const tick = (now: number) => {
    frame = undefined;
    if (!visible || document.hidden) { lastTime = 0; return; }
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    if (animate()) {
      const sim = dt * SPEED, steps = Math.max(1, Math.ceil(sim * 60)), h = sim / steps;
      for (let s = 0; s < steps; s++) { updateAssemblies(h); stepNeurons(h); }
    }
    draw();
    if (animate()) requestDraw(); else lastTime = 0;
  };
  const requestDraw = () => { if (frame === undefined && visible && !document.hidden) frame = requestAnimationFrame(tick); };

  const rebuild = () => { generate(); warm(8); requestDraw(); };
  const revealButton = () => {
    if (!newButton || !newButton.hidden) return;
    newButton.hidden = false;
    if (hint) hint.hidden = true;
  };

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (animate()) spawnAssembly({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    revealButton();
    requestDraw();
  });
  canvas.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { spawnAssembly({ x: rx0 + rw * U(0.3, 0.7), y: ry0 + rh * U(0.3, 0.7) }); revealButton(); requestDraw(); }
    else if ((event.key === 'n' || event.key === 'N') && newButton && !newButton.hidden) rebuild();
  });
  newButton?.addEventListener('click', rebuild);

  reducedMotion.addEventListener('change', () => { lastTime = 0; requestDraw(); });
  document.addEventListener('visibilitychange', () => { lastTime = 0; requestDraw(); });
  window.addEventListener('pagehide', () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; });
  window.addEventListener('pageshow', requestDraw);
  let resizeTimer: number | undefined, lastW = 0, lastH = 0;
  new ResizeObserver(() => {
    const w = root.clientWidth, h = root.clientHeight;
    if (w === lastW && Math.abs(h - lastH) < 80 && lastW) return;   // ignore mobile URL-bar jiggle
    lastW = w; lastH = h;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      W = w; H = h;
      DPR = Math.min(devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      rebuild();
    }, staticLayer ? 150 : 0);
  }).observe(root);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; lastTime = 0; requestDraw(); }).observe(root);
}
