/**
 * Motion for the three band artworks (440 x 280 artwork space).
 *
 *   signals     five traces, each at its own frequency, fall into step as they pass the marker
 *   disruption  five traces in step break into rough, unequal rhythms after the marker, and
 *               every few seconds a shock leaves the marker and rides downstream
 *   network     signals travel the links at their own pace; nodes light as each one lands,
 *               and the hub ripples whenever one reaches it
 *
 * The same functions draw the still frame at build time (t = 0) and every animated frame in
 * the browser, so the page looks right before the script runs and under reduced motion.
 */
import { TAU, animateWhileVisible, ease, frac, ringAt as ring } from './motion';

export type BandVariant = 'network' | 'signals' | 'disruption';
export type TraceVariant = Exclude<BandVariant, 'network'>;
/** Every artwork a band can show; the last four live in their own modules (bandRaster, bandAttention, bandField, bandOrbits). */
export type ArtworkVariant = BandVariant | 'raster' | 'attention' | 'field' | 'orbits';

// ---------- signals and disruption ----------
/** Resting height of each trace. */
export const BAND_ROWS = [58, 98, 138, 178, 218];
/** Centre and radius of the icon the traces pass through. */
export const BAND_MARKER = { x: 220, y: 140, r: 22 };

const WIDTH = 440, STEPS = 221, DX = WIDTH / (STEPS - 1);
const FLOW = 48;                                   // how fast the waves travel, in artwork units per second
const UNISON = { k: 0.045, amp: 14 };              // the one wave every trace shares while in step
const UNISON_PERIOD = TAU / (UNISON.k * FLOW);     // seconds between its crests at any one point
const SHOCK_EVERY = 3.6, SHOCK_SPEED = 130;        // disruption: seconds between shocks, and how fast each travels

// signals, before the marker: spatial frequency, pace relative to FLOW, amplitude, phase.
const FREE = [
  { k: 0.068, pace: 1.1, amp: 15, ph: 0.4 },
  { k: 0.039, pace: 0.9, amp: 17, ph: 2.1 },
  { k: 0.057, pace: 1.0, amp: 16, ph: 3.9 },
  { k: 0.081, pace: 1.18, amp: 14, ph: 5.2 },
  { k: 0.047, pace: 0.94, amp: 17, ph: 1.3 },
];
// disruption, after the marker: two unrelated rhythms per trace (a and c), plus how hard a
// passing shock shakes it (g). Alternate traces are overdriven and damped.
const ROUGH = [
  { a: 7, k: 0.083, p: 1.25, ph: 0.8, c: 4, q: 0.151, w: 0.7, r: 2.0, g: 7 },
  { a: 19, k: 0.052, p: 0.85, ph: 2.6, c: 5, q: 0.117, w: 1.4, r: 0.3, g: 9 },
  { a: 8, k: 0.097, p: 1.1, ph: 4.4, c: 4, q: 0.171, w: 0.6, r: 5.1, g: 8 },
  { a: 18, k: 0.061, p: 1.3, ph: 1.1, c: 6, q: 0.133, w: 0.8, r: 3.3, g: 9 },
  { a: 8, k: 0.074, p: 0.9, ph: 5.7, c: 5, q: 0.159, w: 1.5, r: 1.2, g: 7 },
];

const unison = (x: number, t: number) => UNISON.amp * Math.sin(UNISON.k * (x - FLOW * t));

/** How far trace `index` sits from its row at position x and time t (seconds). */
function displacement(variant: TraceVariant, index: number, x: number, t: number) {
  if (variant === 'signals') {
    const w = FREE[index], inStep = ease((x - 150) / 150);
    return (1 - inStep) * w.amp * Math.sin(w.k * (x - FLOW * w.pace * t) + w.ph) + inStep * unison(x, t);
  }
  const broken = ease((x - 205) / 125);
  if (broken === 0) return unison(x, t);
  const w = ROUGH[index], d = x - (BAND_MARKER.x + SHOCK_SPEED * (t % SHOCK_EVERY));
  const rough = w.a * Math.sin(w.k * (x - FLOW * w.p * t) + w.ph) + w.c * Math.sin(w.q * (x - FLOW * w.w * t) + w.r)
    + w.g * Math.exp(-((d / 30) ** 2)) * Math.sin(0.28 * d + index);
  return (1 - broken) * unison(x, t) + broken * rough;
}

/** The `points` attribute for one trace at time t. */
export function bandTracePoints(variant: TraceVariant, index: number, t: number) {
  let out = '';
  for (let step = 0; step < STEPS; step++) {
    const x = step * DX;
    out += `${step ? ' ' : ''}${x.toFixed(1)},${(BAND_ROWS[index] + displacement(variant, index, x, t)).toFixed(1)}`;
  }
  return out;
}

/** The icon's ring and the nudge the icon itself takes: once per shared crest, or once per shock. */
function markerPulse(variant: TraceVariant, t: number) {
  const { x, y, r } = BAND_MARKER;
  if (variant === 'signals') {
    const age = t % UNISON_PERIOD, wave = ring(age, 1.4);
    return { radius: r + 20 * wave.open, alpha: 0.5 * wave.alpha, icon: `translate(${(3 * Math.exp(-age * 5)).toFixed(2)} 0)` };
  }
  const age = t % SHOCK_EVERY, wave = ring(age, 1.2);
  const kick = (1 + 0.9 * Math.exp(-age * 7)).toFixed(3);
  return { radius: r + 28 * wave.open, alpha: 0.65 * wave.alpha, icon: `translate(${x} ${y}) scale(1 ${kick}) translate(${-x} ${-y})` };
}

