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
    type Comet = { x: number; y: number; vx: number; vy: number; len: number; a: number; life: number };
    type Ridge = { points: Array<[number, number]> };
    type Tree = { x: number; baseY: number; size: number; jitter: number };
    type Pond = { cx: number; cy: number; rx: number; ry: number };
    type Ripple = { x: number; y: number; r: number; a: number };

    const rain: Drop[] = [];
    const splashes: Splash[] = [];
    const flakes: Flake[] = [];
    const stars: Star[] = [];
    const clouds: Cloud[] = [];
    const rays: Ray[] = [];
    const mist: Mist[] = [];
    const streaks: Streak[] = [];
    const leaves: Leaf[] = [];
    const comets: Comet[] = [];
    // Scene elements (mountains / treeline silhouettes / pond / foreground trees).
    // Generated once per resize; mostly static, with sway + ripples on top.
    let mountains: Ridge | null = null;
    let treeline: Ridge | null = null;
    let pond: Pond | null = null;
    const trees: Tree[] = [];
    const ripples: Ripple[] = [];
    let nextCometAt = 0;
    let nebulaPhase = 0;
    let nextFlashAt = 0;
    let flashAlpha = 0;
    let nextBoltAt = 0;
    let bolt: { points: Array<[number, number]>; alpha: number } | null = null;

    const k = condition.key;

    const seed = () => {
      const W = w();
      const H = h();
      rain.length = splashes.length = flakes.length = stars.length = clouds.length = 0;
      rays.length = mist.length = streaks.length = leaves.length = comets.length = 0;
      ripples.length = trees.length = 0;
      mountains = treeline = pond = null;

      // SCENE — silhouette landscape that the weather plays out over. Skipped
      // for the pure space view; that one keeps its starfield-only background.
      if (k !== 'space') {
        // Distant mountain ridge — jagged polyline near horizon.
        const mtnY = H * 0.62;
        const mtnPts: Array<[number, number]> = [[-20, H + 20]];
        for (let i = 0; i <= 18; i++) {
          const x = (i / 18) * (W + 40) - 20;
          const peak = mtnY
            + Math.sin(i * 0.7) * 22
            + Math.sin(i * 1.9 + 1.3) * 14
            + (Math.random() - 0.5) * 18;
          mtnPts.push([x, peak]);
        }
        mtnPts.push([W + 20, H + 20]);
        mountains = { points: mtnPts };

        // Closer hills / treeline silhouette — taller bumps, more frequent.
        const tlY = H * 0.80;
        const tlPts: Array<[number, number]> = [[-20, H + 20]];
        for (let i = 0; i <= 32; i++) {
          const x = (i / 32) * (W + 40) - 20;
          const peak = tlY
            + Math.sin(i * 1.2) * 10
            + (i % 3 === 0 ? -10 - Math.random() * 14 : 0)
            + (Math.random() - 0.5) * 6;
          tlPts.push([x, peak]);
        }
        tlPts.push([W + 20, H + 20]);
        treeline = { points: tlPts };

        // Pond — wide ellipse centered horizontally near the bottom.
        pond = {
          cx: W * 0.5,
          cy: H * 0.93,
          rx: Math.min(W * 0.32, 360),
          ry: 18,
        };

        // Foreground trees flanking the pond.
        const treeCount = isMobile ? 5 : 9;
        for (let i = 0; i < treeCount; i++) {
          const onLeft = i % 2 === 0;
          const x = onLeft
            ? 20 + Math.random() * (W * 0.35 - 40)
            : W * 0.65 + Math.random() * (W * 0.35 - 40);
          trees.push({
            x,
            baseY: H * 0.90 + Math.random() * 14,
            size: 36 + Math.random() * 28,
            jitter: Math.random() * Math.PI * 2,
          });
        }
      }

      // SPACE — dense starfield, no other particles
      if (k === 'space') {
        for (let i = 0; i < Math.round(420 * densityScale); i++) {
          // Stars get a slight color tint via brightness (0..1) and use
          // their existing alpha for opacity. Concentrate brighter stars
          // upward where the page header is, fade slightly toward bottom.
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            a: 0.4 + Math.random() * 0.6,
            phase: Math.random() * Math.PI * 2,
            speed: 0.4 + Math.random() * 1.6,
          });
        }
        return;
      }

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
            a: condition.isDay ? 0.32 + Math.random() * 0.22 : 0.16 + Math.random() * 0.14,
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

    // Tucked into the actual top-right corner — close enough to the edge
    // that the corona feels like it's spilling in from outside, rather
    // than the sun sitting on top of content.
    const sunX = () => w() - 50;
    const sunY = () => 60;

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

    // ── Scene palette per condition ────────────────────────────────────────
    // Returns {mountain, treeline, tree, pond, snowy, frozen, lightFlash}.
    const scenePalette = () => {
      const isDay = condition.isDay;
      switch (k) {
        case 'thunderstorm':
          return { mtn: 'rgba(15, 23, 42, 0.70)', tl: 'rgba(8, 12, 24, 0.78)', tree: 'rgba(5, 10, 16, 0.85)', pond: 'rgba(2, 6, 23, 0.78)', snowy: false, frozen: false, lightFlash: true };
        case 'heavyRain':
          return { mtn: 'rgba(30, 41, 59, 0.60)', tl: 'rgba(20, 30, 45, 0.70)', tree: 'rgba(12, 22, 25, 0.78)', pond: 'rgba(15, 23, 42, 0.72)', snowy: false, frozen: false, lightFlash: false };
        case 'rain':
          return { mtn: 'rgba(40, 55, 75, 0.55)', tl: 'rgba(25, 38, 50, 0.65)', tree: 'rgba(18, 32, 30, 0.75)', pond: 'rgba(20, 35, 60, 0.65)', snowy: false, frozen: false, lightFlash: false };
        case 'drizzle':
          return { mtn: 'rgba(60, 80, 100, 0.50)', tl: 'rgba(40, 60, 70, 0.60)', tree: 'rgba(30, 55, 50, 0.70)', pond: 'rgba(56, 100, 140, 0.55)', snowy: false, frozen: false, lightFlash: false };
        case 'snow':
          return { mtn: 'rgba(100, 116, 139, 0.55)', tl: 'rgba(80, 95, 110, 0.65)', tree: 'rgba(50, 70, 65, 0.70)', pond: 'rgba(186, 230, 253, 0.55)', snowy: true, frozen: true, lightFlash: false };
        case 'fog':
          return { mtn: 'rgba(148, 163, 184, 0.20)', tl: 'rgba(120, 135, 150, 0.32)', tree: 'rgba(95, 110, 120, 0.45)', pond: 'rgba(148, 163, 184, 0.30)', snowy: false, frozen: false, lightFlash: false };
        case 'cold':
          return { mtn: 'rgba(51, 65, 85, 0.55)', tl: 'rgba(40, 55, 70, 0.65)', tree: 'rgba(30, 50, 50, 0.70)', pond: 'rgba(99, 102, 241, 0.45)', snowy: false, frozen: false, lightFlash: false };
        case 'cloudy':
          return { mtn: 'rgba(71, 85, 105, 0.50)', tl: 'rgba(55, 70, 85, 0.60)', tree: 'rgba(40, 55, 50, 0.70)', pond: 'rgba(71, 85, 105, 0.55)', snowy: false, frozen: false, lightFlash: false };
        case 'partlyCloudy':
          return isDay
            ? { mtn: 'rgba(82, 100, 130, 0.45)', tl: 'rgba(55, 80, 90, 0.55)', tree: 'rgba(36, 70, 50, 0.65)', pond: 'rgba(80, 150, 200, 0.50)', snowy: false, frozen: false, lightFlash: false }
            : { mtn: 'rgba(20, 28, 50, 0.60)', tl: 'rgba(10, 18, 35, 0.70)', tree: 'rgba(8, 15, 22, 0.75)', pond: 'rgba(15, 23, 50, 0.65)', snowy: false, frozen: false, lightFlash: false };
        case 'hot':
          return { mtn: 'rgba(120, 75, 60, 0.50)', tl: 'rgba(100, 60, 50, 0.60)', tree: 'rgba(60, 65, 35, 0.65)', pond: 'rgba(180, 120, 80, 0.50)', snowy: false, frozen: false, lightFlash: false };
        case 'sunny':
          return isDay
            ? { mtn: 'rgba(85, 110, 145, 0.45)', tl: 'rgba(55, 90, 100, 0.55)', tree: 'rgba(34, 80, 55, 0.65)', pond: 'rgba(100, 180, 220, 0.55)', snowy: false, frozen: false, lightFlash: false }
            : { mtn: 'rgba(15, 23, 50, 0.60)', tl: 'rgba(8, 15, 35, 0.70)', tree: 'rgba(5, 12, 20, 0.78)', pond: 'rgba(15, 30, 70, 0.65)', snowy: false, frozen: false, lightFlash: false };
        case 'clear':
        default:
          return isDay
            ? { mtn: 'rgba(100, 130, 160, 0.45)', tl: 'rgba(60, 95, 110, 0.55)', tree: 'rgba(34, 75, 50, 0.65)', pond: 'rgba(110, 180, 220, 0.55)', snowy: false, frozen: false, lightFlash: false }
            : { mtn: 'rgba(20, 28, 55, 0.55)', tl: 'rgba(12, 20, 40, 0.65)', tree: 'rgba(8, 14, 22, 0.75)', pond: 'rgba(20, 35, 70, 0.60)', snowy: false, frozen: false, lightFlash: false };
      }
    };

    const drawScene = (now: number) => {
      if (k === 'space' || !mountains || !treeline || !pond) return;
      const W = w();
      const H = h();
      const pal = scenePalette();
      // If a lightning flash is active, briefly brighten the whole scene.
      const flashBoost = pal.lightFlash && flashAlpha > 0.4 ? Math.min(0.35, flashAlpha * 0.35) : 0;

      // Distant mountains
      ctx.fillStyle = pal.mtn;
      ctx.beginPath();
      ctx.moveTo(mountains.points[0][0], mountains.points[0][1]);
      for (const p of mountains.points) ctx.lineTo(p[0], p[1]);
      ctx.closePath();
      ctx.fill();

      // Closer treeline silhouette
      ctx.fillStyle = pal.tl;
      ctx.beginPath();
      ctx.moveTo(treeline.points[0][0], treeline.points[0][1]);
      for (const p of treeline.points) ctx.lineTo(p[0], p[1]);
      ctx.closePath();
      ctx.fill();

      // Pond surface
      ctx.fillStyle = pal.pond;
      ctx.beginPath();
      ctx.ellipse(pond.cx, pond.cy, pond.rx, pond.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Subtle highlight on top half of pond for shape
      const reflG = ctx.createLinearGradient(pond.cx, pond.cy - pond.ry, pond.cx, pond.cy);
      reflG.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      reflG.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = reflG;
      ctx.beginPath();
      ctx.ellipse(pond.cx, pond.cy - pond.ry * 0.25, pond.rx * 0.95, pond.ry * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Frozen pond — faint hairline cracks
      if (pal.frozen) {
        ctx.strokeStyle = 'rgba(241, 245, 249, 0.35)';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 6; i++) {
          const sx = pond.cx + ((i - 3) / 3) * pond.rx * 0.85;
          ctx.beginPath();
          ctx.moveTo(sx, pond.cy - pond.ry * 0.7);
          ctx.lineTo(sx + (Math.random() - 0.5) * 30, pond.cy + pond.ry * 0.7);
          ctx.stroke();
        }
      }

      // Foreground trees — pine-style, 3 stacked triangles per tree.
      // Sway: trees on cyclic motion driven by wind speed and per-tree jitter.
      for (const tr of trees) {
        const tBase = (now / 1000);
        const swayAmount = (Math.abs(windFactor) * 0.08 + 0.012)
          * Math.sin(tBase * (1.0 + windFactor * 0.05) + tr.jitter);

        ctx.save();
        ctx.translate(tr.x, tr.baseY);
        ctx.rotate(swayAmount);

        // Trunk
        ctx.fillStyle = 'rgba(46, 30, 18, 0.78)';
        ctx.fillRect(-tr.size * 0.06, -tr.size * 0.18, tr.size * 0.12, tr.size * 0.22);

        // 3 layered triangles, top → bottom
        const layers = 3;
        for (let i = 0; i < layers; i++) {
          const baseW = tr.size * (0.95 - i * 0.18);
          const triH = tr.size * 0.42;
          const yTop = -tr.size * 0.18 - (layers - 1 - i) * tr.size * 0.30;
          ctx.fillStyle = pal.tree;
          ctx.beginPath();
          ctx.moveTo(0, yTop);
          ctx.lineTo(-baseW, yTop + triH);
          ctx.lineTo(baseW, yTop + triH);
          ctx.closePath();
          ctx.fill();
          if (pal.snowy) {
            // Snow cap on the top portion of each triangle
            ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
            ctx.beginPath();
            ctx.moveTo(0, yTop);
            ctx.lineTo(-baseW * 0.42, yTop + triH * 0.32);
            ctx.lineTo(baseW * 0.42, yTop + triH * 0.32);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // Lightning flash boost — overlay a soft white wash on the scene area
      if (flashBoost > 0) {
        const lf = ctx.createLinearGradient(0, H * 0.55, 0, H);
        lf.addColorStop(0, `rgba(226, 232, 240, ${flashBoost})`);
        lf.addColorStop(1, `rgba(226, 232, 240, 0)`);
        ctx.fillStyle = lf;
        ctx.fillRect(0, H * 0.55, W, H * 0.45);
      }
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

      // Whole-canvas color wash that tints the scene to the current weather.
      // Cards on top are opaque enough that this reads as ambient mood
      // rather than bleed-through. Tones the whole viewport with a soft
      // gradient sympathetic to the condition.
      const wash = ctx.createLinearGradient(0, 0, 0, H);
      if (k === 'thunderstorm') {
        wash.addColorStop(0, 'rgba(67, 56, 202, 0.22)');
        wash.addColorStop(0.6, 'rgba(30, 27, 75, 0.18)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.10)');
      } else if (k === 'heavyRain' || k === 'rain') {
        wash.addColorStop(0, 'rgba(30, 64, 175, 0.18)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
      } else if (k === 'drizzle') {
        wash.addColorStop(0, 'rgba(56, 189, 248, 0.10)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.04)');
      } else if (k === 'snow') {
        wash.addColorStop(0, 'rgba(186, 230, 253, 0.14)');
        wash.addColorStop(1, 'rgba(241, 245, 249, 0.06)');
      } else if (k === 'fog') {
        wash.addColorStop(0, 'rgba(203, 213, 225, 0.16)');
        wash.addColorStop(1, 'rgba(148, 163, 184, 0.20)');
      } else if (k === 'windy') {
        wash.addColorStop(0, 'rgba(20, 184, 166, 0.10)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
      } else if (k === 'hot') {
        wash.addColorStop(0, 'rgba(249, 115, 22, 0.20)');
        wash.addColorStop(0.6, 'rgba(245, 158, 11, 0.12)');
        wash.addColorStop(1, 'rgba(127, 29, 29, 0.08)');
      } else if (k === 'cold') {
        wash.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
        wash.addColorStop(1, 'rgba(30, 58, 138, 0.10)');
      } else if (k === 'sunny' && condition.isDay) {
        wash.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
        wash.addColorStop(0.5, 'rgba(253, 224, 71, 0.10)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.04)');
      } else if (k === 'partlyCloudy' && condition.isDay) {
        wash.addColorStop(0, 'rgba(56, 189, 248, 0.10)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.04)');
      } else if (k === 'space') {
        wash.addColorStop(0, 'rgba(30, 27, 75, 0.32)');
        wash.addColorStop(0.5, 'rgba(67, 30, 75, 0.18)');
        wash.addColorStop(1, 'rgba(2, 6, 23, 0.40)');
      } else if (k === 'cloudy') {
        wash.addColorStop(0, 'rgba(100, 116, 139, 0.14)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.06)');
      } else if (!condition.isDay) {
        // Clear / partly-cloudy night
        wash.addColorStop(0, 'rgba(30, 27, 75, 0.18)');
        wash.addColorStop(1, 'rgba(2, 6, 23, 0.10)');
      } else {
        wash.addColorStop(0, 'rgba(15, 23, 42, 0.04)');
        wash.addColorStop(1, 'rgba(15, 23, 42, 0.04)');
      }
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, W, H);

      // SPACE — nebula clouds + comets layered on top of the deep wash.
      if (k === 'space') {
        nebulaPhase += dt * 0.04;
        // Two slowly-shifting nebula blobs for depth
        const drawNebula = (
          cx: number,
          cy: number,
          r: number,
          inner: string,
          outer: string,
        ) => {
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, inner);
          g.addColorStop(1, outer);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        };
        const driftX = Math.sin(nebulaPhase) * 30;
        const driftY = Math.cos(nebulaPhase * 0.7) * 20;
        drawNebula(
          W * 0.25 + driftX,
          H * 0.35 + driftY,
          Math.max(W, H) * 0.55,
          'rgba(139, 92, 246, 0.18)', // violet
          'rgba(139, 92, 246, 0)',
        );
        drawNebula(
          W * 0.75 - driftX * 0.6,
          H * 0.7 - driftY,
          Math.max(W, H) * 0.5,
          'rgba(244, 114, 182, 0.14)', // pink
          'rgba(244, 114, 182, 0)',
        );
        drawNebula(
          W * 0.55,
          H * 0.15,
          Math.max(W, H) * 0.4,
          'rgba(56, 189, 248, 0.10)', // cyan
          'rgba(56, 189, 248, 0)',
        );

        // Spawn comets occasionally
        if (t > nextCometAt) {
          const fromLeft = Math.random() < 0.5;
          comets.push({
            x: fromLeft ? -50 : W + 50,
            y: Math.random() * H * 0.6,
            vx: (fromLeft ? 1 : -1) * (240 + Math.random() * 220),
            vy: 60 + Math.random() * 110,
            len: 80 + Math.random() * 70,
            a: 0.85 + Math.random() * 0.15,
            life: 1,
          });
          nextCometAt = t + 1800 + Math.random() * 4500;
        }

        // Draw + advance comets
        for (let i = comets.length - 1; i >= 0; i--) {
          const c = comets[i];
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          c.life -= dt * 0.35;
          if (c.life <= 0 || c.x < -200 || c.x > W + 200 || c.y > H + 200) {
            comets.splice(i, 1);
            continue;
          }
          // Trail (gradient line)
          const tailX = c.x - (c.vx / Math.hypot(c.vx, c.vy)) * c.len;
          const tailY = c.y - (c.vy / Math.hypot(c.vx, c.vy)) * c.len;
          const trail = ctx.createLinearGradient(tailX, tailY, c.x, c.y);
          trail.addColorStop(0, 'rgba(186, 230, 253, 0)');
          trail.addColorStop(0.6, `rgba(186, 230, 253, ${0.45 * c.a * c.life})`);
          trail.addColorStop(1, `rgba(255, 255, 255, ${0.95 * c.a * c.life})`);
          ctx.strokeStyle = trail;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
          // Head (bright dot + soft glow)
          ctx.fillStyle = `rgba(255, 255, 255, ${c.a * c.life})`;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(186, 230, 253, ${0.4 * c.a * c.life})`;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Cleaner sun: tucked into the corner, with a multi-stop radial core
      // (white-hot center → warm yellow → orange edge), a soft outer
      // corona, and thin hairline rays that gently pulse instead of
      // chunky filled triangles.
      if (condition.isDay && (k === 'sunny' || k === 'hot' || k === 'partlyCloudy')) {
        const cx = sunX();
        const cy = sunY();
        const coreR = 18;
        const coronaR = k === 'partlyCloudy' ? 140 : 200;

        // Wide soft corona
        const corona = ctx.createRadialGradient(cx, cy, 0, cx, cy, coronaR);
        corona.addColorStop(0, 'rgba(254, 240, 138, 0.30)');
        corona.addColorStop(0.4, 'rgba(251, 191, 36, 0.12)');
        corona.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = corona;
        ctx.fillRect(0, 0, W, H);

        if (k === 'sunny' || k === 'hot') {
          // Hairline rays — 12 thin lines fading toward the tip, pulsing
          // gently in opacity. Looks like sunbeams rather than triangles.
          ctx.save();
          ctx.translate(cx, cy);
          ctx.lineCap = 'round';
          for (const ray of rays) {
            ray.a += ray.speed * dt * 0.4;
            const pulse = 0.55 + 0.45 * Math.sin(t / 600 + ray.phase * 5);
            ctx.rotate(ray.a);
            const inner = coreR + 6;
            const outer = coreR + 90 + pulse * 30;
            const grad = ctx.createLinearGradient(inner, 0, outer, 0);
            grad.addColorStop(0, `rgba(254, 240, 138, ${0.55 * pulse})`);
            grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(inner, 0);
            ctx.lineTo(outer, 0);
            ctx.stroke();
            ctx.rotate(-ray.a);
          }
          ctx.restore();
        }

        // Sun core — multi-stop radial so the disk has depth instead of
        // reading as a flat dot.
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        core.addColorStop(0, 'rgba(255, 251, 235, 1)');
        core.addColorStop(0.5, 'rgba(253, 224, 71, 1)');
        core.addColorStop(1, 'rgba(251, 146, 60, 0.9)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();

        // Hot: heat shimmer near bottom
        if (k === 'hot') {
          for (let i = 0; i < 6; i++) {
            const y = H - 20 - i * 8;
            const offset = Math.sin(t / 200 + i) * 4;
            ctx.fillStyle = `rgba(251, 191, 36, ${0.10 - i * 0.012})`;
            ctx.fillRect(0, y + offset, W, 3);
          }
        }
      }

      // Moon for clear / partly-cloudy nights — gives the night sky an
      // anchor instead of just stars on a flat gradient.
      if (!condition.isDay && (k === 'clear' || k === 'partlyCloudy' || k === 'sunny')) {
        const mx = w() * 0.78;
        const my = h() * 0.22;
        const moonGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 90);
        moonGlow.addColorStop(0, 'rgba(226, 232, 240, 0.28)');
        moonGlow.addColorStop(1, 'rgba(226, 232, 240, 0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
        ctx.beginPath();
        ctx.arc(mx, my, 18, 0, Math.PI * 2);
        ctx.fill();
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

      // SCENE — silhouette landscape (mountains + treeline + pond + trees).
      // Painted between the sky elements (stars/sun/moon) and the
      // atmospheric particles (clouds/rain/fog) so clouds float in front of
      // mountains and rain falls in front of trees.
      drawScene(t);

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

      // Rain (with splashes near bottom + pond ripples). Drops landing in
      // the pond ellipse spawn a circular ripple instead of a ground splash.
      // Density of rain already scales with intensity (drizzle/rain/heavy),
      // so ripple frequency naturally tracks the rainfall amount.
      if (rain.length) {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.lineWidth = k === 'heavyRain' || k === 'thunderstorm' ? 1.5 : 1;
        const rippleSpawnChance =
          k === 'heavyRain' || k === 'thunderstorm' ? 0.55 :
          k === 'rain' ? 0.35 :
          0.18; // drizzle
        for (const d of rain) {
          {
            d.y += d.vy * dt;
            d.x += d.vx * dt;
          }
          // Pond hit detection — drop ends its life when it meets the water.
          // Compares (x - cx)^2 / rx^2 + (y - cy)^2 / ry^2 <= 1, but only
          // accepts hits on the upper half of the ellipse (water surface).
          if (pond) {
            const dx = (d.x - pond.cx) / pond.rx;
            const dy = (d.y - pond.cy) / pond.ry;
            if (dx * dx + dy * dy <= 1 && d.y <= pond.cy) {
              if (Math.random() < rippleSpawnChance) {
                ripples.push({
                  x: d.x,
                  y: pond.cy + (d.y - pond.cy) * 0.3,
                  r: 0.8,
                  a: 0.6 + Math.random() * 0.25,
                });
              }
              d.y = -20;
              d.x = Math.random() * (W + 200) - 100;
            }
          }
          if (d.y > H - 4) {
            // Splash on ground
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

        // Pond ripples — concentric ovals fading out. Drawn after the rain
        // so they appear to be on the water surface.
        if (ripples.length) {
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
          ctx.lineWidth = 1;
          for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += dt * 28;
            rp.a -= dt * 1.0;
            if (rp.a <= 0) {
              ripples.splice(i, 1);
              continue;
            }
            ctx.globalAlpha = rp.a;
            ctx.beginPath();
            // Compress vertically since the pond is an ellipse seen at an angle
            ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

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
