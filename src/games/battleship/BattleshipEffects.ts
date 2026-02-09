import { Container, Graphics } from 'pixi.js';

export class BattleshipEffects {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /** Missile projectile arc from top of screen to target cell */
  playShot(targetX: number, targetY: number, onImpact: () => void): void {
    const startX = targetX + (Math.random() - 0.5) * 80;
    const startY = -40;
    const duration = 550;
    const startTime = performance.now();

    const missile = new Container();
    this.container.addChild(missile);

    // Smoke trail particles
    const trailParticles: { g: Graphics; x: number; y: number; born: number }[] = [];

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Parabolic arc
      const x = startX + (targetX - startX) * t;
      const linearY = startY + (targetY - startY) * t;
      const arcOffset = -100 * 4 * t * (1 - t);
      const y = linearY + arcOffset;

      // Calculate angle of travel for missile rotation
      const nextT = Math.min(t + 0.02, 1);
      const nextX = startX + (targetX - startX) * nextT;
      const nextLinearY = startY + (targetY - startY) * nextT;
      const nextArc = -100 * 4 * nextT * (1 - nextT);
      const nextY = nextLinearY + nextArc;
      const angle = Math.atan2(nextY - y, nextX - x);

      // Draw missile shape
      missile.removeChildren();
      const body = new Graphics();
      // Missile body
      body.moveTo(10, 0);
      body.lineTo(-6, -4);
      body.lineTo(-6, 4);
      body.closePath();
      body.fill({ color: 0x555555 });
      // Nose cone
      body.moveTo(10, 0);
      body.lineTo(14, 0);
      body.stroke({ color: 0xcc0000, width: 2 });
      // Fins
      body.moveTo(-6, -4);
      body.lineTo(-10, -7);
      body.moveTo(-6, 4);
      body.lineTo(-10, 7);
      body.stroke({ color: 0x777777, width: 1.5 });
      // Exhaust glow
      body.circle(-8, 0, 3);
      body.fill({ color: 0xff6600, alpha: 0.8 });
      body.circle(-8, 0, 5);
      body.fill({ color: 0xff4400, alpha: 0.3 });

      body.rotation = angle;
      missile.addChild(body);
      missile.x = x;
      missile.y = y;

      // Spawn trail smoke
      if (t < 0.9 && elapsed % 3 < 2) {
        const smoke = new Graphics();
        smoke.circle(0, 0, 2 + Math.random() * 2);
        smoke.fill({ color: 0x999999, alpha: 0.5 });
        smoke.x = x;
        smoke.y = y;
        this.container.addChildAt(smoke, 0);
        trailParticles.push({ g: smoke, x, y, born: elapsed });
      }

      // Fade old trail
      for (let i = trailParticles.length - 1; i >= 0; i--) {
        const p = trailParticles[i];
        const age = elapsed - p.born;
        p.g.alpha = Math.max(0, 0.4 - age / 400);
        p.g.scale.set(1 + age / 300);
        if (p.g.alpha <= 0) {
          this.container.removeChild(p.g);
          trailParticles.splice(i, 1);
        }
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.container.removeChild(missile);
        for (const p of trailParticles) {
          this.container.removeChild(p.g);
        }
        onImpact();
      }
    };

