import { useEffect, useRef } from 'react';
import type { Condition } from '../../lib/weatherCondition';

interface Props {
  condition: Condition;
  windMph: number;
}

// Canvas-based ambient background that reflects current conditions.
// Rain / snow use particle systems; sunny has drifting clouds + sun glow;
// clear night has twinkling stars + moon; thunderstorms flash.
// Respects prefers-reduced-motion by rendering a static frame.
export default function WeatherBackground({ condition, windMph }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let raf = 0;
    let running = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // --- State depending on condition ---
    const w = () => canvas.clientWidth;
    const h = () => canvas.clientHeight;

    const wind = Math.max(-50, Math.min(50, windMph));
    const windFactor = wind / 10; // horizontal particle drift coefficient

    type Drop = { x: number; y: number; vy: number; vx: number; len: number; a: number };
    type Flake = { x: number; y: number; vy: number; phase: number; size: number; a: number };
    type Star = { x: number; y: number; a: number; phase: number; speed: number };
    type Cloud = { x: number; y: number; scale: number; speed: number; a: number };
    type Ray = { a: number; speed: number; phase: number };
    type Mist = { x: number; y: number; r: number; a: number; speed: number };

    const rain: Drop[] = [];
    const flakes: Flake[] = [];
    const stars: Star[] = [];
    const clouds: Cloud[] = [];
    const rays: Ray[] = [];
    const mist: Mist[] = [];
    let nextFlashAt = 0;
    let flashAlpha = 0;

    const k = condition.key;

    const seedParticles = () => {
      const W = w();
      const H = h();
      rain.length = flakes.length = stars.length = clouds.length = rays.length = mist.length = 0;

      if (k === 'rain' || k === 'heavyRain' || k === 'drizzle' || k === 'thunderstorm') {
        const density = k === 'drizzle' ? 90 : k === 'rain' ? 180 : 360;
        for (let i = 0; i < density; i++) {
          rain.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vy: 600 + Math.random() * 400,
            vx: windFactor * 40 + (Math.random() - 0.5) * 40,
            len: 8 + Math.random() * 14,
            a: 0.2 + Math.random() * 0.4,
          });
        }
      }
      if (k === 'snow') {
        for (let i = 0; i < 120; i++) {
          flakes.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vy: 20 + Math.random() * 40,
            phase: Math.random() * Math.PI * 2,
            size: 1.2 + Math.random() * 2.6,
            a: 0.3 + Math.random() * 0.5,
          });
        }
      }
      if (k === 'clear' || (!condition.isDay && k !== 'thunderstorm')) {
        for (let i = 0; i < 140; i++) {
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H * 0.8,
            a: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 1.5,
          });
        }
      }
      if (k === 'sunny' || k === 'partlyCloudy' || k === 'cloudy' || k === 'hot' || k === 'windy') {
        const count = k === 'cloudy' ? 7 : k === 'partlyCloudy' ? 4 : k === 'sunny' ? 2 : 3;
        for (let i = 0; i < count; i++) {
          clouds.push({
            x: Math.random() * W,
            y: 20 + Math.random() * (H * 0.5),
            scale: 0.8 + Math.random() * 1.8,
            speed: (6 + Math.random() * 14) * (windFactor !== 0 ? Math.sign(windFactor) : 1),
            a: 0.12 + Math.random() * 0.18,
          });
        }
      }
      if (k === 'sunny' || k === 'hot') {
        for (let i = 0; i < 10; i++) {
          rays.push({ a: (i / 10) * Math.PI * 2, speed: 0.08 + Math.random() * 0.06, phase: Math.random() });
        }
      }
      if (k === 'fog') {
        for (let i = 0; i < 14; i++) {
          mist.push({
            x: Math.random() * W,
            y: H * 0.3 + Math.random() * H * 0.7,
            r: 80 + Math.random() * 180,
            a: 0.04 + Math.random() * 0.06,
            speed: 4 + Math.random() * 8,
          });
        }
      }
    };
    seedParticles();

    const windyStreaks: { x: number; y: number; vx: number; len: number; a: number }[] = [];
    if (k === 'windy') {
      for (let i = 0; i < 50; i++) {
        windyStreaks.push({
          x: Math.random() * w(),
          y: Math.random() * h(),
          vx: 400 + Math.random() * 400,
          len: 30 + Math.random() * 60,
          a: 0.1 + Math.random() * 0.15,
        });
      }
    }

    // Sun pulse center (computed once)
    const sunX = () => w() * 0.78;
    const sunY = () => h() * 0.22;

    let prev = performance.now();

    const drawCloud = (cx: number, cy: number, s: number, a: number) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = condition.isDay ? '#ffffff' : '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 45 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 25 * s, cy + 4 * s, 30 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 25 * s, cy + 2 * s, 35 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 8 * s, cy - 8 * s, 22 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const frame = (t: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      const W = w();
      const H = h();
      ctx.clearRect(0, 0, W, H);

      // Sun glow for day conditions
      if (condition.isDay && (k === 'sunny' || k === 'hot' || k === 'partlyCloudy')) {
        const grad = ctx.createRadialGradient(sunX(), sunY(), 0, sunX(), sunY(), 260);
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
        grad.addColorStop(0.4, 'rgba(251, 191, 36, 0.15)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Rotating rays
        if (k === 'sunny' || k === 'hot') {
          ctx.save();
          ctx.translate(sunX(), sunY());
          for (const ray of rays) {
            if (!reduced) ray.a += ray.speed * dt;
            const pulse = 0.35 + 0.15 * Math.sin(t / 400 + ray.phase * 6);
            ctx.rotate(ray.a);
            ctx.fillStyle = `rgba(253, 224, 71, ${0.06 * pulse})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(400, -14);
            ctx.lineTo(400, 14);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-ray.a);
          }
          ctx.restore();
        }

        // Sun body
        ctx.fillStyle = 'rgba(253, 224, 71, 0.9)';
        ctx.beginPath();
        ctx.arc(sunX(), sunY(), 30, 0, Math.PI * 2);
        ctx.fill();
      }

      // Moon for night
      if (!condition.isDay && (k === 'clear' || k === 'partlyCloudy' || k === 'cloudy')) {
        const mx = W * 0.82;
        const my = H * 0.2;
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
        grad.addColorStop(0, 'rgba(226, 232, 240, 0.25)');
        grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
        ctx.beginPath();
        ctx.arc(mx, my, 22, 0, Math.PI * 2);
        ctx.fill();
        // Shadow crescent
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.beginPath();
        ctx.arc(mx + 8, my, 22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stars
      for (const s of stars) {
        if (!reduced) s.phase += s.speed * dt;
        const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.x, s.y, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // Clouds
      for (const c of clouds) {
        if (!reduced) c.x += c.speed * dt;
        if (c.x - 80 * c.scale > W) c.x = -80 * c.scale;
        if (c.x + 80 * c.scale < 0) c.x = W + 80 * c.scale;
        drawCloud(c.x, c.y, c.scale, c.a);
      }

      // Mist (fog)
      for (const m of mist) {
        if (!reduced) m.x += m.speed * dt;
        if (m.x - m.r > W) m.x = -m.r;
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        grad.addColorStop(0, `rgba(226, 232, 240, ${m.a})`);
        grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }

      // Rain
      if (rain.length) {
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
        ctx.lineWidth = 1;
        for (const d of rain) {
          if (!reduced) {
            d.y += d.vy * dt;
            d.x += d.vx * dt;
          }
          if (d.y > H) {
            d.y = -20;
            d.x = Math.random() * (W + 200) - 100;
          }
          if (d.x > W + 50) d.x = -20;
          if (d.x < -50) d.x = W + 20;
          ctx.globalAlpha = d.a;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - (d.vx / d.vy) * d.len, d.y - d.len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Snow
      if (flakes.length) {
        ctx.fillStyle = '#f8fafc';
        for (const f of flakes) {
          if (!reduced) {
            f.phase += dt * 0.8;
            f.y += f.vy * dt;
            f.x += Math.sin(f.phase) * 15 * dt + windFactor * 4 * dt;
          }
          if (f.y > H) {
            f.y = -10;
            f.x = Math.random() * W;
          }
          if (f.x > W + 10) f.x = -10;
          if (f.x < -10) f.x = W + 10;
          ctx.globalAlpha = f.a;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Wind streaks
      for (const s of windyStreaks) {
        if (!reduced) s.x += s.vx * dt;
        if (s.x > W + 60) {
          s.x = -60;
          s.y = Math.random() * H;
        }
        ctx.strokeStyle = `rgba(203, 213, 225, ${s.a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.len, s.y);
        ctx.stroke();
      }

      // Lightning flashes (thunderstorm)
      if (k === 'thunderstorm') {
        if (!reduced && t > nextFlashAt) {
          flashAlpha = 0.5 + Math.random() * 0.4;
          nextFlashAt = t + 2000 + Math.random() * 8000;
        }
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(226, 232, 240, ${flashAlpha})`;
          ctx.fillRect(0, 0, W, H);
          flashAlpha -= dt * 4;
          if (flashAlpha < 0) flashAlpha = 0;
        }
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [condition.key, condition.isDay, windMph]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}
