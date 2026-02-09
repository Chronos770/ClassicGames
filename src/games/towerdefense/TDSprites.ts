import { Graphics, Container } from 'pixi.js';
import { TowerType, EnemyType, ENEMY_DEFS, CELL_SIZE } from './rules';

/** Draw a tower sprite using Graphics instead of emoji Text */
export function drawTower(type: TowerType, size: number, level: number): Container {
  const container = new Container();
  const s = size * 0.45;
  const g = new Graphics();

  switch (type) {
    case 'arrow': {
      // Stone base
      g.roundRect(-s * 0.7, -s * 0.3, s * 1.4, s * 1.0, 3);
      g.fill({ color: 0x8a7a6a });
      g.roundRect(-s * 0.7, -s * 0.3, s * 1.4, s * 1.0, 3);
      g.stroke({ color: 0x6a5a4a, width: 1 });
      // Tower turret
      g.roundRect(-s * 0.3, -s * 0.8, s * 0.6, s * 0.6, 2);
      g.fill({ color: 0x9a8a7a });
      g.roundRect(-s * 0.3, -s * 0.8, s * 0.6, s * 0.6, 2);
      g.stroke({ color: 0x6a5a4a, width: 1 });
      // Arrow slot
      g.rect(-s * 0.08, -s * 0.7, s * 0.16, s * 0.3);
      g.fill({ color: 0x333333 });
      // Arrow
      g.moveTo(0, -s * 0.9);
      g.lineTo(s * 0.1, -s * 0.65);
      g.lineTo(-s * 0.1, -s * 0.65);
      g.closePath();
      g.fill({ color: 0x8B4513 });
      break;
    }
    case 'cannon': {
      // Large base
      g.roundRect(-s * 0.8, -s * 0.2, s * 1.6, s * 0.9, 4);
      g.fill({ color: 0x555555 });
      g.roundRect(-s * 0.8, -s * 0.2, s * 1.6, s * 0.9, 4);
      g.stroke({ color: 0x333333, width: 1.5 });
      // Cannon barrel
      g.roundRect(-s * 0.15, -s * 0.9, s * 0.3, s * 0.8, 2);
      g.fill({ color: 0x444444 });
      g.roundRect(-s * 0.15, -s * 0.9, s * 0.3, s * 0.8, 2);
      g.stroke({ color: 0x222222, width: 1 });
      // Barrel opening
      g.circle(0, -s * 0.9, s * 0.18);
      g.fill({ color: 0x222222 });
      // Wheels
      g.circle(-s * 0.45, s * 0.4, s * 0.2);
      g.fill({ color: 0x6a5a4a });
      g.circle(s * 0.45, s * 0.4, s * 0.2);
      g.fill({ color: 0x6a5a4a });
      break;
    }
    case 'ice': {
      // Crystal base
      g.moveTo(0, -s * 0.9);
      g.lineTo(s * 0.5, -s * 0.2);
      g.lineTo(s * 0.3, s * 0.5);
      g.lineTo(-s * 0.3, s * 0.5);
      g.lineTo(-s * 0.5, -s * 0.2);
      g.closePath();
      g.fill({ color: 0x88ccff, alpha: 0.8 });
      g.moveTo(0, -s * 0.9);
      g.lineTo(s * 0.5, -s * 0.2);
      g.lineTo(s * 0.3, s * 0.5);
      g.lineTo(-s * 0.3, s * 0.5);
      g.lineTo(-s * 0.5, -s * 0.2);
      g.closePath();
      g.stroke({ color: 0xaaddff, width: 1 });
      // Inner glow
      g.circle(0, -s * 0.1, s * 0.2);
      g.fill({ color: 0xccefff, alpha: 0.6 });
      // Frost particles
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i) / 3 + Math.PI / 6;
        const px = Math.cos(angle) * s * 0.6;
        const py = -s * 0.2 + Math.sin(angle) * s * 0.4;
        g.circle(px, py, s * 0.06);
        g.fill({ color: 0xffffff, alpha: 0.7 });
      }
      break;
    }
    case 'lightning': {
      // Tesla coil base
      g.roundRect(-s * 0.6, s * 0.0, s * 1.2, s * 0.5, 3);
      g.fill({ color: 0x555566 });
      g.roundRect(-s * 0.6, s * 0.0, s * 1.2, s * 0.5, 3);
      g.stroke({ color: 0x333344, width: 1 });
      // Coil pole
      g.rect(-s * 0.1, -s * 0.7, s * 0.2, s * 0.8);
      g.fill({ color: 0x666677 });
      // Top sphere
      g.circle(0, -s * 0.8, s * 0.25);
      g.fill({ color: 0x8888aa });
      g.circle(0, -s * 0.8, s * 0.25);
      g.stroke({ color: 0xffdd00, width: 1.5, alpha: 0.6 });
      // Electric arcs
      g.moveTo(-s * 0.3, -s * 0.6);
      g.lineTo(-s * 0.15, -s * 0.7);
      g.lineTo(-s * 0.35, -s * 0.8);
      g.stroke({ color: 0xffdd00, width: 1.5, alpha: 0.5 });
      g.moveTo(s * 0.3, -s * 0.6);
      g.lineTo(s * 0.15, -s * 0.75);
      g.lineTo(s * 0.35, -s * 0.85);
      g.stroke({ color: 0xffdd00, width: 1.5, alpha: 0.5 });
      break;
    }
  }

  // Level stars
  if (level > 1) {
    for (let i = 0; i < level - 1; i++) {
      const starX = (i - (level - 2) / 2) * s * 0.4;
      const star = new Graphics();
      star.circle(starX, s * 0.7, s * 0.1);
      star.fill({ color: 0xFFD700 });
      container.addChild(star);
    }
  }

  container.addChild(g);
  return container;
}

