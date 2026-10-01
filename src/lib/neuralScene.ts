type Vec3 = { x: number; y: number; z: number };
type Branch = { points: Vec3[]; width: number; color: string; phase: number };
type Neuron = { position: Vec3; color: string; size: number; phase: number };

/** Perspective-projected 3D illustration with no image or model downloads. */
export function createNeuralScene(root: HTMLElement) {
  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const context = ctx;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let seed = 37;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const scale = (v: Vec3, n: number): Vec3 => ({ x: v.x * n, y: v.y * n, z: v.z * n });
  const normalize = (v: Vec3) => scale(v, 1 / (Math.hypot(v.x, v.y, v.z) || 1));
  const mix = (a: Vec3, b: Vec3, t: number): Vec3 => add(scale(a, 1 - t), scale(b, t));
  // Illinois blue tints and white, matching the site's fixed header/footer palette.
  const ice = '181, 200, 226', blue = '117, 155, 209', white = '255, 255, 255';
  const neurons: Neuron[] = [
    { position: { x: 0.05, y: 0.02, z: 0.46 }, color: ice, size: 1.15, phase: 0 },
    { position: { x: 0.64, y: -0.45, z: -0.12 }, color: white, size: 0.8, phase: 1.4 },
    { position: { x: -0.5, y: -0.56, z: -0.25 }, color: ice, size: 0.82, phase: 2.2 },
    { position: { x: 0.64, y: 0.56, z: -0.18 }, color: ice, size: 0.88, phase: 3.5 },
    { position: { x: -0.42, y: 0.62, z: -0.25 }, color: blue, size: 0.8, phase: 4.8 },
    { position: { x: 0.14, y: -0.28, z: -0.88 }, color: white, size: 0.6, phase: 5.5 },
    { position: { x: -0.35, y: 0.18, z: 0.9 }, color: ice, size: 0.64, phase: 1.8 },
    { position: { x: 0.56, y: 0.12, z: -0.66 }, color: blue, size: 0.58, phase: 3.9 },
    { position: { x: 0.02, y: -0.68, z: 0.46 }, color: blue, size: 0.66, phase: 2.9 },
    { position: { x: 0.17, y: 0.7, z: 0.48 }, color: white, size: 0.6, phase: 4.1 },
  ];
  const branches: Branch[] = [], connections: Branch[] = [];
  const grow = (start: Vec3, direction: Vec3, length: number, width: number, depth: number, color: string) => {
    const points = [start];
    let position = start, heading = direction;
    for (let i = 1; i <= 9; i++) {
      heading = normalize(add(heading, { x: (random() - 0.5) * 0.2, y: (random() - 0.5) * 0.2, z: (random() - 0.5) * 0.2 }));
      position = add(position, scale(heading, length / 9));
      points.push(position);
    }
    branches.push({ points, width, color: depth === 0 && random() > 0.65 ? white : color, phase: random() * 6 });
    if (depth <= 0) return;
    for (let fork = 0; fork < 2; fork++) {
      const bend = normalize(add(heading, { x: (random() - 0.5) * 1.65, y: (random() - 0.5) * 1.65, z: (random() - 0.5) * 1.4 }));
      grow(points[fork === 0 ? 9 : 6], bend, length * (0.5 + random() * 0.17), width * 0.52, depth - 1, color);
    }
  };
  neurons.forEach((neuron) => {
    for (let arm = 0; arm < 7; arm++) {
      const angle = arm * 2.4 + neuron.phase;
      const polar = Math.acos(1 - 2 * ((arm + 0.5) / 7));
      grow(neuron.position, normalize({ x: Math.sin(polar) * Math.cos(angle), y: Math.cos(polar), z: Math.sin(polar) * Math.sin(angle) }),
        (0.2 + random() * 0.13) * neuron.size, 3.8 * neuron.size, 2, neuron.color);
    }
  });
  const linked = new Set<string>();
  neurons.forEach((neuron, i) => {
    const neighbors = neurons.map((other, j) => ({ j, distance: Math.hypot(neuron.position.x - other.position.x, neuron.position.y - other.position.y, neuron.position.z - other.position.z) }))
      .filter(other => other.j !== i).sort((a, b) => a.distance - b.distance).slice(0, 3);
    neighbors.forEach(({ j }) => {
      const key = [i, j].sort((a, b) => a - b).join('-');
      if (linked.has(key)) return;
      linked.add(key);
      const start = neuron.position, end = neurons[j].position;
      const bend = { x: (random() - 0.5) * 0.6, y: (random() - 0.5) * 0.6, z: (random() - 0.5) * 0.7 };
      const points = Array.from({ length: 41 }, (_, step) => add(mix(start, end, step / 40), scale(bend, Math.sin(step / 40 * Math.PI))));
      connections.push({ points, width: 1.15, color: i % 3 === 0 ? white : ice, phase: random() * 6 });
    });
  });
  const dust = Array.from({ length: 160 }, () => ({
    position: { x: (random() - 0.5) * 2.8, y: (random() - 0.5) * 2.6, z: (random() - 0.5) * 2.8 },
    size: 0.5 + random() * 1.1, phase: random() * Math.PI * 2,
  }));
  const glows = new Map<string, HTMLCanvasElement>();
  [ice, blue, white, '255, 255, 255'].forEach((color) => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    const brush = sprite.getContext('2d')!;
    brush.shadowColor = `rgba(${color}, 0.85)`;
    brush.shadowBlur = 22;
    brush.fillStyle = `rgba(${color}, 0.6)`;
    brush.beginPath();
    brush.arc(64, 64, 8, 0, Math.PI * 2);
    brush.fill();
    glows.set(color, sprite);
  });

  let width = 1, height = 1;
  let angleX = -0.08, angleY = -0.12, targetX = angleX, targetY = angleY;
  let zoom = 1, time = 0, burst = 0;
  let playing = !reducedMotion.matches, visible = false, dragging = false;
  let pointerX = 0, pointerY = 0, distance = 0;
  let frame: number | undefined, lastTime = 0;
  const project = (v: Vec3) => {
    const yaw = angleY + time * 0.035, pitch = angleX + Math.cos(time * 0.065) * 0.09;
    const x = v.x * Math.cos(yaw) - v.z * Math.sin(yaw), z = v.x * Math.sin(yaw) + v.z * Math.cos(yaw);
    const y = v.y * Math.cos(pitch) - z * Math.sin(pitch), depth = v.y * Math.sin(pitch) + z * Math.cos(pitch);
    const perspective = 3.8 / (3.8 - depth);
    const size = Math.min(width * (width < 700 ? 0.47 : 0.32), height * 0.43) * zoom;
    return {
      x: width * (width < 700 ? 0.6 : 0.74) + x * size * perspective,
      y: height * (width < 700 ? 0.3 : 0.46) + y * size * perspective,
      scale: perspective, depth,
    };
  };
  const glow = (x: number, y: number, radius: number, color: string, alpha = 1) => {
    context.globalAlpha = alpha;
    context.drawImage(glows.get(color)!, x - radius, y - radius, radius * 2, radius * 2);
    context.globalAlpha = 1;
  };
  const drawBranch = (branch: Branch, connection = false) => {
    const points = branch.points.map(project), depth = points[0].scale;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      context.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2);
    }
    context.lineTo(points.at(-1)!.x, points.at(-1)!.y);
    context.strokeStyle = `rgba(${branch.color}, ${connection ? 0.05 : 0.085})`;
    context.lineWidth = branch.width * depth * 4;
    context.stroke();
    context.strokeStyle = `rgba(${branch.color}, ${connection ? 0.36 : Math.min(0.75, 0.48 * depth)})`;
    context.lineWidth = Math.max(0.35, branch.width * depth * 0.75);
    context.stroke();
    if (connection || branch.width > 1.4) {
      const progress = ((time * (connection ? 0.24 : 0.32) + branch.phase) % 1);
      const at = progress * (branch.points.length - 1), index = Math.min(Math.floor(at), branch.points.length - 2);
      const point = project(mix(branch.points[index], branch.points[index + 1], at - index));
      if (connection) {
        for (let trail = 1; trail <= 5; trail++) {
          const tailAt = Math.max(0, at - trail * 0.55), tailIndex = Math.min(Math.floor(tailAt), branch.points.length - 2);
          const tail = project(mix(branch.points[tailIndex], branch.points[tailIndex + 1], tailAt - tailIndex));
          glow(tail.x, tail.y, (5 - trail * 0.6) * tail.scale, branch.color, (1 - trail / 6) * 0.7);
        }
      }
      glow(point.x, point.y, (connection ? 8 : 5) * point.scale * (1 + burst * 0.6), branch.color, 0.65 + burst * 0.3);
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(point.x, point.y, Math.max(0.6, point.scale * 0.85), 0, Math.PI * 2);
      context.fill();
    }
  };
  const draw = () => {
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    // Leave a clean reading area while keeping the entire scene draggable.
    if (width < 700) context.rect(0, 0, width, height * 0.42);
    else context.rect(width * 0.43, 0, width * 0.57, height);
    context.clip();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    dust.forEach((particle) => {
      const p = project(particle.position);
      context.fillStyle = `rgba(181, 200, 226, ${0.12 + (Math.sin(time * 0.4 + particle.phase) + 1) * 0.07})`;
      context.beginPath();
      context.arc(p.x, p.y, particle.size * p.scale, 0, Math.PI * 2);
      context.fill();
    });
    context.globalCompositeOperation = 'lighter';
    connections.forEach((connection) => drawBranch(connection, true));
    branches.forEach((branch) => drawBranch(branch));
    [...neurons].sort((a, b) => project(a.position).depth - project(b.position).depth).forEach((neuron) => {
      const p = project(neuron.position), pulse = 1 + Math.sin(time * 1.4 - neuron.phase) * 0.1 + burst * 0.7;
      const radius = (width < 700 ? 29 : 42) * p.scale * neuron.size;
      glow(p.x, p.y, radius * 2.1 * pulse, neuron.color, 0.6);
      glow(p.x, p.y, radius * 0.7, neuron.color, 0.9);
      context.fillStyle = `rgba(${neuron.color}, 0.3)`;
      context.beginPath();
      context.ellipse(p.x, p.y, 11 * p.scale * neuron.size, 15 * p.scale * neuron.size, neuron.phase + angleY * 0.3, 0, Math.PI * 2);
      context.fill();
      glow(p.x, p.y, 10 * p.scale * pulse, '255, 255, 255');
    });
    context.globalCompositeOperation = 'source-over';
    context.restore();
  };
  const tick = (now: number) => {
    frame = undefined;
    if (!visible || document.hidden) { lastTime = 0; return; }
    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    if (playing) { time += delta; burst = Math.max(0, burst - delta * 0.45); }
    angleX += (targetX - angleX) * 0.12;
    angleY += (targetY - angleY) * 0.12;
    draw();
    if (playing || Math.abs(targetX - angleX) + Math.abs(targetY - angleY) > 0.001) requestDraw();
    else lastTime = 0;
  };
  const requestDraw = () => { if (frame === undefined && visible && !document.hidden) frame = requestAnimationFrame(tick); };
  const pulse = () => { burst = 1; if (!playing) time += 0.5; requestDraw(); };
  const reset = () => { targetX = -0.08; targetY = -0.12; zoom = 1; requestDraw(); };
  const changeZoom = (delta: number) => { zoom = Math.max(0.65, Math.min(1.55, zoom + delta)); requestDraw(); };
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true; distance = 0; pointerX = event.clientX; pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - pointerX, dy = event.clientY - pointerY;
    distance += Math.abs(dx) + Math.abs(dy);
    targetY += dx * 0.004;
    targetX = Math.max(-1.1, Math.min(1.1, targetX + dy * 0.003));
    pointerX = event.clientX; pointerY = event.clientY;
    requestDraw();
  });
  canvas.addEventListener('pointerup', () => { if (dragging && distance < 6) pulse(); dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('lostpointercapture', () => { dragging = false; });
  canvas.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', ' ', 'r', 'R', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') targetY -= 0.15;
    if (event.key === 'ArrowRight') targetY += 0.15;
    if (event.key === 'ArrowUp') targetX = Math.max(-1.1, targetX - 0.15);
    if (event.key === 'ArrowDown') targetX = Math.min(1.1, targetX + 0.15);
    if (event.key === '+' || event.key === '=') changeZoom(0.1);
    if (event.key === '-') changeZoom(-0.1);
    if (event.key.toLowerCase() === 'r') reset();
    if (event.key === 'Enter') pulse();
    if (event.key === ' ') playing = !playing;
    requestDraw();
  });
  reducedMotion.addEventListener('change', () => { playing = !reducedMotion.matches; requestDraw(); });
  document.addEventListener('visibilitychange', () => { lastTime = 0; requestDraw(); });
  window.addEventListener('pagehide', () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; });
  window.addEventListener('pageshow', requestDraw);
  new ResizeObserver(() => {
    width = root.clientWidth; height = root.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    requestDraw();
  }).observe(root);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; lastTime = 0; requestDraw(); }).observe(root);
}
