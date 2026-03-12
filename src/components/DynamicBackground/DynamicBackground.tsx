import { useEffect, useRef } from 'react';
import type { Theme } from '../../hooks/useTheme';

// ── Static module-level data (created once) ───────────────────────────────────

const AURORA_BANDS = [
  { color: '#4ade80', phase: 0,    speed: 0.25, amp: 0.12, yFrac: 0.22, opacity: 0.55 },
  { color: '#818cf8', phase: 2.10, speed: 0.18, amp: 0.14, yFrac: 0.14, opacity: 0.40 },
  { color: '#22d3ee', phase: 4.20, speed: 0.35, amp: 0.08, yFrac: 0.30, opacity: 0.35 },
  { color: '#a78bfa', phase: 1.05, speed: 0.22, amp: 0.10, yFrac: 0.08, opacity: 0.30 },
] as const;

const STARS = Array.from({ length: 200 }, () => ({
  xFrac:         Math.random(),
  yFrac:         Math.random(),
  r:             Math.random() * 1.2 + 0.2,
  twinkleOffset: Math.random() * Math.PI * 2,
  twinkleSpeed:  0.008 + Math.random() * 0.025,
}));

function hexRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

// ── Per-instance mutable types ────────────────────────────────────────────────

type Ball = { x: number; y: number; vx: number; vy: number; r: number };
type Dust = { x: number; y: number; r: number; speed: number; drift: number; alpha: number; phase: number };

// ── Aurora ────────────────────────────────────────────────────────────────────

