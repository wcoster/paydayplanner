interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rot: number; rotV: number;
  color: string;
  shape: 'rect' | 'circle' | 'stick';
  gravity: number;
  opacity: number;
  decay: number;
}

export function launchConfetti(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = (canvas.width  = canvas.offsetWidth);
  const H = (canvas.height = canvas.offsetHeight);

  const colors = ['#4ade80','#22c55e','#86efac','#f87171','#60a5fa','#fbbf24','#f472b6','#fff'];
  const shapes: Particle['shape'][] = ['rect', 'circle', 'stick'];

  const particles: Particle[] = Array.from({ length: 80 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H * 0.55,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 16 - 4,
    w: Math.random() * 8 + 3,
    h: Math.random() * 6 + 2,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 15,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    gravity: 0.25 + Math.random() * 0.15,
    opacity: 1,
    decay: 0.008 + Math.random() * 0.008,
  }));

  let frame: number;

  function draw() {
    ctx!.clearRect(0, 0, W, H);
    let alive = false;

    for (const p of particles) {
      if (p.opacity <= 0) continue;
      alive = true;

      p.x  += p.vx;
      p.vy += p.gravity;
      p.y  += p.vy;
      p.vx *= 0.98;
      p.rot    += p.rotV;
      p.opacity -= p.decay;

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate((p.rot * Math.PI) / 180);
      ctx!.globalAlpha = Math.max(0, p.opacity);
      ctx!.fillStyle   = p.color;

      if (p.shape === 'circle') {
        ctx!.beginPath();
        ctx!.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else if (p.shape === 'stick') {
        ctx!.fillRect(-1, -p.h, 2, p.h * 2);
      } else {
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx!.restore();
    }

    if (alive) frame = requestAnimationFrame(draw);
  }

  draw();
  setTimeout(() => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);
  }, 3000);
}
