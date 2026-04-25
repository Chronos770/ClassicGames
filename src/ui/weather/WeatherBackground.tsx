import { useEffect, useRef } from 'react';
import type { Condition } from '../../lib/weatherCondition';

interface Props {
  condition: Condition;
  windMph: number;
}

// Canvas-based ambient background that reflects current conditions.
// Tuned for visibility — particles are bright/opaque enough to read through
// the dark cards on top, instead of blending into the page background.
// Animates regardless of prefers-reduced-motion (Brave + Safari Low Power
// Mode default to 'reduce' on mobile, which previously froze the canvas
// after one frame on those browsers).
export default function WeatherBackground({ condition, windMph }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Intentionally ignore prefers-reduced-motion. Brave reports 'reduce' by
    // default on mobile (fingerprinting protection), and Safari Low Power
    // Mode does the same. Honoring it killed the canvas animation entirely
    // on those browsers — same problem we hit with the SVG icons. The
    // canvas is a soft ambient background, no strobing or jarring motion.
    const isMobile = window.matchMedia?.('(max-width: 640px)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    const densityScale = isMobile ? 0.55 : 1;

    let raf = 0;
    let running = true;
    let paused = document.hidden;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    const w = () => canvas.clientWidth;
    const h = () => canvas.clientHeight;

    const wind = Math.max(-50, Math.min(50, windMph));
    const windFactor = wind / 10;

    type Drop = { x: number; y: number; vy: number; vx: number; len: number; a: number };
    type Splash = { x: number; y: number; r: number; a: number };
    type Flake = { x: number; y: number; vy: number; phase: number; size: number; a: number };
    type Star = { x: number; y: number; a: number; phase: number; speed: number };
    type Cloud = { x: number; y: number; scale: number; speed: number; a: number; type: 'puffy' | 'wisp' };
    type Ray = { a: number; speed: number; phase: number };
    type Mist = { x: number; y: number; r: number; a: number; speed: number };
    type Streak = { x: number; y: number; vx: number; len: number; a: number };
    type Leaf = { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; size: number; color: string };

    const rain: Drop[] = [];
    const splashes: Splash[] = [];
    const flakes: Flake[] = [];
    const stars: Star[] = [];
    const clouds: Cloud[] = [];
    const rays: Ray[] = [];
    const mist: Mist[] = [];
    const streaks: Streak[] = [];
    const leaves: Leaf[] = [];
    let nextFlashAt = 0;
    let flashAlpha = 0;
    let nextBoltAt = 0;
    let bolt: { points: Array<[number, number]>; alpha: number } | null = null;

    const k = condition.key;

    const seed = () => {
      const W = w();
      const H = h();
      rain.length = splashes.length = flakes.length = stars.length = clouds.length = 0;
      rays.length = mist.length = streaks.length = leaves.length = 0;

      // RAIN
      if (k === 'rain' || k === 'heavyRain' || k === 'drizzle' || k === 'thunderstorm') {
        const base = k === 'drizzle' ? 140 : k === 'rain' ? 280 : 460;
        const density = Math.round(base * densityScale);
        const speedRange = k === 'drizzle' ? [400, 700] : k === 'heavyRain' || k === 'thunderstorm' ? [900, 1300] : [700, 1000];
        for (let i = 0; i < density; i++) {
          rain.push({
            x: Math.random() * (W + 200) - 100,
            y: Math.random() * H,
            vy: speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]),
            vx: windFactor * 60 + (Math.random() - 0.5) * 30,
            len: k === 'drizzle' ? 4 + Math.random() * 6 : 12 + Math.random() * 18,
            a: k === 'drizzle' ? 0.45 + Math.random() * 0.25 : 0.55 + Math.random() * 0.35,
          });
        }
      }

      // SNOW
      if (k === 'snow') {
        for (let i = 0; i < Math.round(180 * densityScale); i++) {
          flakes.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vy: 30 + Math.random() * 60,
            phase: Math.random() * Math.PI * 2,
            size: 1.5 + Math.random() * 3.2,
            a: 0.6 + Math.random() * 0.4,
          });
        }
      }

      // STARS (clear night)
      if (!condition.isDay && (k === 'clear' || k === 'partlyCloudy' || k === 'sunny')) {
        for (let i = 0; i < Math.round(220 * densityScale); i++) {
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H * 0.85,
            a: 0.5 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2,
            speed: 0.6 + Math.random() * 1.8,
          });
        }
      }

      // CLOUDS — only conditions that should actually show clouds. Sunny,
      // hot, windy, fog, and clear no longer spawn random clouds.
      if (k === 'cloudy' || k === 'partlyCloudy') {
        const count = k === 'cloudy' ? 12 : 5;
        for (let i = 0; i < count; i++) {
          clouds.push({
            x: Math.random() * W,
            y: 30 + Math.random() * (H * 0.55),
            scale: 0.9 + Math.random() * 1.6,
            speed: (10 + Math.random() * 18) * (windFactor !== 0 ? Math.sign(windFactor) : 1),
            a: condition.isDay ? 0.20 + Math.random() * 0.15 : 0.10 + Math.random() * 0.10,
            type: Math.random() > 0.6 ? 'wisp' : 'puffy',
          });
        }
      }

      // SUN RAYS (sunny / hot day)
      if (condition.isDay && (k === 'sunny' || k === 'hot')) {
        for (let i = 0; i < 14; i++) {
          rays.push({ a: (i / 14) * Math.PI * 2, speed: 0.06 + Math.random() * 0.05, phase: Math.random() });
        }
      }

      // FOG
      if (k === 'fog') {
        for (let i = 0; i < 20; i++) {
          mist.push({
            x: Math.random() * W,
            y: H * 0.2 + Math.random() * H * 0.8,
            r: 120 + Math.random() * 240,
            a: 0.10 + Math.random() * 0.10,
            speed: 6 + Math.random() * 10,
          });
        }
      }

      // WINDY
      if (k === 'windy') {
        for (let i = 0; i < Math.round(80 * densityScale); i++) {
          streaks.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: 500 + Math.random() * 600,
            len: 40 + Math.random() * 90,
            a: 0.18 + Math.random() * 0.22,
          });
        }
        // A few drifting leaves for season hint
        const leafColors = ['#fbbf24', '#f97316', '#a3a300', '#84cc16', '#eab308'];
        for (let i = 0; i < Math.round(8 * densityScale); i++) {
          leaves.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: 200 + Math.random() * 300,
            vy: 30 + Math.random() * 60,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 4,
            size: 6 + Math.random() * 6,
            color: leafColors[Math.floor(Math.random() * leafColors.length)],
          });
        }
      }
    };
    seed();

    const sunX = () => w() * 0.78;
    const sunY = () => h() * 0.22;

    let prev = performance.now();

    const drawPuffyCloud = (cx: number, cy: number, s: number, a: number) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = condition.isDay ? '#ffffff' : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 50 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 28 * s, cy + 6 * s, 32 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 28 * s, cy + 4 * s, 38 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 10 * s, cy - 10 * s, 24 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 14 * s, cy - 8 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    const drawWispCloud = (cx: number, cy: number, s: number, a: number) => {
      ctx.globalAlpha = a;
      ctx.strokeStyle = condition.isDay ? '#ffffff' : '#cbd5e1';
      ctx.lineWidth = 4 * s;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 60 * s, cy + i * 6 * s);
        ctx.bezierCurveTo(cx - 20 * s, cy + i * 6 * s - 4 * s, cx + 20 * s, cy + i * 6 * s + 4 * s, cx + 60 * s, cy + i * 6 * s);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const drawLightningBolt = (x: number, y: number) => {
      // Pre-compute a jagged polyline
      const pts: Array<[number, number]> = [[x, 0]];
      let cy = 0;
      const targetY = y;
      while (cy < targetY) {
        cy += 20 + Math.random() * 60;
        pts.push([x + (Math.random() - 0.5) * 80, cy]);
      }
      bolt = { points: pts, alpha: 1 };
    };

    const frame = (t: number) => {
      if (!running || paused) return;
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      const W = w();
      const H = h();
      ctx.clearRect(0, 0, W, H);

      // Sun glow — pulled WAY down because translucent card backgrounds
      // (bg-white/5) bleed-through anything bright on the canvas behind
      // them, making it look like the sun "overlays" the content.
      if (condition.isDay && (k === 'sunny' || k === 'hot' || k === 'partlyCloudy')) {
        const grad = ctx.createRadialGradient(sunX(), sunY(), 0, sunX(), sunY(), 130);
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.08)');
        grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.025)');
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        if (k === 'sunny' || k === 'hot') {
          ctx.save();
          ctx.translate(sunX(), sunY());
          for (const ray of rays) {
            ray.a += ray.speed * dt;
            const pulse = 0.5 + 0.2 * Math.sin(t / 400 + ray.phase * 6);
            ctx.rotate(ray.a);
            ctx.fillStyle = `rgba(253, 224, 71, ${0.018 * pulse})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(170, -7);
            ctx.lineTo(170, 7);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-ray.a);
          }
          ctx.restore();
        }

        ctx.fillStyle = 'rgba(253, 224, 71, 0.5)';
        ctx.beginPath();
        ctx.arc(sunX(), sunY(), 16, 0, Math.PI * 2);
        ctx.fill();

        // Hot: heat shimmer near bottom
        if (k === 'hot' ) {
          for (let i = 0; i < 6; i++) {
            const y = H - 20 - i * 8;
            const offset = Math.sin(t / 200 + i) * 4;
            ctx.fillStyle = `rgba(251, 191, 36, ${0.04 - i * 0.005})`;
            ctx.fillRect(0, y + offset, W, 3);
          }
        }
      }

      // Stars — twinkle visibly. Wider modulation (35%-100% of base alpha)
      // and faster phase so the eye actually catches the change. The
      // brightest ~15% of stars get an extra soft glow that pulses with
      // them so they sparkle.
      for (const s of stars) {
        s.phase += s.speed * dt * 1.4;
        const norm = 0.5 + 0.5 * Math.sin(s.phase); // 0..1
        const tw = 0.35 + 0.65 * norm;
        ctx.globalAlpha = Math.min(1, s.a * tw);
        ctx.fillStyle = '#ffffff';
        const sz = 1.6 + norm * 0.6;
        ctx.fillRect(s.x, s.y, sz, sz);
        if (s.a > 0.82) {
          ctx.globalAlpha = s.a * tw * 0.45;
          const g = 3.5 + norm * 2;
          ctx.fillRect(s.x - g / 2 + sz / 2, s.y - g / 2 + sz / 2, g, g);
        }
      }
      ctx.globalAlpha = 1;

      // Clouds
      for (const c of clouds) {
        c.x += c.speed * dt;
        if (c.x - 90 * c.scale > W) c.x = -90 * c.scale;
        if (c.x + 90 * c.scale < 0) c.x = W + 90 * c.scale;
        if (c.type === 'wisp') drawWispCloud(c.x, c.y, c.scale, c.a);
        else drawPuffyCloud(c.x, c.y, c.scale, c.a);
      }

      // Fog (heavy diffuse mist)
      if (k === 'fog') {
        for (const m of mist) {
          m.x += m.speed * dt;
          if (m.x - m.r > W) m.x = -m.r;
          const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
          grad.addColorStop(0, `rgba(226, 232, 240, ${m.a})`);
          grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
        }
        // Diffuse foreground veil so it actually feels foggy
        const veil = ctx.createLinearGradient(0, H * 0.4, 0, H);
        veil.addColorStop(0, 'rgba(226, 232, 240, 0)');
        veil.addColorStop(1, 'rgba(226, 232, 240, 0.18)');
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, W, H);
      }

      // Rain (with splashes near bottom)
      if (rain.length) {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.lineWidth = k === 'heavyRain' || k === 'thunderstorm' ? 1.5 : 1;
        for (const d of rain) {
          {
            d.y += d.vy * dt;
            d.x += d.vx * dt;
          }
          if (d.y > H - 4) {
            // Splash
            if (Math.random() < 0.3) splashes.push({ x: d.x, y: H - 6, r: 1, a: 0.6 });
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

        // Splashes
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
        ctx.lineWidth = 1;
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          {
            s.r += dt * 60;
            s.a -= dt * 1.8;
          }
          if (s.a <= 0) {
            splashes.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = s.a;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Snow (visible six-point flakes for the bigger ones)
      if (flakes.length) {
        ctx.fillStyle = '#f8fafc';
        for (const f of flakes) {
          {
            f.phase += dt * 0.9;
            f.y += f.vy * dt;
            f.x += Math.sin(f.phase) * 18 * dt + windFactor * 6 * dt;
          }
          if (f.y > H) {
            f.y = -10;
            f.x = Math.random() * W;
          }
          if (f.x > W + 10) f.x = -10;
          if (f.x < -10) f.x = W + 10;
          ctx.globalAlpha = f.a;
          if (f.size > 2.5) {
            // Six-point star
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 3; i++) {
              ctx.rotate(Math.PI / 3);
              ctx.beginPath();
              ctx.moveTo(-f.size, 0);
              ctx.lineTo(f.size, 0);
              ctx.stroke();
            }
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      // Wind streaks
      for (const s of streaks) {
        s.x += s.vx * dt;
        if (s.x > W + 100) {
          s.x = -100;
          s.y = Math.random() * H;
        }
        ctx.strokeStyle = `rgba(203, 213, 225, ${s.a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.len, s.y);
        ctx.stroke();
      }

      // Wind-blown leaves
      for (const lf of leaves) {
        {
          lf.x += lf.vx * dt;
          lf.y += lf.vy * dt + Math.sin(t / 300 + lf.rot) * 12 * dt;
          lf.rot += lf.vrot * dt;
        }
        if (lf.x > W + 30) {
          lf.x = -30;
          lf.y = Math.random() * H;
        }
        if (lf.y > H + 20) lf.y = -20;
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rot);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = lf.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, lf.size, lf.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      // Thunderstorm: occasional flash + lightning bolt
      if (k === 'thunderstorm') {
        if (t > nextFlashAt) {
          flashAlpha = 0.5 + Math.random() * 0.4;
          nextFlashAt = t + 3000 + Math.random() * 7000;
          if (t > nextBoltAt) {
            drawLightningBolt(W * (0.2 + Math.random() * 0.6), H * (0.3 + Math.random() * 0.5));
            nextBoltAt = t + 4000 + Math.random() * 8000;
          }
        }
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(226, 232, 240, ${flashAlpha})`;
          ctx.fillRect(0, 0, W, H);
          flashAlpha -= dt * 4;
          if (flashAlpha < 0) flashAlpha = 0;
        }
        if (bolt) {
          ctx.globalAlpha = bolt.alpha;
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < bolt.points.length; i++) {
            const [x, y] = bolt.points[i];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          // Glow
          ctx.lineWidth = 8;
          ctx.strokeStyle = `rgba(254, 249, 195, ${bolt.alpha * 0.3})`;
          ctx.stroke();
          bolt.alpha -= dt * 3;
          if (bolt.alpha <= 0) bolt = null;
          ctx.globalAlpha = 1;
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    const onVis = () => {
      paused = document.hidden;
      if (!paused && running) {
        prev = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [condition.key, condition.isDay, windMph]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: '100vw', height: '100vh' }}
      aria-hidden
    />
  );
}