// ---------- network ----------
export const NET_HUB = 3;
export const NET_NODES = [
  { x: 52, y: 86, r: 5 }, { x: 100, y: 205, r: 6 }, { x: 185, y: 52, r: 4 }, { x: 222, y: 146, r: 9 },
  { x: 296, y: 225, r: 4 }, { x: 371, y: 83, r: 6 }, { x: 397, y: 194, r: 5 },
];
/**
 * Each link runs from node `a` to node `b`. A signal crosses a → b, rests, crosses back b → a,
 * rests, and repeats every `period` seconds, starting `lead` of the way through that cycle.
 * The first six links pass through the hub; the last four join outer nodes and run quieter.
 */
export const NET_LINKS = [
  { d: 'M52 86C110 68 145 127 222 146', a: 0, b: 3, period: 3.4, lead: 0.0 },
  { d: 'M100 205C151 209 167 159 222 146', a: 1, b: 3, period: 4.3, lead: 0.55 },
  { d: 'M185 52C222 72 193 111 222 146', a: 2, b: 3, period: 2.9, lead: 0.3 },
  { d: 'M222 146C266 137 307 61 371 83', a: 3, b: 5, period: 3.8, lead: 0.8 },
  { d: 'M222 146C271 156 255 217 296 225', a: 3, b: 4, period: 4.9, lead: 0.15 },
  { d: 'M222 146C287 186 334 161 397 194', a: 3, b: 6, period: 3.1, lead: 0.65 },
  { d: 'M52 86C52 146 116 134 100 205', a: 0, b: 1, period: 7.1, lead: 0.4 },
  { d: 'M185 52C258 13 345 27 371 83', a: 2, b: 5, period: 8.3, lead: 0.9 },
  { d: 'M296 225C336 251 382 243 397 194', a: 4, b: 6, period: 6.4, lead: 0.2 },
  { d: 'M371 83C409 102 358 156 397 194', a: 5, b: 6, period: 9.2, lead: 0.7 },
];
export const NET_PRIMARY = 6;
/** Length of the travelling signal as a fraction of its link. */
export const signalLength = (link: number) => (link < NET_PRIMARY ? 0.1 : 0.07);

const TRIP = 0.4;   // share of a link's cycle that one crossing takes

/** Where a link's signal is (0 at `a`, 1 at `b`, or -1 while resting) and how long ago it last landed at each end. */
function linkState(link: (typeof NET_LINKS)[number], t: number) {
  const u = frac(t / link.period + link.lead);
  const pos = u < TRIP ? ease(u / TRIP) : u >= 0.5 && u < 0.5 + TRIP ? 1 - ease((u - 0.5) / TRIP) : -1;
  return {
    pos,
    sinceB: (u >= TRIP ? u - TRIP : u + 1 - TRIP) * link.period,
    sinceA: (u >= 0.5 + TRIP ? u - 0.5 - TRIP : u + 0.5 - TRIP) * link.period,
  };
}

// ---------- in the browser ----------
export function startBandArtwork(root: HTMLElement) {
  const variant = root.dataset.bandArtwork as BandVariant;
  const all = <T extends Element>(selector: string) => [...root.querySelectorAll<T>(selector)];

  if (variant !== 'network') {
    const traces = all<SVGPolylineElement>('[data-band-trace]');
    const pulse = root.querySelector('[data-band-pulse]'), icon = root.querySelector('[data-band-icon]');
    if (!traces.length) return;
    animateWhileVisible(root, (t) => {
      traces.forEach((trace, i) => trace.setAttribute('points', bandTracePoints(variant, i, t)));
      const m = markerPulse(variant, t);
      pulse?.setAttribute('r', m.radius.toFixed(1));
      pulse?.setAttribute('stroke-opacity', m.alpha.toFixed(3));
      icon?.setAttribute('transform', m.icon);
    });
    return;
  }

  const signals = all<SVGGElement>('[data-band-signal]'), ripples = all<SVGCircleElement>('[data-band-ripple]');
  const halos = all<SVGCircleElement>('[data-band-halo]'), cores = all<SVGCircleElement>('[data-band-core]');
  if (signals.length !== NET_LINKS.length) return;
  const glow = new Float32Array(NET_NODES.length);
  animateWhileVisible(root, (t) => {
    glow.fill(0);
    NET_LINKS.forEach((link, j) => {
      const s = linkState(link, t), length = signalLength(j), primary = j < NET_PRIMARY;
      signals[j].setAttribute('opacity', s.pos < 0 ? '0' : primary ? '1' : '0.55');
      // the dash starts fully behind one node and ends fully behind the other
      if (s.pos >= 0) signals[j].setAttribute('stroke-dashoffset', (length - s.pos * (1 + length)).toFixed(4));
      glow[link.a] = Math.max(glow[link.a], Math.exp(-s.sinceA / 0.45));
      glow[link.b] = Math.max(glow[link.b], Math.exp(-s.sinceB / 0.45));
      if (primary && ripples[j]) {
        const wave = ring(link.a === NET_HUB ? s.sinceA : s.sinceB, 1.3);
        ripples[j].setAttribute('r', (12 + 34 * wave.open).toFixed(1));
        ripples[j].setAttribute('stroke-opacity', (0.45 * wave.alpha).toFixed(3));
      }
    });
    NET_NODES.forEach((node, n) => {
      halos[n]?.setAttribute('r', (node.r + 7 + 7 * glow[n]).toFixed(1));
      halos[n]?.setAttribute('fill-opacity', (0.06 + 0.3 * glow[n]).toFixed(3));
      cores[n]?.setAttribute('r', (2 + 1.2 * glow[n]).toFixed(2));
    });
  });
}
