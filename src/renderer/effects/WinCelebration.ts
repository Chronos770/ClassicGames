import { Container, Graphics } from 'pixi.js';

interface Particle {
  graphics: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rotation: number;
}

export class WinCelebration {
  private container: Container;
  private particles: Particle[] = [];
  private animating = false;

  constructor(parent: Container) {
    this.container = new Container();
    parent.addChild(this.container);
  }

  start(centerX: number, centerY: number): void {
    this.animating = true;

    // Create burst of confetti particles
    const colors = [0xffd700, 0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf7dc6f, 0xbb8fce];

    for (let i = 0; i < 60; i++) {
      const g = new Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 6;

      if (Math.random() > 0.5) {
        g.rect(-size / 2, -size / 2, size, size * 1.5);
      } else {
        g.circle(0, 0, size / 2);
      }
      g.fill({ color });

      g.x = centerX;
      g.y = centerY;

      const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 8;

      this.particles.push({
        graphics: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        rotation: Math.random() * 0.2 - 0.1,
      });

      this.container.addChild(g);
    }

    this.animate();
  }

  private animate(): void {
    if (!this.animating) return;

    let alive = false;
    for (const p of this.particles) {
      p.life++;
      if (p.life > p.maxLife) {
        p.graphics.alpha = 0;
        continue;
      }

      alive = true;
      p.vy += 0.15; // gravity
      p.graphics.x += p.vx;
      p.graphics.y += p.vy;
      p.graphics.rotation += p.rotation;
      p.graphics.alpha = 1 - p.life / p.maxLife;
      p.vx *= 0.99;
    }

    if (alive) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.cleanup();
    }
  }

  cleanup(): void {
    this.animating = false;
    this.container.removeChildren();
    this.particles = [];
  }

  destroy(): void {
    this.cleanup();
    this.container.destroy();
  }
}
