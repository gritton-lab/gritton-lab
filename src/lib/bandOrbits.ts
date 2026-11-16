/**
 * Orbits artwork (440 x 280 artwork space). Seven cells circle a centre, each at its own
 * rate, trailing a short arc. Their rates are whole-number multiples of one slow cycle, so
 * they scatter, drift back together, and once per cycle all line up on the marker in the
 * same instant.
 *
 * `orbitsFrame` draws the still frame at build time and every animated frame in the browser.
 */
import { TAU, animateWhileVisible, ringAt } from './motion';

export const ORBIT_CENTER = { x: 220, y: 140 };
/** Radius of each orbit and how many laps it completes per cycle; inner orbits lap faster. */
export const ORBITS = [
  { r: 20, laps: 9 }, { r: 36, laps: 7 }, { r: 52, laps: 6 }, { r: 68, laps: 5 },
  { r: 84, laps: 4 }, { r: 100, laps: 3 }, { r: 116, laps: 2 },
];
/** The moment the still frame shows: just past an alignment, the cells fanning apart. */
export const ORBITS_STILL = 0.75;

const CYCLE = 12;    // seconds between alignments
const TRAIL = 28;    // length of each cell's trail, in artwork units

/** The arc a cell trails, drawn for a cell sitting due east of the centre; `share` shortens it. */
export function trailPath(orbit: (typeof ORBITS)[number], share = 1) {
  const { x, y } = ORBIT_CENTER, back = (TRAIL * share) / orbit.r;
  return `M${(x + orbit.r * Math.cos(-back)).toFixed(2)} ${(y + orbit.r * Math.sin(-back)).toFixed(2)}A${orbit.r} ${orbit.r} 0 0 1 ${x + orbit.r} ${y}`;
}

export function orbitsFrame(t: number) {
  const since = (((t + CYCLE / 2) % CYCLE) + CYCLE) % CYCLE - CYCLE / 2;   // seconds from the nearest alignment
  let together = 0;
  for (const orbit of ORBITS) together += Math.cos(TAU * orbit.laps * since / CYCLE) / ORBITS.length;
  const near = Math.max(0, (together - 0.75) / 0.25), wave = ringAt(since, 1.4);
  return {
    // degrees clockwise from due east; every cell points straight up at an alignment
    angles: ORBITS.map((orbit) => (-90 + 360 * orbit.laps * (since / CYCLE)) % 360),
    lineAlpha: 0.85 * near,
    dotRadius: 2.6 + 1.4 * near,
    pulseRadius: 8 + 120 * wave.open, pulseAlpha: 0.6 * wave.alpha,
  };
}

export const orbitTransform = (angle: number) => `rotate(${angle.toFixed(2)} ${ORBIT_CENTER.x} ${ORBIT_CENTER.y})`;

export function startOrbits(root: HTMLElement) {
  const cells = [...root.querySelectorAll('[data-orbit]')], dots = [...root.querySelectorAll('[data-orbit-dot]')];
  const line = root.querySelector('[data-orbit-line]'), pulse = root.querySelector('[data-orbit-pulse]');
  if (!cells.length) return;
  animateWhileVisible(root, (seconds) => {
    const f = orbitsFrame(seconds + ORBITS_STILL);
    f.angles.forEach((angle, i) => cells[i]?.setAttribute('transform', orbitTransform(angle)));
    dots.forEach((dot) => dot.setAttribute('r', f.dotRadius.toFixed(2)));
    line?.setAttribute('stroke-opacity', f.lineAlpha.toFixed(3));
    pulse?.setAttribute('r', f.pulseRadius.toFixed(1));
    pulse?.setAttribute('stroke-opacity', f.pulseAlpha.toFixed(3));
  });
}
