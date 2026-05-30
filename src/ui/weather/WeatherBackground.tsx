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

    type Drop = { x: number; y: number; vy: number; vx: number; len: number; a: number; layer: 1|2|3 };
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
    // Fish that periodically arcs out of the pond. We track its origin x on
    // the pond surface, an apex height, and a parametric t (0→1) along the
    // arc. When t crosses 1 it splashes back in and spawns a ripple.
    type Fish = { startX: number; surfaceY: number; t: number; duration: number; apex: number; dir: 1 | -1 };
    // Ground details (grass blades + rocks + flowers) — seeded once per
    // resize so they don't shimmer each frame.
    type Grass = { x: number; y: number; h: number; lean: number; blades: number };
    type Rock = { x: number; y: number; w: number; h: number; tone: 'gray' | 'brown' };
    type Flower = { x: number; y: number; color: string; stemH: number };
    // Distant background trees on the horizon — smaller, lighter, drawn
    // in atmospheric haze for depth.
    type FarTree = { x: number; y: number; size: number };

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
    const farTrees: FarTree[] = [];
    const grass: Grass[] = [];
    const rocks: Rock[] = [];
    const flowers: Flower[] = [];
    const ripples: Ripple[] = [];
    const fish: Fish[] = [];
    let nextFishAt = 0;
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
      farTrees.length = grass.length = rocks.length = flowers.length = 0;
      fish.length = 0;
      // First fish appears 3-8s after seed
      nextFishAt = performance.now() + 3000 + Math.random() * 5000;
      mountains = treeline = pond = null;

      // SCENE — half-sky, half-ground composition. Skipped for the pure
      // space view; that one keeps its starfield-only background.
      if (k !== 'space') {
        // Horizon at ~52% — gives roughly half sky / half ground, with a
        // slight ground bias since the foreground reads better with a bit
        // more real estate.
        const horizonY = H * 0.52;

        // Treeline — the wavy edge where ground meets sky. Acts as both a
        // distant-treetops silhouette and the top boundary of the ground
        // fill. Bumps are gentle (this is a meadow, not jagged hills).
        const tlPts: Array<[number, number]> = [[-20, H + 20], [-20, horizonY]];
        for (let i = 0; i <= 40; i++) {
          const x = (i / 40) * (W + 40) - 20;
          const peak = horizonY
            + Math.sin(i * 0.9) * 8
            + Math.sin(i * 2.3 + 1.1) * 4
            + (i % 4 === 0 ? -6 - Math.random() * 10 : 0)
            + (Math.random() - 0.5) * 4;
          tlPts.push([x, peak]);
        }
        tlPts.push([W + 20, horizonY], [W + 20, H + 20]);
        treeline = { points: tlPts };

        // Distant background trees just behind the horizon — small,
        // softened color for atmospheric haze. Drawn before the ground
        // fill so they only peek out above the treeline.
        const farTreeCount = isMobile ? 8 : 16;
        for (let i = 0; i < farTreeCount; i++) {
          farTrees.push({
            x: 10 + Math.random() * (W - 20),
            y: horizonY - 4 - Math.random() * 8,
            size: 10 + Math.random() * 14,
          });
        }

        // Pond — sits in the middle-lower portion so foreground trees can
        // flank AND poke past it. Slightly off-center.
        pond = {
          cx: W * 0.5 + (Math.random() - 0.5) * 60,
          cy: H * 0.80,
          rx: Math.min(W * 0.30, 320),
          ry: 22,
        };

        // Foreground forest — trees scattered through the whole lower
        // half, both behind and in front of the pond. Sizes correlate with
        // depth (smaller = farther back / higher up).
        const treeCount = isMobile ? 16 : 28;
        for (let i = 0; i < treeCount; i++) {
          // Bias x toward the sides but allow some across the middle
          const side = Math.random() < 0.5 ? -1 : 1;
          const x = side < 0
            ? Math.random() * W * 0.42
            : W * 0.58 + Math.random() * W * 0.42;
          const baseY = H * 0.62 + Math.random() * (H * 0.32);
          // Scale by depth — trees lower on canvas (closer) are larger
          const depthFactor = (baseY - H * 0.62) / (H * 0.32);
          const size = 30 + depthFactor * 50 + Math.random() * 14;
          trees.push({ x, baseY, size, jitter: Math.random() * Math.PI * 2 });
        }
        // Sort back-to-front so taller foreground trees overlap distant ones
        trees.sort((a, b) => a.baseY - b.baseY);

        // Grass tufts scattered across the ground. More density toward
        // the foreground for a fuller-looking lawn.
        const grassCount = isMobile ? 60 : 110;
        for (let i = 0; i < grassCount; i++) {
          // Bias y toward the bottom (foreground density)
          const ty = horizonY + 12 + Math.pow(Math.random(), 0.6) * (H - horizonY - 16);
          grass.push({
            x: Math.random() * W,
            y: ty,
            // Bigger blades closer to the camera
            h: 4 + ((ty - horizonY) / (H - horizonY)) * 10 + Math.random() * 4,
            lean: (Math.random() - 0.5) * 0.6,
            blades: 3 + Math.floor(Math.random() * 3),
          });
        }

        // Rocks — small scatter, mostly clustered around the pond edge
        // but a few elsewhere on the ground.
        const rockCount = isMobile ? 8 : 14;
        for (let i = 0; i < rockCount; i++) {
          const nearPond = Math.random() < 0.6;
          let rx: number, ry: number;
          if (nearPond) {
            // Tuck rocks around the pond rim
            const ang = Math.random() * Math.PI * 2;
            rx = pond.cx + Math.cos(ang) * (pond.rx + 8 + Math.random() * 14);
            ry = pond.cy + Math.sin(ang) * (pond.ry + 4 + Math.random() * 8);
          } else {
            rx = Math.random() * W;
            ry = horizonY + 20 + Math.random() * (H - horizonY - 30);
          }
          rocks.push({
            x: rx,
            y: ry,
            w: 6 + Math.random() * 14,
            h: 4 + Math.random() * 8,
            tone: Math.random() < 0.5 ? 'gray' : 'brown',
          });
        }

        // Wildflowers — tiny pops of color scattered through the meadow.
        const flowerPalette = ['#fde68a', '#f9a8d4', '#fbcfe8', '#fef3c7', '#ddd6fe'];
        const flowerCount = isMobile ? 22 : 40;
        for (let i = 0; i < flowerCount; i++) {
          const fy = horizonY + 14 + Math.pow(Math.random(), 0.5) * (H - horizonY - 18);
          flowers.push({
            x: Math.random() * W,
            y: fy,
            color: flowerPalette[Math.floor(Math.random() * flowerPalette.length)],
            stemH: 3 + Math.random() * 5,
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

      // RAIN — three depth layers: far (1), mid (2), near (3).
      // Near drops are longer/brighter with a teardrop leading dot;
      // far drops are faint/short to simulate atmospheric depth.
      if (k === 'rain' || k === 'heavyRain' || k === 'drizzle' || k === 'thunderstorm') {
        const base = k === 'drizzle' ? 140 : k === 'rain' ? 280 : 460;
        const density = Math.round(base * densityScale);
        const speedRange = k === 'drizzle' ? [400, 700] : k === 'heavyRain' || k === 'thunderstorm' ? [900, 1300] : [700, 1000];
        for (let i = 0; i < density; i++) {
          const isHeavy = k === 'heavyRain' || k === 'thunderstorm';
          const r = Math.random();
          const layer: 1|2|3 = r < 0.38 ? 1 : r < 0.72 ? 2 : 3;
          const baseLen = k === 'drizzle' ? 10 + Math.random() * 14 : isHeavy ? 26 + Math.random() * 32 : 20 + Math.random() * 26;
          const baseA = k === 'drizzle' ? 0.35 + Math.random() * 0.25 : isHeavy ? 0.60 + Math.random() * 0.30 : 0.50 + Math.random() * 0.30;
          const baseVy = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
          const lenScale = layer === 1 ? 0.42 : layer === 2 ? 0.70 : 1.0;
          const aScale   = layer === 1 ? 0.28 : layer === 2 ? 0.58 : 1.0;
          const vyScale  = layer === 1 ? 1.28 : layer === 2 ? 1.0  : 0.82;
          rain.push({
            x: Math.random() * (W + 200) - 100,
            y: Math.random() * H,
            vy: baseVy * vyScale,
            vx: windFactor * 70 + (Math.random() - 0.5) * 25,
            len: baseLen * lenScale,
            a: baseA * aScale,
            layer,
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
      // Build a single continuous bezier path that traces the cloud's outer
      // silhouette. The previous implementation stacked 5 ellipses in one
      // path which left visible "creases" where their edges overlapped —
      // those creases looked like little triangles, especially at low alpha.
      ctx.save();
      ctx.globalAlpha = a;

      // Soft drop shadow beneath the cloud for a hint of depth.
      const shadowG = ctx.createRadialGradient(cx, cy + 14 * s, 4 * s, cx, cy + 14 * s, 60 * s);
      shadowG.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
      shadowG.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowG;
      ctx.fillRect(cx - 70 * s, cy, 140 * s, 30 * s);

      // Build the cloud silhouette as one closed bezier path. Points trace
      // a series of bumps along the top edge and a smooth flat-ish bottom.
      ctx.fillStyle = condition.isDay ? '#fdfeff' : '#9aa8c2';
      ctx.beginPath();
      // Start at left edge, go counter-clockwise around the outline.
      ctx.moveTo(cx - 50 * s, cy + 4 * s);
      // Bump 1 (left lobe)
      ctx.bezierCurveTo(cx - 60 * s, cy - 14 * s, cx - 36 * s, cy - 22 * s, cx - 20 * s, cy - 14 * s);
      // Bump 2 (mid-left)
      ctx.bezierCurveTo(cx - 14 * s, cy - 26 * s, cx + 4 * s, cy - 28 * s, cx + 12 * s, cy - 18 * s);
      // Bump 3 (mid-right, taller)
      ctx.bezierCurveTo(cx + 18 * s, cy - 30 * s, cx + 38 * s, cy - 26 * s, cx + 42 * s, cy - 12 * s);
      // Bump 4 (right lobe)
      ctx.bezierCurveTo(cx + 58 * s, cy - 18 * s, cx + 62 * s, cy + 4 * s, cx + 48 * s, cy + 10 * s);
      // Smooth flat bottom
      ctx.bezierCurveTo(cx + 30 * s, cy + 18 * s, cx - 30 * s, cy + 18 * s, cx - 50 * s, cy + 4 * s);
      ctx.closePath();
      ctx.fill();

      // Subtle highlight along the top edge for volume
      const hlG = ctx.createLinearGradient(0, cy - 28 * s, 0, cy + 10 * s);
      hlG.addColorStop(0, condition.isDay ? 'rgba(255, 255, 255, 0.55)' : 'rgba(203, 213, 225, 0.35)');
      hlG.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hlG;
      ctx.fill(); // re-fill the same path with the highlight gradient

      ctx.restore();
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
    // Scene palette per condition. Each entry returns colors for the
    // treeline/foliage + pond (with gradient stops + rim) and weather
    // modifiers (snowy/frozen/lightFlash). `mtn` is no longer painted but
    // kept on the type for backward compatibility.
    type ScenePal = {
      mtn: string;
      tl: string;
      tree: string;
      treeHighlight: string;
      treeShadow: string;
      pond: string;
      pondDark: string;
      pondRim: string;
      groundNear: string;
      groundFar: string;
      grassColor: string;
      grassHighlight: string;
      snowy: boolean;
      frozen: boolean;
      lightFlash: boolean;
    };
    const scenePalette = (): ScenePal => {
      const isDay = condition.isDay;
      // Helpers to build the derived shades from one base "tree" color
      const tree = (rgb: string, a = 1): ScenePal['tree'] => `rgba(${rgb}, ${a})`;
      const lighten = (rgb: string, a = 0.4) => {
        const [r, g, b] = rgb.split(',').map((n) => Math.min(255, Number(n.trim()) + 50));
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      };
      const darken = (rgb: string, a = 1) => {
        const [r, g, b] = rgb.split(',').map((n) => Math.max(0, Number(n.trim()) - 35));
        return `rgba(${r}, ${g}, ${b}, ${a})`;
      };
      const make = (
        opts: {
          tl: string;
          treeRgb: string;
          pondRgb: string;
          pondDarkRgb: string;
          groundFarRgb?: string;
          groundNearRgb?: string;
          snowy?: boolean;
          frozen?: boolean;
          lightFlash?: boolean;
        },
      ): ScenePal => {
        // Default ground tones derived from the tree color (washed-out
        // version) — keeps the meadow visually tied to the trees.
        const groundFarRgb = opts.groundFarRgb ?? lightenRgb(opts.treeRgb, 30);
        const groundNearRgb = opts.groundNearRgb ?? darkenRgb(opts.treeRgb, 8);
        return {
          mtn: opts.tl,
          tl: opts.tl,
          tree: tree(opts.treeRgb, 0.96),
          treeHighlight: lighten(opts.treeRgb, 0.28),
          treeShadow: 'rgba(46, 30, 18, 0.85)',
          pond: tree(opts.pondRgb, 0.88),
          pondDark: tree(opts.pondDarkRgb, 0.92),
          pondRim: darken(opts.pondDarkRgb, 0.6),
          groundNear: `rgba(${groundNearRgb}, 0.95)`,
          groundFar: `rgba(${groundFarRgb}, 0.95)`,
          grassColor: lighten(opts.treeRgb, 0.85),
          grassHighlight: `rgba(${lightenRgb(opts.treeRgb, 60)}, 0.95)`,
          snowy: !!opts.snowy,
          frozen: !!opts.frozen,
          lightFlash: !!opts.lightFlash,
        };
      };
      // Helpers returning a raw "r, g, b" triple so they can be re-used in
      // gradients (CSS rgba() syntax needs a comma between rgb and alpha).
      function lightenRgb(rgb: string, by = 50): string {
        const [r, g, b] = rgb.split(',').map((n) => Math.min(255, Number(n.trim()) + by));
        return `${r}, ${g}, ${b}`;
      }
      function darkenRgb(rgb: string, by = 35): string {
        const [r, g, b] = rgb.split(',').map((n) => Math.max(0, Number(n.trim()) - by));
        return `${r}, ${g}, ${b}`;
      }
      switch (k) {
        case 'thunderstorm':
          return make({ tl: 'rgba(35, 50, 78, 0.96)', treeRgb: '22, 44, 42', pondRgb: '30, 55, 88', pondDarkRgb: '16, 32, 60', groundFarRgb: '55, 80, 82', groundNearRgb: '32, 52, 55', lightFlash: true });
        case 'heavyRain':
          return make({ tl: 'rgba(48, 72, 98, 0.95)', treeRgb: '30, 62, 60', pondRgb: '48, 82, 118', pondDarkRgb: '26, 52, 92', groundFarRgb: '60, 88, 88', groundNearRgb: '38, 62, 64' });
        case 'rain':
          return make({ tl: 'rgba(62, 92, 115, 0.92)', treeRgb: '40, 78, 72', pondRgb: '68, 118, 155', pondDarkRgb: '40, 88, 130', groundFarRgb: '72, 105, 105', groundNearRgb: '48, 80, 82' });
        case 'drizzle':
          return make({ tl: 'rgba(80, 112, 138, 0.90)', treeRgb: '52, 108, 92', pondRgb: '98, 150, 188', pondDarkRgb: '65, 115, 160', groundFarRgb: '88, 120, 118', groundNearRgb: '58, 98, 98' });
        case 'snow':
          return make({ tl: 'rgba(150, 170, 195, 0.95)', treeRgb: '70, 100, 90', pondRgb: '186, 230, 253', pondDarkRgb: '140, 195, 230', snowy: true, frozen: true });
        case 'fog':
          return make({ tl: 'rgba(140, 160, 180, 0.65)', treeRgb: '105, 130, 130', pondRgb: '165, 180, 200', pondDarkRgb: '130, 150, 175' });
        case 'cold':
          return make({ tl: 'rgba(85, 110, 140, 0.92)', treeRgb: '50, 90, 90', pondRgb: '110, 135, 200', pondDarkRgb: '70, 100, 160' });
        case 'cloudy':
          return make({ tl: 'rgba(95, 120, 145, 0.92)', treeRgb: '60, 105, 90', pondRgb: '105, 140, 170', pondDarkRgb: '70, 105, 140' });
        case 'partlyCloudy':
          return isDay
            ? make({ tl: 'rgba(95, 140, 160, 0.92)', treeRgb: '55, 130, 90', pondRgb: '120, 195, 240', pondDarkRgb: '80, 155, 205' })
            : make({ tl: 'rgba(50, 70, 105, 0.95)', treeRgb: '30, 60, 65', pondRgb: '55, 85, 140', pondDarkRgb: '30, 55, 105' });
        case 'hot':
          return make({ tl: 'rgba(150, 105, 90, 0.92)', treeRgb: '105, 125, 65', pondRgb: '215, 160, 125', pondDarkRgb: '175, 120, 90' });
        case 'sunny':
          return isDay
            ? make({ tl: 'rgba(100, 145, 160, 0.92)', treeRgb: '60, 140, 95', pondRgb: '125, 210, 250', pondDarkRgb: '80, 170, 220' })
            : make({ tl: 'rgba(45, 65, 100, 0.95)', treeRgb: '25, 55, 55', pondRgb: '55, 85, 140', pondDarkRgb: '30, 55, 105' });
        case 'clear':
        default:
          return isDay
            ? make({ tl: 'rgba(100, 150, 165, 0.92)', treeRgb: '60, 135, 90', pondRgb: '135, 210, 250', pondDarkRgb: '90, 170, 220' })
            : make({ tl: 'rgba(50, 70, 105, 0.95)', treeRgb: '30, 55, 60', pondRgb: '60, 95, 150', pondDarkRgb: '35, 70, 115' });
      }
    };

    let lastSceneTime = 0;
    const drawScene = (now: number) => {
      // Mountains were removed from the scene but the guard still required
      // them — that meant `mountains === null` returned early before any
      // ground rendering ran, and the user saw no ground at all.
      if (k === 'space' || !treeline || !pond) return;
      const sceneDt = lastSceneTime ? Math.min(0.05, (now - lastSceneTime) / 1000) : 0.016;
      lastSceneTime = now;
      const W = w();
      const H = h();
      const pal = scenePalette();
      // If a lightning flash is active, briefly brighten the whole scene.
      const flashBoost = pal.lightFlash && flashAlpha > 0.4 ? Math.min(0.35, flashAlpha * 0.35) : 0;

      // Horizon Y — recompute from the second treeline point (the first
      // point is the off-canvas anchor at bottom-left for the fill polygon).
      const horizonY = treeline.points[1][1];

      // ── Distant background trees (peek above the horizon) ────────
      // Drawn BEFORE the ground fill so they only appear in the sky band
      // above the treeline silhouette. Lighter color for atmospheric haze.
      for (const ft of farTrees) {
        ctx.fillStyle = pal.treeHighlight;
        ctx.beginPath();
        const tw = ft.size * 0.55;
        const th = ft.size;
        ctx.moveTo(ft.x - tw, ft.y);
        ctx.bezierCurveTo(ft.x - tw * 1.1, ft.y - th * 0.5, ft.x - tw * 0.4, ft.y - th, ft.x, ft.y - th);
        ctx.bezierCurveTo(ft.x + tw * 0.4, ft.y - th, ft.x + tw * 1.1, ft.y - th * 0.5, ft.x + tw, ft.y);
        ctx.closePath();
        ctx.fill();
      }

      // ── Ground fill ──────────────────────────────────────────────
      // Gradient from horizon (lighter, hazy) down to bottom (richer/darker).
      // The treeline polyline forms the top edge so the meadow meets the
      // sky in a wavy silhouette rather than a flat horizon line.
      const groundG = ctx.createLinearGradient(0, horizonY, 0, H);
      groundG.addColorStop(0, pal.groundFar);
      groundG.addColorStop(1, pal.groundNear);
      ctx.fillStyle = groundG;
      ctx.beginPath();
      ctx.moveTo(treeline.points[1][0], treeline.points[1][1]);
      // Trace the wavy top edge (skip the off-canvas anchor points)
      for (let i = 1; i < treeline.points.length - 1; i++) {
        ctx.lineTo(treeline.points[i][0], treeline.points[i][1]);
      }
      // Close along the right edge → bottom → left edge
      ctx.lineTo(W + 20, H + 20);
      ctx.lineTo(-20, H + 20);
      ctx.closePath();
      ctx.fill();

      // Subtle haze band right at the horizon — softens the ground/sky
      // transition so it doesn't read as a hard color step.
      const hazeG = ctx.createLinearGradient(0, horizonY - 6, 0, horizonY + 30);
      hazeG.addColorStop(0, 'rgba(255, 255, 255, 0)');
      hazeG.addColorStop(0.5, pal.tl);
      hazeG.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hazeG;
      ctx.fillRect(0, horizonY - 6, W, 36);

      // ── Pond ──────────────────────────────────────────────────────
      // Irregular organic outline + gradient + subtle reedy edge instead
      // of a flat ellipse — reads as actual water rather than a paint blob.
      const p = pond; // narrow once for the closure
      const pondPath = () => {
        ctx.beginPath();
        // Trace an ellipse but jitter each control point slightly so the
        // shoreline isn't perfectly mathematical.
        const steps = 32;
        for (let i = 0; i <= steps; i++) {
          const ang = (i / steps) * Math.PI * 2;
          const wob = 1 + Math.sin(ang * 3 + p.cx * 0.01) * 0.04
                       + Math.sin(ang * 5 + p.cy * 0.013) * 0.02;
          const x = p.cx + Math.cos(ang) * p.rx * wob;
          const y = p.cy + Math.sin(ang) * p.ry * wob;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      // Base water — vertical gradient (lighter near the back, darker
      // toward the foreground for that "looking across water" feel)
      const pondG = ctx.createLinearGradient(pond.cx, pond.cy - pond.ry, pond.cx, pond.cy + pond.ry);
      pondG.addColorStop(0, pal.pond);
      pondG.addColorStop(1, pal.pondDark);
      ctx.fillStyle = pondG;
      pondPath();
      ctx.fill();
      // Bright skyline reflection band along the back edge
      const reflG = ctx.createLinearGradient(pond.cx, pond.cy - pond.ry, pond.cx, pond.cy);
      reflG.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      reflG.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = reflG;
      ctx.beginPath();
      ctx.ellipse(pond.cx, pond.cy - pond.ry * 0.3, pond.rx * 0.93, pond.ry * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dark waterline rim along the front edge for depth
      ctx.strokeStyle = pal.pondRim;
      ctx.lineWidth = 1.2;
      pondPath();
      ctx.stroke();

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

      // ── Ground details: rocks + grass + flowers ──────────────────
      // Rocks first (bottom layer) — irregular bezier blobs in gray or
      // brown, with a darker base shadow for grounding.
      for (const rk of rocks) {
        const rgb = rk.tone === 'gray' ? '128, 128, 132' : '120, 96, 72';
        // Shadow
        ctx.fillStyle = `rgba(${rgb}, 0.4)`;
        ctx.beginPath();
        ctx.ellipse(rk.x, rk.y + rk.h * 0.35, rk.w * 0.9, rk.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Main rock body — bezier blob, mostly round but a bit irregular
        ctx.fillStyle = `rgba(${rgb}, 0.92)`;
        ctx.beginPath();
        ctx.moveTo(rk.x - rk.w, rk.y);
        ctx.bezierCurveTo(rk.x - rk.w * 1.05, rk.y - rk.h * 0.7, rk.x - rk.w * 0.3, rk.y - rk.h, rk.x + rk.w * 0.1, rk.y - rk.h * 0.9);
        ctx.bezierCurveTo(rk.x + rk.w * 0.7, rk.y - rk.h * 0.85, rk.x + rk.w, rk.y - rk.h * 0.5, rk.x + rk.w, rk.y);
        ctx.bezierCurveTo(rk.x + rk.w * 0.6, rk.y + rk.h * 0.1, rk.x - rk.w * 0.4, rk.y + rk.h * 0.15, rk.x - rk.w, rk.y);
        ctx.closePath();
        ctx.fill();
        // Top highlight
        ctx.fillStyle = `rgba(255, 255, 255, 0.18)`;
        ctx.beginPath();
        ctx.ellipse(rk.x - rk.w * 0.2, rk.y - rk.h * 0.55, rk.w * 0.35, rk.h * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Grass tufts — each tuft is a small cluster of curved blades.
      // Blades sway slightly with wind.
      const grassSway = windFactor * 0.06;
      for (const g of grass) {
        const bladeColor = pal.grassColor;
        const bladeHi = pal.grassHighlight;
        const swayPhase = Math.sin(now / 800 + g.x * 0.02) * grassSway;
        for (let i = 0; i < g.blades; i++) {
          const offset = (i - (g.blades - 1) / 2) * 2.2;
          const lean = g.lean + swayPhase + (Math.random() - 0.5) * 0.001;
          const tipX = g.x + offset + lean * g.h;
          const tipY = g.y - g.h;
          ctx.strokeStyle = i === 0 ? bladeHi : bladeColor;
          ctx.lineWidth = 1.1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(g.x + offset, g.y);
          ctx.quadraticCurveTo(
            g.x + offset + lean * g.h * 0.5,
            g.y - g.h * 0.4,
            tipX,
            tipY,
          );
          ctx.stroke();
        }
      }

      // Wildflowers — short stem + small petal cluster. Tiny color pops
      // scattered through the meadow.
      for (const fl of flowers) {
        // Stem
        ctx.strokeStyle = pal.grassColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(fl.x, fl.y);
        ctx.lineTo(fl.x, fl.y - fl.stemH);
        ctx.stroke();
        // Petals (5 tiny dots in a ring + a center dot)
        const cy = fl.y - fl.stemH;
        ctx.fillStyle = fl.color;
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fl.x + Math.cos(ang) * 1.6, cy + Math.sin(ang) * 1.6, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(fl.x, cy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Foreground trees ──────────────────────────────────────────
      // Organic clustered foliage instead of stacked triangles. Each tree:
      //   • tapered trunk drawn as a gradient-shaded shape
      //   • multiple overlapping rounded foliage clusters in bezier curves
      //   • a soft highlight on the sunlit side for depth
      // Sway: cyclic motion driven by wind speed and per-tree jitter.
      const treeHi = pal.treeHighlight;
      const treeShadow = pal.treeShadow;
      for (const tr of trees) {
        const tBase = (now / 1000);
        const swayAmount = (Math.abs(windFactor) * 0.08 + 0.012)
          * Math.sin(tBase * (1.0 + windFactor * 0.05) + tr.jitter);

        ctx.save();
        ctx.translate(tr.x, tr.baseY);
        ctx.rotate(swayAmount);

        const s = tr.size;
        // Trunk: tapered (wider at base, narrower at top), with a darker
        // base shadow. Drawn as a closed bezier-edged shape.
        const trunkW = s * 0.10;
        const trunkH = s * 0.28;
        ctx.fillStyle = treeShadow;
        ctx.beginPath();
        ctx.moveTo(-trunkW * 0.5, 0);
        ctx.bezierCurveTo(-trunkW * 0.5, -trunkH * 0.3, -trunkW * 0.35, -trunkH * 0.8, -trunkW * 0.3, -trunkH);
        ctx.lineTo(trunkW * 0.3, -trunkH);
        ctx.bezierCurveTo(trunkW * 0.35, -trunkH * 0.8, trunkW * 0.5, -trunkH * 0.3, trunkW * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        // Foliage: 4 overlapping rounded clusters from bottom (wide) to top (narrow).
        // Each cluster is an irregular rounded shape via bezier curves.
        const drawCluster = (cy: number, w: number, h: number, fill: string) => {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(-w, cy);
          ctx.bezierCurveTo(-w * 1.1, cy - h * 0.4, -w * 0.6, cy - h, 0, cy - h);
          ctx.bezierCurveTo(w * 0.6, cy - h, w * 1.1, cy - h * 0.4, w, cy);
          ctx.bezierCurveTo(w * 0.9, cy + h * 0.18, w * 0.4, cy + h * 0.22, 0, cy + h * 0.18);
          ctx.bezierCurveTo(-w * 0.4, cy + h * 0.22, -w * 0.9, cy + h * 0.18, -w, cy);
          ctx.closePath();
          ctx.fill();
        };

        // Bottom cluster (largest, widest)
        drawCluster(-trunkH - s * 0.05, s * 0.55, s * 0.32, pal.tree);
        // Mid cluster
        drawCluster(-trunkH - s * 0.32, s * 0.46, s * 0.30, pal.tree);
        // Upper cluster
        drawCluster(-trunkH - s * 0.58, s * 0.35, s * 0.28, pal.tree);
        // Top tuft (small, slightly off-center for a less symmetric look)
        ctx.save();
        ctx.translate(s * 0.05, 0);
        drawCluster(-trunkH - s * 0.80, s * 0.22, s * 0.22, pal.tree);
        ctx.restore();

        // Highlight: small lighter cluster nudged to the sunlit side of
        // each existing cluster, drawn as proper foliage shapes so it
        // doesn't bleed into the surrounding sky like a source-atop hack
        // would. (Previous source-atop pass was visible as a translucent
        // ellipse hovering over each tree.)
        const drawHighlight = (cy: number, w: number, h: number) => {
          ctx.fillStyle = treeHi;
          ctx.beginPath();
          // Smaller crescent on the upper-left of the cluster
          ctx.moveTo(-w * 0.55, cy - h * 0.15);
          ctx.bezierCurveTo(-w * 0.75, cy - h * 0.7, -w * 0.2, cy - h * 0.95, w * 0.05, cy - h * 0.7);
          ctx.bezierCurveTo(-w * 0.15, cy - h * 0.6, -w * 0.35, cy - h * 0.35, -w * 0.55, cy - h * 0.15);
          ctx.closePath();
          ctx.fill();
        };
        drawHighlight(-trunkH - s * 0.05, s * 0.55, s * 0.32);
        drawHighlight(-trunkH - s * 0.32, s * 0.46, s * 0.30);
        drawHighlight(-trunkH - s * 0.58, s * 0.35, s * 0.28);

        // Snowy variant — light dusting of snow on the upper foliage
        if (pal.snowy) {
          ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
          ctx.beginPath();
          ctx.ellipse(0, -trunkH - s * 0.78, s * 0.18, s * 0.10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(-s * 0.15, -trunkH - s * 0.58, s * 0.16, s * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(s * 0.18, -trunkH - s * 0.40, s * 0.15, s * 0.07, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Person-with-umbrella silhouette for rainy conditions — stands on
      // the right side of the horizon, like Apple Weather's character.
      const isRainy = k === 'rain' || k === 'heavyRain' || k === 'thunderstorm' || k === 'drizzle';
      if (isRainy) {
        const fx = W * 0.72;
        const fy = horizonY + 2;
        // Figure height scales with viewport, capped so it doesn't dwarf the scene
        const figH = Math.min(160, Math.max(80, H * 0.17));
        const u = figH / 9; // unit size
        const silColor = 'rgba(14, 26, 42, 0.90)';

        ctx.save();

        // Legs — two tapering strokes
        ctx.strokeStyle = silColor;
        ctx.lineCap = 'round';
        ctx.lineWidth = u * 0.55;
        ctx.beginPath();
        ctx.moveTo(fx - u * 0.25, fy - u * 3.4);
        ctx.quadraticCurveTo(fx - u * 0.4, fy - u * 1.6, fx - u * 0.3, fy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx + u * 0.25, fy - u * 3.4);
        ctx.quadraticCurveTo(fx + u * 0.4, fy - u * 1.6, fx + u * 0.5, fy);
        ctx.stroke();

        // Torso
        ctx.fillStyle = silColor;
        ctx.beginPath();
        ctx.moveTo(fx - u * 0.72, fy - u * 5.8);
        ctx.lineTo(fx + u * 0.72, fy - u * 5.8);
        ctx.lineTo(fx + u * 0.55, fy - u * 3.4);
        ctx.lineTo(fx - u * 0.55, fy - u * 3.4);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(fx, fy - u * 6.6, u * 0.58, 0, Math.PI * 2);
        ctx.fill();

        // Arm raising umbrella (right arm, bent up)
        ctx.strokeStyle = silColor;
        ctx.lineWidth = u * 0.42;
        ctx.beginPath();
        ctx.moveTo(fx + u * 0.65, fy - u * 5.4);
        ctx.quadraticCurveTo(fx + u * 1.4, fy - u * 6.2, fx + u * 1.1, fy - u * 7.4);
        ctx.stroke();

        // Left arm (hanging down naturally)
        ctx.beginPath();
        ctx.moveTo(fx - u * 0.65, fy - u * 5.4);
        ctx.quadraticCurveTo(fx - u * 1.3, fy - u * 4.2, fx - u * 1.0, fy - u * 3.0);
        ctx.stroke();

        // Umbrella handle (vertical stick)
        ctx.lineWidth = u * 0.22;
        ctx.beginPath();
        ctx.moveTo(fx + u * 1.1, fy - u * 7.4);
        ctx.lineTo(fx + u * 1.1, fy - u * 9.2);
        ctx.stroke();

        // Umbrella dome — a smooth arc with a scalloped hem
        const ux = fx + u * 1.1;
        const uy = fy - u * 9.2;
        const ur = u * 2.6;
        ctx.fillStyle = k === 'thunderstorm'
          ? 'rgba(38, 60, 105, 0.94)'
          : 'rgba(42, 90, 148, 0.94)';
        ctx.beginPath();
        ctx.moveTo(ux - ur, uy);
        ctx.bezierCurveTo(ux - ur, uy - ur * 0.75, ux - ur * 0.28, uy - ur, ux, uy - ur * 0.88);
        ctx.bezierCurveTo(ux + ur * 0.28, uy - ur, ux + ur, uy - ur * 0.75, ux + ur, uy);
        // Scalloped hem — five small downward bumps
        const hemSegs = 5;
        for (let si = 0; si < hemSegs; si++) {
          const x0 = ux - ur + (si / hemSegs) * ur * 2;
          const x1 = ux - ur + ((si + 0.5) / hemSegs) * ur * 2;
          const x2 = ux - ur + ((si + 1) / hemSegs) * ur * 2;
          ctx.quadraticCurveTo(x1, uy + u * 0.55, x2, uy);
        }
        ctx.closePath();
        ctx.fill();

        // Umbrella ribs (subtle darker lines)
        ctx.strokeStyle = k === 'thunderstorm' ? 'rgba(25, 45, 85, 0.70)' : 'rgba(28, 68, 118, 0.70)';
        ctx.lineWidth = 0.9;
        for (let ri = 0; ri <= 4; ri++) {
          const ang = Math.PI + (ri / 4) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(ux, uy);
          ctx.lineTo(ux + Math.cos(ang) * ur, uy + Math.sin(ang) * ur * 0.45);
          ctx.stroke();
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

      // Spawn a jumping fish at random intervals (skip when frozen / heavy
      // weather where it'd look out of place).
      if (!pal.frozen && k !== 'thunderstorm' && k !== 'heavyRain') {
        if (now >= nextFishAt && fish.length < 2) {
          // Pick a random spot along the pond surface (avoid the very edges)
          const rel = (Math.random() - 0.5) * 1.4; // -0.7 → 0.7
          const startX = pond.cx + rel * pond.rx * 0.9;
          // Subtle Y offset so the fish appears to come from inside the pond
          const surfaceY = pond.cy - pond.ry * 0.55;
          fish.push({
            startX,
            surfaceY,
            t: 0,
            duration: 1.2 + Math.random() * 0.4,
            apex: 22 + Math.random() * 18,
            dir: Math.random() < 0.5 ? -1 : 1,
          });
          // Schedule the next jump 6-18s out
          nextFishAt = now + 6000 + Math.random() * 12000;
        }
      }

      // Update and draw each active fish
      const fishColor = pal.tree; // matches the silhouette feel
      for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i];
        f.t += sceneDt / f.duration;
        if (f.t >= 1) {
          // Splash back into pond
          ripples.push({ x: f.startX + f.dir * 14, y: f.surfaceY, r: 2, a: 0.95 });
          splashes.push({ x: f.startX + f.dir * 14, y: f.surfaceY, r: 2, a: 0.85 });
          fish.splice(i, 1);
          continue;
        }
        // Parametric arc — y = apex * 4*t*(1-t) (parabola, 0 at endpoints,
        // peak at t=0.5). x slides f.dir * ~28px across.
        const arcY = -f.apex * 4 * f.t * (1 - f.t);
        const arcX = f.dir * 28 * f.t;
        const cx = f.startX + arcX;
        const cy = f.surfaceY + arcY;
        // Tilt: derivative of position. Body angled along velocity.
        const dy = -f.apex * 4 * (1 - 2 * f.t);
        const dx = f.dir * 28;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        // Body: small lens shape
        ctx.fillStyle = fishColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail: triangle behind the body
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-11, -3);
        ctx.lineTo(-11, 3);
        ctx.closePath();
        ctx.fill();
        // Tiny eye
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(3, -0.5, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
        wash.addColorStop(0, 'rgba(45, 42, 165, 0.24)');
        wash.addColorStop(0.4, 'rgba(25, 55, 90, 0.20)');
        wash.addColorStop(0.6, 'rgba(20, 30, 65, 0.18)');
        wash.addColorStop(1, 'rgba(10, 18, 38, 0.10)');
      } else if (k === 'heavyRain' || k === 'rain') {
        wash.addColorStop(0, 'rgba(20, 75, 100, 0.28)');
        wash.addColorStop(0.55, 'rgba(30, 90, 110, 0.16)');
        wash.addColorStop(1, 'rgba(10, 30, 48, 0.08)');
      } else if (k === 'drizzle') {
        wash.addColorStop(0, 'rgba(55, 120, 148, 0.18)');
        wash.addColorStop(1, 'rgba(20, 50, 70, 0.06)');
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

      // Atmospheric rain mist — large translucent radial blobs that drift
      // slowly, simulating wet-air haze and adding perceived depth.
      if (k === 'rain' || k === 'heavyRain' || k === 'thunderstorm' || k === 'drizzle') {
        const mAlpha = k === 'drizzle' ? 0.052 : k === 'heavyRain' || k === 'thunderstorm' ? 0.098 : 0.072;
        const drift = (t / 22000) * W;
        const mistPts: [number, number][] = [
          [(W * 0.25 + drift) % (W * 1.5) - W * 0.25, H * 0.28],
          [(W * 0.70 + drift * 1.4) % (W * 1.5) - W * 0.25, H * 0.62],
          [(W * 0.05 + drift * 0.75) % (W * 1.5) - W * 0.25, H * 0.88],
        ];
        for (const [mx, my] of mistPts) {
          const mg = ctx.createRadialGradient(mx, my, 0, mx, my, W * 0.52);
          mg.addColorStop(0, `rgba(210, 240, 255, ${mAlpha})`);
          mg.addColorStop(1, 'rgba(210, 240, 255, 0)');
          ctx.fillStyle = mg;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Rain — 3-layer depth system. Positions update first (decoupled from
      // draw) so we can batch-draw back-to-front by layer. Near drops (layer 3)
      // get a small bright leading dot for a bead-of-water feel.
      if (rain.length) {
        const isHeavy = k === 'heavyRain' || k === 'thunderstorm';
        const rippleSpawnChance =
          k === 'heavyRain' || k === 'thunderstorm' ? 0.55 :
          k === 'rain' ? 0.35 :
          0.18; // drizzle

        // Position + collision update (separate from draw)
        for (const d of rain) {
          d.y += d.vy * dt;
          d.x += d.vx * dt;
          if (pond) {
            const ddx = (d.x - pond.cx) / pond.rx;
            const ddy = (d.y - pond.cy) / pond.ry;
            if (ddx * ddx + ddy * ddy <= 1 && d.y <= pond.cy) {
              if (Math.random() < rippleSpawnChance) {
                ripples.push({ x: d.x, y: pond.cy + (d.y - pond.cy) * 0.3, r: 0.8, a: 0.6 + Math.random() * 0.25 });
              }
              d.y = -20;
              d.x = Math.random() * (W + 200) - 100;
            }
          }
          if (d.y > H - 4) {
            if (Math.random() < 0.3) splashes.push({ x: d.x, y: H - 6, r: 1, a: 0.6 });
            d.y = -20;
            d.x = Math.random() * (W + 200) - 100;
          }
          if (d.x > W + 50) d.x = -20;
          if (d.x < -50) d.x = W + 20;
        }

        ctx.lineCap = 'round';

        // Layer 1 — far rain: thin, very faint
        ctx.lineWidth = k === 'drizzle' ? 0.52 : isHeavy ? 0.72 : 0.62;
        for (const d of rain) {
          if (d.layer !== 1) continue;
          ctx.globalAlpha = d.a;
          ctx.strokeStyle = 'rgba(205, 238, 255, 1)';
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - (d.vx / d.vy) * d.len, d.y - d.len);
          ctx.stroke();
        }

        // Layer 2 — midground rain
        ctx.lineWidth = k === 'drizzle' ? 0.78 : isHeavy ? 1.08 : 0.90;
        for (const d of rain) {
          if (d.layer !== 2) continue;
          ctx.globalAlpha = d.a;
          ctx.strokeStyle = isHeavy ? 'rgba(200, 232, 255, 1)' : 'rgba(212, 242, 255, 1)';
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - (d.vx / d.vy) * d.len, d.y - d.len);
          ctx.stroke();
        }

        // Layer 3 — foreground rain: wider + bright teardrop leading dot
        const nearW = k === 'drizzle' ? 0.95 : isHeavy ? 1.48 : 1.22;
        ctx.lineWidth = nearW;
        for (const d of rain) {
          if (d.layer !== 3) continue;
          ctx.globalAlpha = d.a;
          ctx.strokeStyle = 'rgba(230, 248, 255, 1)';
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - (d.vx / d.vy) * d.len, d.y - d.len);
          ctx.stroke();
          ctx.fillStyle = `rgba(245, 252, 255, ${d.a * 0.88})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, nearW * 1.15, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Pond ripples
        if (ripples.length) {
          ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
          ctx.lineWidth = 1;
          for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += dt * 28;
            rp.a -= dt * 1.0;
            if (rp.a <= 0) { ripples.splice(i, 1); continue; }
            ctx.globalAlpha = rp.a;
            ctx.beginPath();
            ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        // Ground splashes
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.7)';
        ctx.lineWidth = 1;
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.r += dt * 60;
          s.a -= dt * 1.8;
          if (s.a <= 0) { splashes.splice(i, 1); continue; }
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
