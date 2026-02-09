import { Container, Graphics } from 'pixi.js';

export class BattleshipEffects {
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /** Parabolic projectile arc from top of screen to target cell */
  playShot(targetX: number, targetY: number, onImpact: () => void): void {
    const startX = targetX + (Math.random() - 0.5) * 100;
    const startY = -30;
    const peakHeight = -80;
    const duration = 600; // ms
    const startTime = performance.now();

    const projectile = new Graphics();
    projectile.circle(0, 0, 4);
    projectile.fill({ color: 0x444444 });
    // Trail glow
    projectile.circle(0, 0, 6);
    projectile.fill({ color: 0xff6600, alpha: 0.3 });
    this.container.addChild(projectile);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Parabolic arc
      const x = startX + (targetX - startX) * t;
      const linearY = startY + (targetY - startY) * t;
      const arcOffset = peakHeight * 4 * t * (1 - t); // parabola
      const y = linearY + arcOffset;

      projectile.x = x;
      projectile.y = y;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.container.removeChild(projectile);
        onImpact();
      }
    };

    requestAnimationFrame(animate);
  }

  /** Expanding blue-white rings for a miss */
  playSplash(x: number, y: number): void {
    const rings: Graphics[] = [];
    const startTime = performance.now();
    const duration = 500;

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

      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ring.clear();
        const delay = i * 0.15;
        const localT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
        if (localT <= 0) continue;

        const radius = 5 + localT * 20;
        const alpha = (1 - localT) * 0.6;
        const color = i === 0 ? 0xffffff : 0x88bbff;
        ring.circle(0, 0, radius);
        ring.stroke({ color, width: 2, alpha });
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        for (const ring of rings) {
          this.container.removeChild(ring);
        }
      }
    };

    requestAnimationFrame(animate);
  }

  /** Orange/red particle burst for a hit */
  playExplosion(x: number, y: number): void {
    const particles: { g: Graphics; vx: number; vy: number; life: number }[] = [];
    const startTime = performance.now();
    const duration = 400;
    const numParticles = 12;

    for (let i = 0; i < numParticles; i++) {
      const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 60;
      const g = new Graphics();
      const size = 2 + Math.random() * 3;
      const color = Math.random() > 0.5 ? 0xff4400 : 0xff8800;
      g.circle(0, 0, size);
      g.fill({ color });
      g.x = x;
      g.y = y;
      this.container.addChild(g);
      particles.push({
        g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.3,
      });
    }

    // Central flash
    const flash = new Graphics();
    flash.circle(x, y, 15);
    flash.fill({ color: 0xffff00, alpha: 0.8 });
    this.container.addChild(flash);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Flash fades quickly
      flash.alpha = Math.max(0, 1 - t * 3);

      for (const p of particles) {
        const localT = t / p.life;
        if (localT > 1) {
          p.g.alpha = 0;
          continue;
        }
        p.g.x = x + p.vx * localT;
        p.g.y = y + p.vy * localT;
        p.g.alpha = 1 - localT;
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        for (const p of particles) {
          this.container.removeChild(p.g);
        }
        this.container.removeChild(flash);
      }
    };

    requestAnimationFrame(animate);
  }
}
