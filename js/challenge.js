import { CHALLENGES, RATINGS } from './config.js';

const bound = (num, min, max) => Math.max(min, Math.min(max, num));
export const roundScore = (n) => Math.round(bound(n, 0, 10) * 10) / 10;
export const ratingFor = (score) => RATINGS.find((rating) => score >= rating.min);

export function drawRounds(random = Math.random) {
  const pool = [...CHALLENGES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export class Round {
  constructor(spec) {
    this.spec = spec;
    this.time = 0;
    this.peak = 1;
    this.bounces = 0;
    this.motion = 0;
    this.hold = 0;
    this.bestHold = 0;
    this.done = false;
    this.windowStart = null;
  }

  get limit() {
    return this.windowStart === null ? this.spec.duration : this.spec.window;
  }

  get remaining() {
    const end = this.windowStart === null ? this.spec.duration :
      Math.min(this.spec.duration, this.windowStart + this.spec.window);
    return Math.max(0, end - this.time);
  }

  grab(part) {
    if (this.spec.window && this.windowStart === null && part.config.kind === this.spec.part) {
      this.windowStart = this.time;
    }
  }

  tick(dt, active, charm) {
    if (this.done) return null;
    this.time += dt;
    if (active?.config.kind === this.spec.part) this.peak = Math.max(this.peak, active.peak);
    switch (this.spec.id) {
      case 'C3':
        if (charm.speed >= 56) this.motion += dt;
        if (this.motion >= 3) return this.finish(10);
        break;
      case 'C5':
        if (active?.config.kind === 'sleeve' && active.mult >= 1.25 && active.mult <= 1.35) {
          this.hold += dt;
          this.bestHold = Math.max(this.hold, this.bestHold);
          if (this.hold >= 1) return this.finish(10);
        } else {
          this.hold = 0;
        }
        break;
    }
    return this.remaining <= 0 ? this.timeout() : null;
  }

  release(part, peak, mult) {
    if (this.done || part.config.kind !== this.spec.part) return null;
    this.peak = Math.max(this.peak, peak);
    switch (this.spec.id) {
      case 'C1':
        if (this.peak >= 1.04) return this.finish(this.scorePeak(), this.peak > 2.4 ? '拉断' : '');
        break;
      case 'C2':
        if (mult >= 1.5) this.bounces += 1;
        if (this.bounces >= 3) return this.finish(8.5 + 1.5 * this.remaining / 5);
        break;
      case 'C4':
        if (this.peak >= 1.04) return this.finish(this.scorePeak());
        break;
      case 'C6':
        if (this.peak > 1.01) return this.finish(this.scorePeak());
        break;
    }
    return null;
  }

  timeout() {
    switch (this.spec.id) {
      case 'C2': return this.finish(this.bounces / 3 * 8.5);
      case 'C3': return this.finish(this.motion / 3 * 10);
      case 'C5': return this.finish(this.bestHold * 10);
      default: return this.finish(this.scorePeak(), this.spec.id === 'C4' && this.peak < 1.04 ? '没捏动' : '');
    }
  }

  scorePeak() {
    switch (this.spec.id) {
      case 'C1':
        return this.peak > 2.4 ? 0 : 10 - Math.abs(this.peak - 2) * 10;
      case 'C4':
        if (this.peak < 1.04) return 0;
        if (this.peak < 1.05) return 8 + (this.peak - 1.04) * 200;
        return 10 - Math.max(0, this.peak - 1.12) * 100;
      case 'C6':
        return 10 * (1 - (Math.abs(this.peak - 1.15) / .15) ** 1.35);
      default:
        return 0;
    }
  }

  finish(score, status = '') {
    this.done = true;
    return { ...this.spec, score: roundScore(score), status };
  }
}