function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // Night sky
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0,   '#06091a');
  bg.addColorStop(0.5, '#080d14');
  bg.addColorStop(1,   '#060a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Stars
  STARS.forEach(s => {
    const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(s.twinkleOffset + t / s.twinkleSpeed));
    ctx.beginPath();
    ctx.arc(s.xFrac * w, s.yFrac * h, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    ctx.fill();
  });

  // Aurora bands (additive blend)
  ctx.globalCompositeOperation = 'screen';
  AURORA_BANDS.forEach(band => {
    const baseY = band.yFrac * h;
    const amp   = band.amp * h;
    const steps = 60;
    const top: [number, number][] = [];
    const bot: [number, number][] = [];

    for (let i = 0; i <= steps; i++) {
      const x    = (i / steps) * w;
      const wave = Math.sin(i * 0.4  + t * band.speed + band.phase)
                 + 0.4 * Math.sin(i * 0.9 + t * band.speed * 1.7 + band.phase * 1.3);
      top.push([x, baseY + amp * wave - 100]);
      bot.push([x, baseY + amp * wave + 180]);
    }

    const grad = ctx.createLinearGradient(0, baseY - 100, 0, baseY + 180);
    grad.addColorStop(0,    'transparent');
    grad.addColorStop(0.25, hexRgba(band.color, band.opacity * 0.5));
    grad.addColorStop(0.5,  hexRgba(band.color, band.opacity));
    grad.addColorStop(0.75, hexRgba(band.color, band.opacity * 0.5));
    grad.addColorStop(1,    'transparent');

    ctx.beginPath();
    top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    [...bot].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

// ── Hockey ────────────────────────────────────────────────────────────────────

function drawHockey(ctx: CanvasRenderingContext2D, w: number, h: number, balls: Ball[]) {
  // Dark green gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0,   '#0d2818');
  bg.addColorStop(0.5, '#102e1a');
  bg.addColorStop(1,   '#0c1a0c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Alternating pitch stripes
  const stripes = 14;
  for (let i = 0; i < stripes; i++) {
    const x = (i / stripes) * w;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(34,120,34,0.05)' : 'rgba(20,80,20,0.03)';
    ctx.fillRect(x, 0, w / stripes, h);
  }

  // Pitch lines
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth   = 1.5;

  // Center line
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.14, 0, Math.PI * 2);
  ctx.stroke();

  // Shooting circles (arcs at top / bottom edges)
  const R = Math.min(w, h) * 0.28;
  ctx.beginPath(); ctx.arc(w / 2, 0, R, 0, Math.PI);      ctx.stroke();
  ctx.beginPath(); ctx.arc(w / 2, h, R, Math.PI, Math.PI * 2); ctx.stroke();

  // Goal-line verticals
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.moveTo(w * 0.35, 0); ctx.lineTo(w * 0.35, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.65, 0); ctx.lineTo(w * 0.65, h); ctx.stroke();

  // Floating hockey balls
  balls.forEach(ball => {
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.x < -ball.r) ball.x = w + ball.r;
    if (ball.x > w + ball.r) ball.x = -ball.r;
    if (ball.y < -ball.r) ball.y = h + ball.r;
    if (ball.y > h + ball.r) ball.y = -ball.r;

    const g = ctx.createRadialGradient(
      ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.1,
      ball.x, ball.y, ball.r,
    );
    g.addColorStop(0,   'rgba(255,255,255,0.18)');
    g.addColorStop(0.5, 'rgba(220,220,220,0.08)');
    g.addColorStop(1,   'rgba(150,150,150,0.02)');
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  });
}

// ── Safari ────────────────────────────────────────────────────────────────────

function drawAcacia(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = 'rgba(5,3,1,0.95)';

  // Trunk
  ctx.fillRect(x - size * 0.035, y - size * 0.52, size * 0.07, size * 0.52);

  // Flat ellipse canopy base
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.52, size * 0.52, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bumpy dome on top of canopy
  ctx.beginPath();
  ctx.moveTo(x - size * 0.52, y - size * 0.52);
  ctx.bezierCurveTo(
    x - size * 0.25, y - size * 0.76,
    x + size * 0.25, y - size * 0.78,
    x + size * 0.52, y - size * 0.52,
  );
  ctx.closePath();
  ctx.fill();
}

function drawSafari(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dust: Dust[]) {
  // Warm night sky
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0,    '#0c0703');
  bg.addColorStop(0.55, '#1a0e04');
  bg.addColorStop(0.78, '#3d1a00');
  bg.addColorStop(0.90, '#5c2a00');
  bg.addColorStop(1,    '#1a0a02');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Horizon glow (sun below horizon)
  const hy = h * 0.87;
  const hg = ctx.createRadialGradient(w / 2, hy, 0, w / 2, hy, w * 0.55);
  hg.addColorStop(0,   'rgba(255,130,20,0.28)');
  hg.addColorStop(0.3, 'rgba(255,80,10,0.12)');
  hg.addColorStop(0.7, 'rgba(180,40,0,0.04)');
  hg.addColorStop(1,   'transparent');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);

  // Stars — warm-tinted, upper sky only
  STARS.forEach(s => {
    if (s.yFrac > 0.72) return;
    const a = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(s.twinkleOffset + t / s.twinkleSpeed));
    ctx.beginPath();
    ctx.arc(s.xFrac * w, s.yFrac * h * 0.72, s.r * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,225,170,${a.toFixed(2)})`;
    ctx.fill();
  });

  // Moon
  const mx = w * 0.76, my = h * 0.11, mr = 18;
  const mg = ctx.createRadialGradient(mx - 3, my - 3, 2, mx, my, mr);
  mg.addColorStop(0,   'rgba(255,235,190,0.75)');
  mg.addColorStop(0.6, 'rgba(255,210,140,0.35)');
  mg.addColorStop(1,   'transparent');
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fillStyle = mg;
  ctx.fill();

  // Dust particles
  dust.forEach(p => {
    p.y -= p.speed;
    p.x += p.drift + Math.sin(t * 0.9 + p.phase) * 0.00012;
    if (p.y < -0.05) { p.y = 1.02; p.x = Math.random(); }
    if (p.x < -0.02) p.x = 1.02;
    if (p.x > 1.02)  p.x = -0.02;
    const a = p.alpha * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.2 + p.phase)));
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,185,55,${a.toFixed(2)})`;
    ctx.fill();
  });

  // Ground silhouette
  const gy = h * 0.89;
  ctx.fillStyle = 'rgba(6,3,1,1)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, gy + h * 0.018 * Math.sin(0.2));
  for (let x = 0; x <= w; x += 15) {
    ctx.lineTo(x, gy + h * 0.016 * Math.sin(x * 0.012 + 0.5));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Acacia trees
  drawAcacia(ctx, w * 0.18, gy, h * 0.16);
  drawAcacia(ctx, w * 0.80, gy + h * 0.005, h * 0.12);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { theme: Theme }

export default function DynamicBackground({ theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Hockey balls (mutable per-run state)
    const balls: Ball[] = Array.from({ length: 5 }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r:  10 + Math.random() * 9,
    }));

    // Safari dust (mutable per-run state)
    const dust: Dust[] = Array.from({ length: 80 }, () => ({
      x:     Math.random(),
      y:     0.15 + Math.random() * 0.85,
      r:     0.5 + Math.random() * 2.2,
      speed: 0.00015 + Math.random() * 0.0004,
      drift: (Math.random() - 0.5) * 0.0003,
      alpha: 0.08 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
    }));

    let t   = 0;
    let raf = 0;

    function frame() {
      t += 0.008;
      const { width: w, height: h } = canvas;
      if      (theme === 'aurora') drawAurora(ctx, w, h, t);
      else if (theme === 'hockey') drawHockey(ctx, w, h, balls);
      else                         drawSafari(ctx, w, h, t, dust);
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [theme]); // restart canvas loop when theme changes

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />
      {/* Glow blobs — provide coloured ambient light that glass cards pick up */}
      <div className="glow glow-1" />
      <div className="glow glow-2" />
      <div className="glow glow-3" />
    </>
  );
}
