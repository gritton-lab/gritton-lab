/**
 * Attention artwork (440 x 280 artwork space). Five traces at five frequencies reach a
 * selector that rides the marker line. Whichever trace it settles on passes through
 * amplified; the others are damped almost flat. Every few seconds it moves to another trace,
 * and the change sweeps downstream.
 *
 * `attentionFrame` draws the still frame at build time and every animated frame in the browser.
 */
import { BAND_MARKER, BAND_ROWS } from './bandArtwork';
import { animateWhileVisible, ease, ringAt } from './motion';

/** The moment the still frame shows: the selector settled, its trace amplified all the way across. */
export const ATTENTION_STILL = 3.4;
export const SELECTOR_RADIUS = 13;

const X = BAND_MARKER.x, WIDTH = 440, STEPS = 221, DX = WIDTH / (STEPS - 1);
const FLOW = 48;              // how fast the waves travel, in artwork units per second
const WIPE = 120;             // how fast a change of selection sweeps downstream
const HOLD = 4.4, MOVE = 0.7; // seconds the selector stays on a trace, and takes to reach the next
const ORDER = [2, 0, 3, 1, 4];
// spatial frequency, pace relative to FLOW, amplitude, phase
const WAVES = [
  { k: 0.071, pace: 1.12, amp: 15, ph: 1.0 },
  { k: 0.043, pace: 0.9, amp: 17, ph: 4.2 },
  { k: 0.059, pace: 1.0, amp: 16, ph: 2.4 },
  { k: 0.085, pace: 1.2, amp: 14, ph: 0.3 },
  { k: 0.05, pace: 0.95, amp: 17, ph: 5.5 },
];
const QUIET = 0.14, LOUD = 1.5;   // how much of a trace gets through when ignored, and when chosen

const pick = (n: number) => ORDER[((n % ORDER.length) + ORDER.length) % ORDER.length];

/** How fully trace `index` is the chosen one at time tau: 0 ignored, 1 chosen. */
function chosen(index: number, tau: number) {
  const n = Math.floor(tau / HOLD), arrived = ease((tau - n * HOLD - (MOVE - 0.25)) / 0.5);
  return (index === pick(n) ? arrived : 0) + (index === pick(n - 1) ? 1 - arrived : 0);
}
/** The same, as seen at position x: a change made at the marker takes time to travel downstream. */
const chosenAt = (index: number, x: number, t: number) => chosen(index, t - Math.max(0, x - X) / WIPE);

export function attentionFrame(t: number) {
  const traces: string[] = [], lit: string[] = [];
  WAVES.forEach((w, index) => {
    let all = '', bright = '';
    for (let step = 0; step < STEPS; step++) {
      const x = step * DX, share = chosenAt(index, x, t), past = ease((x - (X - 14)) / 28);
      const gain = 1 + past * (QUIET + (LOUD - QUIET) * share - 1);
      const point = `${x.toFixed(1)},${(BAND_ROWS[index] + gain * w.amp * Math.sin(w.k * (x - FLOW * w.pace * t) + w.ph)).toFixed(1)}`;
      all += (step ? ' ' : '') + point;
      if (x >= X && share > 0.5) bright += (bright ? ' ' : '') + point;   // the stretch that is getting through
    }
    traces.push(all); lit.push(bright);
  });
  const n = Math.floor(t / HOLD), u = t - n * HOLD;
  const from = BAND_ROWS[pick(n - 1)], to = BAND_ROWS[pick(n)], wave = ringAt(u - MOVE, 1.1);
  return { traces, lit, selectorY: from + (to - from) * ease(u / MOVE), pulseRadius: SELECTOR_RADIUS + 22 * wave.open, pulseAlpha: 0.7 * wave.alpha };
}

export const selectorTransform = (y: number) => `translate(${X} ${y.toFixed(1)})`;

export function startAttention(root: HTMLElement) {
  const traces = [...root.querySelectorAll('[data-attention-trace]')], lit = [...root.querySelectorAll('[data-attention-lit]')];
  const selector = root.querySelector('[data-attention-selector]'), pulse = root.querySelector('[data-attention-pulse]');
  if (!traces.length) return;
  animateWhileVisible(root, (seconds) => {
    const f = attentionFrame(seconds + ATTENTION_STILL);
    f.traces.forEach((points, i) => traces[i]?.setAttribute('points', points));
    f.lit.forEach((points, i) => lit[i]?.setAttribute('points', points));
    selector?.setAttribute('transform', selectorTransform(f.selectorY));
    pulse?.setAttribute('r', f.pulseRadius.toFixed(1));
    pulse?.setAttribute('stroke-opacity', f.pulseAlpha.toFixed(3));
  });
}
