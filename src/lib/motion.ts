export const TAU = Math.PI * 2;
/** Smooth 0 → 1 ramp, flat at both ends. */
export const ease = (s: number) => { s = s < 0 ? 0 : s > 1 ? 1 : s; return s * s * (3 - 2 * s); };
export const frac = (v: number) => v - Math.floor(v);
/** A repeatable pseudo-random number in 0..1 for a pair of integers. */
export const hash = (a: number, b: number) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
/** An expanding ring `age` seconds after the moment it marks: how far it has opened, how visible it is. */
export const ringAt = (age: number, life: number) => {
  const p = age / life;
  return p < 0 || p > 1 ? { open: 0, alpha: 0 } : { open: 1 - Math.pow(1 - p, 2.2), alpha: Math.pow(1 - p, 1.6) };
};

/**
 * Runs a decorative animation only while it can be seen: it pauses off-screen, in a hidden
 * tab, and under reduced motion (where the still frame rendered at build time is left alone).
 * `draw` receives the number of seconds the animation has actually been running.
 */
export function animateWhileVisible(root: Element, draw: (t: number) => void) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, frame: number | undefined, last = 0, t = 0;

  const tick = (now: number) => {
    frame = undefined;
    if (!visible || document.hidden || reducedMotion.matches) { last = 0; return; }
    if (last) t += Math.min((now - last) / 1000, 0.05);
    last = now;
    draw(t);
    frame = requestAnimationFrame(tick);
  };
  const request = () => { if (frame === undefined) frame = requestAnimationFrame(tick); };

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = 0; request(); }).observe(root);
  document.addEventListener('visibilitychange', () => { last = 0; request(); });
  reducedMotion.addEventListener('change', () => { last = 0; request(); });
}
