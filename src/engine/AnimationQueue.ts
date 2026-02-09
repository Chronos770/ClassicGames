export interface Animation {
  id: string;
  duration: number;
  delay?: number;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  easing?: (t: number) => number;
}

export const Easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t: number) => {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  },
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

export class AnimationQueue {
  private queue: Animation[] = [];
  private running: Animation | null = null;
  private startTime = 0;
  private paused = false;

  add(animation: Animation): void {
    this.queue.push(animation);
    if (!this.running) {
      this.next();
    }
  }

  addParallel(animations: Animation[]): void {
    // Run all animations simultaneously
    for (const anim of animations) {
      this.runAnimation(anim);
    }
  }

  private next(): void {
    if (this.queue.length === 0) {
      this.running = null;
      return;
    }
    const anim = this.queue.shift()!;
    this.runAnimation(anim);
  }

  private runAnimation(anim: Animation): void {
    this.running = anim;
    this.startTime = performance.now();
    anim.onStart?.();

    const tick = () => {
      if (this.paused) {
        requestAnimationFrame(tick);
        return;
      }

      const elapsed = performance.now() - this.startTime - (anim.delay ?? 0);
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = (anim.easing ?? Easings.easeOutCubic)(progress);
      anim.onUpdate?.(eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        anim.onComplete?.();
        if (this.running === anim) {
          this.next();
        }
      }
    };

    requestAnimationFrame(tick);
  }

  clear(): void {
    this.queue = [];
    this.running = null;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  get isPlaying(): boolean {
    return this.running !== null || this.queue.length > 0;
  }
}
