/**
 * "Thousands of cells. One precise moment." — seven traces, each oscillating at its own
 * frequency, flow toward a marker and merge there into a single shared wave.
 *
 * The same functions draw the still frame at build time (t = 0) and every animated frame in
 * the browser, so the page looks right before the script runs and under reduced motion.
 */
import { animateWhileVisible } from './motion';

export const VIEW = { w: 480, h: 330 };
/** Resting height of each trace; the grid lines sit on the same rows. */
export const ROWS = [54, 92, 130, 168, 206, 244, 282];
/** The x position where every trace has fully joined the shared wave. */
export const MARKER_X = 351;

const STEPS = 151, DX = VIEW.w / (STEPS - 1);
const BLEND_START = 175;   // traces run free up to here, then ease into the shared wave by MARKER_X
const FLOW = 52;           // how fast the waves travel toward the marker, in viewBox units per second

// One entry per trace: spatial frequency (radians per unit), how much faster or slower than
// FLOW it travels, amplitude, and starting phase. No two share a wavelength or a tempo.
const TRACES = [
  { k: 0.074, pace: 1.08, amp: 11, phase: 0.0 },
  { k: 0.047, pace: 0.92, amp: 13, phase: 1.7 },
  { k: 0.062, pace: 1.0, amp: 12, phase: 3.4 },
  { k: 0.039, pace: 0.88, amp: 14, phase: 5.1 },
  { k: 0.068, pace: 1.12, amp: 12, phase: 6.8 },
  { k: 0.051, pace: 0.96, amp: 13, phase: 8.5 },
  { k: 0.083, pace: 1.16, amp: 11, phase: 10.2 },
];
const SHARED = { k: 0.043, amp: 43, mid: 168 };

const ease = (s: number) => { s = s < 0 ? 0 : s > 1 ? 1 : s; return s * s * (3 - 2 * s); };

/** Height of the single wave every trace becomes, at position x and time t (seconds). */
export const sharedY = (x: number, t: number) => SHARED.mid + SHARED.amp * Math.sin(SHARED.k * (x - FLOW * t));

/** The `points` attribute for one trace at time t. */
export function tracePoints(index: number, t: number) {
  const w = TRACES[index], row = ROWS[index];
  let out = '';
  for (let step = 0; step < STEPS; step++) {
    const x = step * DX;
    const blend = ease((x - BLEND_START) / (MARKER_X - BLEND_START));
    const own = row + w.amp * Math.sin(w.k * (x - FLOW * w.pace * t) + w.phase);
    out += `${step ? ' ' : ''}${x.toFixed(1)},${(own * (1 - blend) + sharedY(x, t) * blend).toFixed(1)}`;
  }
  return out;
}

/** Where the marker dot sits at time t: on the shared wave, at the convergence point. */
export const markerTransform = (t: number) => `translate(${MARKER_X} ${sharedY(MARKER_X, t).toFixed(1)})`;

export function startCircuitWaves(root: HTMLElement) {
  const traces = [...root.querySelectorAll<SVGPolylineElement>('[data-circuit-trace]')];
  const marker = root.querySelector<SVGGElement>('[data-circuit-marker]');
  if (!traces.length) return;
  animateWhileVisible(root, (t) => {
    traces.forEach((trace, i) => trace.setAttribute('points', tracePoints(i, t)));
    marker?.setAttribute('transform', markerTransform(t));
  });
}