    requestAnimationFrame(animate);
  }

  /** Water splash with spray droplets for a miss */
  playSplash(x: number, y: number): void {
    const startTime = performance.now();
    const duration = 600;

    // Water column
    const column = new Graphics();
    column.x = x;
    column.y = y;
    this.container.addChild(column);

    // Spray droplets
    const droplets: { g: Graphics; vx: number; vy: number; gravity: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 30 + Math.random() * 50;
      const g = new Graphics();
      g.circle(0, 0, 1.5 + Math.random() * 1.5);
      g.fill({ color: Math.random() > 0.3 ? 0x88ccff : 0xffffff });
      g.x = x;
      g.y = y;
      this.container.addChild(g);
      droplets.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 80 + Math.random() * 40,
      });
    }

    // Expanding rings
    const rings: Graphics[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics();
      ring.x = x;
      ring.y = y;
      this.container.addChild(ring);
      rings.push(ring);
    }

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const dt = elapsed / 1000;

      // Water column rises then falls
      column.clear();
      if (t < 0.4) {
        const h = (t / 0.4) * 25;
        column.rect(-4, -h, 8, h);
        column.fill({ color: 0x88ccff, alpha: 0.6 * (1 - t) });
      }

      // Droplets with gravity
      for (const d of droplets) {
        d.g.x = x + d.vx * dt;
        d.g.y = y + d.vy * dt + 0.5 * d.gravity * dt * dt;
        d.g.alpha = Math.max(0, 1 - t * 1.5);
      }

      // Rings
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ring.clear();
        const delay = i * 0.12;
        const localT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
        if (localT <= 0) continue;
        const radius = 4 + localT * 25;
        const alpha = (1 - localT) * 0.5;
        ring.circle(0, 0, radius);
        ring.stroke({ color: i === 0 ? 0xffffff : 0x88bbff, width: 1.5, alpha });
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.container.removeChild(column);
        for (const d of droplets) this.container.removeChild(d.g);
        for (const r of rings) this.container.removeChild(r);
      }
    };

    requestAnimationFrame(animate);
  }

  /** Fiery explosion with shockwave and debris for a hit */
  playExplosion(x: number, y: number): void {
    const startTime = performance.now();
    const duration = 600;

    // Central fireball
    const fireball = new Graphics();
    this.container.addChild(fireball);

    // Shockwave ring
    const shockwave = new Graphics();
    shockwave.x = x;
    shockwave.y = y;
    this.container.addChild(shockwave);

    // Fire particles
    const particles: { g: Graphics; vx: number; vy: number; life: number; color: number; size: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.4;
      const speed = 30 + Math.random() * 70;
      const g = new Graphics();
      const size = 2 + Math.random() * 4;
      const colors = [0xff2200, 0xff6600, 0xff8800, 0xffaa00, 0xffcc00];
      const color = colors[Math.floor(Math.random() * colors.length)];
      g.circle(0, 0, size);
      g.fill({ color });
      g.x = x;
      g.y = y;
      this.container.addChild(g);
      particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.5 + Math.random() * 0.5,
        color,
        size,
      });
    }

    // Debris (dark chunks)
    const debris: { g: Graphics; vx: number; vy: number; rot: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const g = new Graphics();
      g.rect(-2, -2, 4, 3);
      g.fill({ color: 0x333333 });
      g.x = x;
      g.y = y;
      this.container.addChild(g);
      debris.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        rot: (Math.random() - 0.5) * 10,
      });
    }

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const dt = elapsed / 1000;

      // Fireball: grows then shrinks
      fireball.clear();
      if (t < 0.5) {
        const r = 8 + (t / 0.5) * 18;
        fireball.circle(x, y, r);
        fireball.fill({ color: 0xff6600, alpha: 0.8 * (1 - t * 2) });
        fireball.circle(x, y, r * 0.6);
        fireball.fill({ color: 0xffcc00, alpha: 0.9 * (1 - t * 2) });
      }

      // Shockwave
      shockwave.clear();
      if (t < 0.5) {
        const r = t * 2 * 40;
        shockwave.circle(0, 0, r);
        shockwave.stroke({ color: 0xffaa00, width: 3, alpha: (1 - t * 2) * 0.7 });
      }

      // Fire particles
      for (const p of particles) {
        const localT = t / p.life;
        if (localT > 1) {
          p.g.alpha = 0;
          continue;
        }
        p.g.x = x + p.vx * localT * dt * 60;
        p.g.y = y + p.vy * localT * dt * 60;
        p.g.alpha = 1 - localT;
        p.g.scale.set(1 - localT * 0.5);
      }

      // Debris with gravity
      for (const d of debris) {
        d.g.x = x + d.vx * dt;
        d.g.y = y + d.vy * dt + 0.5 * 120 * dt * dt;
        d.g.rotation += d.rot * dt;
        d.g.alpha = Math.max(0, 1 - t * 1.5);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.container.removeChild(fireball);
        this.container.removeChild(shockwave);
        for (const p of particles) this.container.removeChild(p.g);
        for (const d of debris) this.container.removeChild(d.g);
      }
    };

    requestAnimationFrame(animate);
  }
}
