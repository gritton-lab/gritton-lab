/**
 * Raster artwork (440 x 280 artwork space). Seven spike trains, each at its own rate, run
 * toward a readout. A stray spike barely moves the readout; it fires only when all seven
 * arrive together, which happens once every few seconds.
 *
 * `rasterFrame` draws the still frame at build time and every animated frame in the browser.
 */
import { animateWhileVisible, hash, ringAt } from './motion';

export const RASTER_ROWS = [50, 80, 110, 140, 170, 200, 230];
/** Where the spike trains are read out, and the resting height of the readout's own trace. */
export const RASTER_READOUT = { x: 300, y: 140 };
/** The moment the still frame shows: just after a volley, with the readout's spike on screen. */
export const RASTER_STILL = 2.95;

const WIDTH = 440, SPEED = 80;                       // artwork units, and units per second
const RATES = [1.3, 2.1, 0.9, 1.7, 2.6, 1.1, 1.9];   // mean spikes per second, one per row
const VOLLEY_EVERY = 4.5, FIRST_VOLLEY = 2.2;        // seconds
const volleyAt = (n: number) => n * VOLLEY_EVERY + FIRST_VOLLEY;

/** When row `row` spikes within [t0, t1]: its own irregular train, plus the shared volleys. */
function spikeTimes(row: number, t0: number, t1: number) {
  const out: number[] = [], rate = RATES[row];
  for (let m = Math.floor(t0 * rate) - 1; m <= Math.ceil(t1 * rate) + 1; m++) {
    const ts = (m + 0.5 + 0.8 * (hash(m, row + 10) - 0.5)) / rate;
    if (ts < t0 || ts > t1) continue;
    if (Math.abs(ts - volleyAt(Math.round((ts - FIRST_VOLLEY) / VOLLEY_EVERY))) < 0.24) continue;   // keep the moments around a volley clear
    out.push(ts);
  }
  for (let n = Math.floor((t0 - FIRST_VOLLEY) / VOLLEY_EVERY); n <= Math.ceil((t1 - FIRST_VOLLEY) / VOLLEY_EVERY); n++) {
    const ts = volleyAt(n) + 0.02 * (hash(n, row + 50) - 0.5);
    if (ts >= t0 && ts <= t1) out.push(ts);
  }
  return out;
}

/** The small bump one arriving spike adds to the readout, `d` seconds after it lands. */
const bump = (d: number) => (d < 0 ? 0 : (d / 0.045) * Math.exp(1 - d / 0.045));

export function rasterFrame(t: number) {
  const { x: X, y: Y } = RASTER_READOUT;
  const heard: number[] = [];
  let ticks = '';
  // spikes still on their way are ticks; each one flashes on the readout line as it lands
  const flashes = RASTER_ROWS.map((y, row) => {
    let since = Infinity;
    for (const ts of spikeTimes(row, t - (WIDTH - X) / SPEED - 0.6, t + X / SPEED)) {
      if (ts > t) ticks += `M${(X - SPEED * (ts - t)).toFixed(1)} ${y - 7}V${y + 7}`;
      else { heard.push(ts); since = Math.min(since, t - ts); }
    }
    return since < 0.3 ? { radius: 2 + 13 * since, alpha: 0.9 * (1 - since / 0.3) } : { radius: 2, alpha: 0 };
  });
  // the readout's trace: what it did at the line, carried off to the right
  let output = '';
  for (let x = X; x <= WIDTH; x++) {
    const tau = t - (x - X) / SPEED;
    let v = 0;
    for (const ts of heard) { const d = tau - ts; if (d > 0 && d < 0.5) v += 3.4 * bump(d); }
    const n = Math.floor((tau - FIRST_VOLLEY) / VOLLEY_EVERY);
    for (const d of [tau - volleyAt(n), tau - volleyAt(n + 1)]) {
      v += 42 * Math.exp(-(((d - 0.07) / 0.03) ** 2)) - 7 * Math.exp(-(((d - 0.2) / 0.08) ** 2));   // the spike it fires, then its dip
    }
    output += `${x === X ? '' : ' '}${x},${(Y - v).toFixed(1)}`;
  }
  const age = t - volleyAt(Math.floor((t - FIRST_VOLLEY) / VOLLEY_EVERY)) - 0.05, wave = ringAt(age, 1.2);
  return {
    ticks, flashes, output,
    pulseRadius: 6 + 50 * wave.open, pulseAlpha: 0.8 * wave.alpha,
    dotRadius: 5 + 3 * Math.exp(-Math.max(0, age) * 5),
  };
}

export function startRaster(root: HTMLElement) {
  const one = (selector: string) => root.querySelector(selector);
  const ticks = one('[data-raster-ticks]'), output = one('[data-raster-output]'), pulse = one('[data-raster-pulse]'), dot = one('[data-raster-dot]');
  const flashes = [...root.querySelectorAll('[data-raster-flash]')];
  if (!ticks || !output) return;
  animateWhileVisible(root, (seconds) => {
    const f = rasterFrame(seconds + RASTER_STILL);
    ticks.setAttribute('d', f.ticks);
    output.setAttribute('points', f.output);
    f.flashes.forEach((flash, i) => {
      flashes[i]?.setAttribute('r', flash.radius.toFixed(1));
      flashes[i]?.setAttribute('fill-opacity', flash.alpha.toFixed(3));
    });
    pulse?.setAttribute('r', f.pulseRadius.toFixed(1));
    pulse?.setAttribute('stroke-opacity', f.pulseAlpha.toFixed(3));
    dot?.setAttribute('r', f.dotRadius.toFixed(2));
  });
}