/** Draw an enemy sprite using Graphics instead of emoji */
export function drawEnemy(type: EnemyType, size: number): Container {
  const container = new Container();
  const r = size * 0.35;
  const def = ENEMY_DEFS[type];
  const g = new Graphics();

  switch (type) {
    case 'grunt': {
      // Triangle body
      g.moveTo(0, -r);
      g.lineTo(r * 0.8, r * 0.5);
      g.lineTo(-r * 0.8, r * 0.5);
      g.closePath();
      g.fill({ color: def.color });
      g.moveTo(0, -r);
      g.lineTo(r * 0.8, r * 0.5);
      g.lineTo(-r * 0.8, r * 0.5);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1, alpha: 0.3 });
      // Eyes
      g.circle(-r * 0.2, -r * 0.1, r * 0.1);
      g.fill({ color: 0xffffff });
      g.circle(r * 0.2, -r * 0.1, r * 0.1);
      g.fill({ color: 0xffffff });
      g.circle(-r * 0.2, -r * 0.1, r * 0.05);
      g.fill({ color: 0x000000 });
      g.circle(r * 0.2, -r * 0.1, r * 0.05);
      g.fill({ color: 0x000000 });
      break;
    }
    case 'scout': {
      // Sleek diamond shape
      g.moveTo(0, -r);
      g.lineTo(r * 0.6, 0);
      g.lineTo(0, r);
      g.lineTo(-r * 0.6, 0);
      g.closePath();
      g.fill({ color: def.color });
      g.moveTo(0, -r);
      g.lineTo(r * 0.6, 0);
      g.lineTo(0, r);
      g.lineTo(-r * 0.6, 0);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1, alpha: 0.3 });
      // Speed lines
      g.moveTo(-r * 0.4, -r * 0.3);
      g.lineTo(-r * 0.8, -r * 0.3);
      g.stroke({ color: def.color, width: 1, alpha: 0.5 });
      g.moveTo(-r * 0.4, r * 0.3);
      g.lineTo(-r * 0.8, r * 0.3);
      g.stroke({ color: def.color, width: 1, alpha: 0.5 });
      // Eye
      g.circle(r * 0.1, -r * 0.1, r * 0.1);
      g.fill({ color: 0xff0000 });
      break;
    }
    case 'brute': {
      // Heavy square body
      g.roundRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4, 4);
      g.fill({ color: def.color });
      g.roundRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4, 4);
      g.stroke({ color: 0x000000, width: 2, alpha: 0.3 });
      // Armor plates
      g.rect(-r * 0.5, -r * 0.5, r * 1.0, r * 0.3);
      g.fill({ color: 0x000000, alpha: 0.15 });
      g.rect(-r * 0.5, r * 0.2, r * 1.0, r * 0.3);
      g.fill({ color: 0x000000, alpha: 0.15 });
      // Angry eyes
      g.circle(-r * 0.2, -r * 0.1, r * 0.12);
      g.fill({ color: 0xff3333 });
      g.circle(r * 0.2, -r * 0.1, r * 0.12);
      g.fill({ color: 0xff3333 });
      break;
    }
    case 'overlord': {
      // Large pentagon with crown
      const points = 5;
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color: def.color });
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.stroke({ color: 0xaa0000, width: 2 });
      // Crown
      g.moveTo(-r * 0.4, -r * 0.5);
      g.lineTo(-r * 0.2, -r * 0.8);
      g.lineTo(0, -r * 0.55);
      g.lineTo(r * 0.2, -r * 0.8);
      g.lineTo(r * 0.4, -r * 0.5);
      g.stroke({ color: 0xffd700, width: 2 });
      // Eyes
      g.circle(-r * 0.2, 0, r * 0.12);
      g.fill({ color: 0xff0000 });
      g.circle(r * 0.2, 0, r * 0.12);
      g.fill({ color: 0xff0000 });
      break;
    }
  }

  container.addChild(g);
  return container;
}

