/**
 * Field artwork (440 x 280 artwork space). A sheet of cells, each one swelling and
 * brightening as activity passes over it. Two sources ripple outward at different
 * frequencies while they slowly wander, so rings of activity spread across the sheet, meet,
 * and reinforce or cancel where they cross.
 *
 * `fieldFrame` draws the still frame at build time and every animated frame in the browser.
 */
import { animateWhileVisible } from './motion';

const COLUMNS = 21, ROWS = 15, STEP = 20;
/** Cell centres: a staggered lattice, every other row shifted half a step. */
export const FIELD_CELLS = Array.from({ length: COLUMNS * ROWS }, (_, i) => {
  const row = Math.floor(i / COLUMNS), column = i % COLUMNS;
  return { x: 15 + STEP * column + (row % 2 ? STEP / 2 : 0), y: 19 + STEP * 0.866 * row };
});

// Each source: ripple spacing (radians per unit), ripple rate (radians per second), share of the
// total, and how it wanders (centre, reach and rate on each axis).
const SOURCES = [
  { k: 0.062, rate: 3.0, weight: 0.56, x: 128, y: 150, rx: 46, ry: 34, wx: 0.19, wy: 0.23 },
  { k: 0.083, rate: 4.1, weight: 0.44, x: 322, y: 124, rx: 40, ry: 38, wx: 0.15, wy: 0.21 },
];
const REACH = 170;   // a ripple has lost half its strength this far from its source

/** Size and brightness of every cell at time t (seconds). */
export function fieldFrame(t: number) {
  const at = SOURCES.map((s) => ({ ...s, cx: s.x + s.rx * Math.sin(s.wx * t), cy: s.y + s.ry * Math.cos(s.wy * t) }));
  return FIELD_CELLS.map(({ x, y }) => {
    let sum = 0;
    for (const s of at) {
      const d = Math.hypot(x - s.cx, y - s.cy);
      sum += (s.weight / (1 + d / REACH)) * Math.sin(s.k * d - s.rate * t);
    }
    const active = Math.pow(Math.min(1, Math.max(0, 0.5 + 0.92 * sum)), 2.2);   // sharpen, so fronts read as fronts
    return { radius: 1 + 3.7 * active, alpha: 0.12 + 0.88 * active };
  });
}

export function startField(root: HTMLElement) {
  const cells = [...root.querySelectorAll('[data-field-cell]')];
  if (!cells.length) return;
  animateWhileVisible(root, (t) => {
    const frame = fieldFrame(t);
    for (let i = 0; i < cells.length; i++) {
      cells[i].setAttribute('r', frame[i].radius.toFixed(2));
      cells[i].setAttribute('fill-opacity', frame[i].alpha.toFixed(3));
    }
  });
}