/** Draw a projectile for a tower type */
export function drawProjectile(type: TowerType): Graphics {
  const g = new Graphics();

  switch (type) {
    case 'arrow':
      // Arrow shape
      g.moveTo(0, -4);
      g.lineTo(2, 0);
      g.lineTo(0, 6);
      g.lineTo(-2, 0);
      g.closePath();
      g.fill({ color: 0x8B4513 });
      break;
    case 'cannon':
      g.circle(0, 0, 5);
      g.fill({ color: 0x333333 });
      g.circle(-2, -2, 3);
      g.fill({ color: 0xFF6600, alpha: 0.5 });
      break;
    case 'ice':
      g.circle(0, 0, 4);
      g.fill({ color: 0x66CCFF, alpha: 0.8 });
      g.circle(0, 0, 6);
      g.stroke({ color: 0xAADDFF, width: 1, alpha: 0.4 });
      break;
    case 'lightning':
      // Bolt shape
      g.moveTo(0, -4);
      g.lineTo(3, 0);
      g.lineTo(0, 1);
      g.lineTo(3, 5);
      g.lineTo(0, 2);
      g.lineTo(-3, 6);
      g.lineTo(0, 1);
      g.lineTo(-3, 0);
      g.closePath();
      g.fill({ color: 0xFFDD00 });
      break;
  }

  return g;
}

/** Tower firing flash effect */
export function createFiringFlash(x: number, y: number, towerType: TowerType): Graphics {
  const flash = new Graphics();
  const color = towerType === 'ice' ? 0x66ccff :
                towerType === 'lightning' ? 0xffdd00 :
                towerType === 'cannon' ? 0xff6600 : 0xffffff;

  flash.circle(x, y, CELL_SIZE * 0.3);
  flash.fill({ color, alpha: 0.6 });

  return flash;
}

/** Enemy death particle burst */
export function createDeathBurst(x: number, y: number, color: number): Container {
  const container = new Container();
  const numParticles = 8;

  for (let i = 0; i < numParticles; i++) {
    const angle = (Math.PI * 2 * i) / numParticles;
    const p = new Graphics();
    p.circle(0, 0, 2 + Math.random() * 2);
    p.fill({ color });
    p.x = x;
    p.y = y;
    container.addChild(p);

    const speed = 30 + Math.random() * 40;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const startTime = performance.now();

    const animate = () => {
      const t = (performance.now() - startTime) / 300;
      if (t >= 1) {
        container.removeChild(p);
        return;
      }
      p.x = x + vx * t;
      p.y = y + vy * t;
      p.alpha = 1 - t;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  return container;
}
