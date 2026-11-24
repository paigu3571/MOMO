import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import { CHEEKS } from './config.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ease = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export class SoftPart {
  constructor(name, rect, config, material, alpha) {
    Object.assign(this, { name, rect, config, alpha, material });
    const [cols, rows] = config.grid;
    const [left, top, width, height] = rect;
    const count = (cols + 1) * (rows + 1);
    this.positions = new Float32Array(count * 3);
    this.offset = new Float32Array(count * 2);
    this.velocity = new Float32Array(count * 2);
    this.fixedWeights = new Float32Array(count);
    this.weights = new Float32Array(count);
    this.control = [0, 0];
    this.controlVelocity = [0, 0];
    this.goal = [0, 0];
    this.cheekWeights = CHEEKS.map(() => new Float32Array(count));
    this.mult = 1;
    this.speed = 0;
    this.peak = 1;
    this.sideProfile = this.makeSideProfile();

    const [rootU, rootV] = config.root;
    const [tipU, tipV] = config.tip;
    let tipCol = Math.round(tipU * cols);
    const tipRow = Math.round(tipV * rows);
    const xAxis = (tipU - rootU) * width;
    const yAxis = (tipV - rootV) * height;
    if (config.side) {
      const profile = this.sideProfile[Math.round(tipRow / rows * (height - 1))];
      tipCol = clamp(Math.round((config.side > 0 ? profile.max : profile.min) / width * cols), 0, cols);
      this.restX = tipCol / cols * width - profile.center;
      this.restY = 0;
    } else {
      this.restX = (tipCol / cols - rootU) * width;
      this.restY = (tipRow / rows - rootV) * height;
    }
    this.tipIndex = tipRow * (cols + 1) + tipCol;
    this.restLength = Math.hypot(this.restX, this.restY);
    const uv = new Float32Array(count * 2);
    const indices = [];
    const norm = Math.hypot(xAxis, yAxis);
    const [axisX, axisY] = config.axis || [xAxis / norm, yAxis / norm];
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        const i = row * (cols + 1) + col;
        const u = col / cols;
        const v = row / rows;
        const localX = left + u * width;
        const localY = top + v * height;
        uv.set([u, 1 - v], i * 2);
        const along = ((u - rootU) * width * axisX + (v - rootV) * height * axisY);
        const alongTip = xAxis * axisX + yAxis * axisY;
        const length = Math.hypot((u - rootU) * width, (v - rootV) * height);
        this.fixedWeights[i] = config.side ? this.sockWeight(localX, localY) :
          ease(Math.max(along / Math.max(25, alongTip), length / norm * .7) / .83);
        for (let c = 0; c < CHEEKS.length; c += 1) {
          const cheek = CHEEKS[c];
          const distance = Math.hypot((localX - cheek.x) / cheek.rx, (localY - cheek.y) / cheek.ry);
          this.cheekWeights[c][i] = (1 - ease(distance)) ** 2;
        }
        if (col < cols && row < rows) {
          const below = i + cols + 1;
          indices.push(i, below, i + 1, i + 1, below, below + 1);
        }
      }
    }
    this.fixedWeights[this.tipIndex] = 1;
    this.weights.set(config.kind === 'face' ? this.cheekWeights[0] : this.fixedWeights);
    this.geometry = new BufferGeometry();
    this.geometry.setIndex(indices);
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(uv, 2));
    this.mesh = new Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.updateGeometry();
  }

  makeSideProfile() {
    if (!this.config.side) return [];
    const [, , width, height] = this.rect;
    return Array.from({ length: height }, (_, row) => {
      let min = width;
      let max = 0;
      for (let col = 0; col < width; col += 1) {
        if (this.alpha[row * width + col] > 102) {
          min = Math.min(min, col);
          max = Math.max(max, col);
        }
      }
      return { min, max, center: (min + max) / 2 };
    });
  }

  sockWeight(x, y) {
    const [left, top, , height] = this.rect;
    const { side, knee } = this.config;
    if (y <= knee) return 0;
    const profile = this.sideProfile[clamp(Math.floor(y - top), 0, height - 1)];
    const half = (profile.max - profile.min) / 2;
    const outward = side * (x - left - profile.center);
    return half > 3 ? ease(outward / half) * ease((y - knee) / 48) *
      ease((top + height - y) / 37) : 0;
  }

  hit(x, y, touch) {
    const [left, top, width, height] = this.rect;
    if (this.config.kind === 'face') {
      return CHEEKS.some((c) => Math.hypot((x - c.x) / c.rx, (y - c.y) / c.ry) <= (touch ? 1.14 : 1));
    }
    if (this.config.side && this.sockWeight(x, y) <= .06) return false;
    const check = (u, v) => {
      const ix = Math.floor(u - left);
      const iy = Math.floor(v - top);
      return ix >= 0 && ix < width && iy >= 0 && iy < height && this.alpha[iy * width + ix] > 76;
    };
    if (check(x, y)) return true;
    const p = touch ? this.config.padding : Math.min(7, this.config.padding || 0);
    if (!(p > 0)) return false;
    for (const distance of [p / 2, p]) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) {
        if (check(x + distance * dx, y + distance * dy)) return true;
      }
    }
    return false;
  }

  grab(x, y) {
    this.dragging = true;
    this.peak = 1;
    this.origin = [x, y];
    this.goal.fill(0);
    if (this.config.kind === 'face') {
      const nearest = Math.abs(x - CHEEKS[0].x) < Math.abs(x - CHEEKS[1].x) ? 0 : 1;
      this.weights.set(this.cheekWeights[nearest]);
    }
  }

  drag(x, y) {
    const cfg = this.config;
    let dx = x - this.origin[0];
    let dy = y - this.origin[1];
    const excess = cfg.maxMult - 1;
    if (cfg.side) {
      dx = Math.max(0, dx * cfg.side);
      this.goal[0] = cfg.side * this.restLength * excess * Math.tanh(dx / cfg.reach / excess);
      this.goal[1] = 0;
      return;
    }
    if (cfg.kind === 'face') {
      const magnitude = Math.hypot(dx, dy);
      const gain = magnitude > 0 ? excess * Math.tanh(magnitude / cfg.reach / excess) * this.restLength / magnitude : 0;
      this.goal[0] = dx * gain;
      this.goal[1] = dy * gain;
      return;
    }
    const gain = this.restLength / cfg.reach;
    dx *= gain;
    dy *= gain;
    const distance = Math.hypot(this.restX + dx, this.restY + dy);
    const stretch = distance / this.restLength - 1;
    const capped = 1 + excess * Math.tanh(stretch / excess);
    const target = this.restLength * capped / Math.max(.01, distance);
    this.goal[0] = (this.restX + dx) * target - this.restX;
    this.goal[1] = (this.restY + dy) * target - this.restY;
  }

  release() {
    this.dragging = false;
    this.goal.fill(0);
    return this.peak;
  }

  step(dt) {
    const cfg = this.config;
    const previous = [...this.control];
    const pull = this.dragging ? Math.max(220, cfg.stiffness * 2.3) : cfg.stiffness;
    const friction = this.dragging ? 22 : cfg.damping;
    for (let axis = 0; axis < 2; axis += 1) {
      this.controlVelocity[axis] += (pull * (this.goal[axis] - this.control[axis]) - friction * this.controlVelocity[axis]) * dt;
      this.control[axis] += this.controlVelocity[axis] * dt;
    }
    if (cfg.side) {
      this.control[0] = cfg.side * clamp(this.control[0] * cfg.side, 0, this.restLength * (cfg.maxMult - 1));
      this.control[1] = 0;
      this.controlVelocity[1] = 0;
    }
    const face = cfg.kind === 'face';
    const max = this.restLength * (face ? cfg.maxMult - 1 : cfg.maxMult);
    const rx = face ? 0 : this.restX;
    const ry = face ? 0 : this.restY;
    const actual = Math.hypot(rx + this.control[0], ry + this.control[1]);
    if (actual > max) {
      this.control[0] = (rx + this.control[0]) * max / actual - rx;
      this.control[1] = (ry + this.control[1]) * max / actual - ry;
    }
    this.speed = Math.hypot(this.control[0] - previous[0], this.control[1] - previous[1]) / dt;
    const distance = Math.hypot(rx + this.control[0], ry + this.control[1]);
    this.mult = clamp((face ? 1 : 0) + distance / this.restLength, 1, cfg.maxMult);
    if (this.dragging) this.peak = Math.max(this.peak, this.mult);
    this.updateMesh(dt);
  }

  updateMesh(dt) {
    const [cols, rows] = this.config.grid;
    const stride = cols + 1;
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        const vertex = row * stride + col;
        const weight = this.weights[vertex];
        for (let axis = 0; axis < 2; axis += 1) {
          const i = vertex * 2 + axis;
          if (weight === 0 || (this.config.side && axis === 1)) {
            this.offset[i] = 0;
            this.velocity[i] = 0;
            continue;
          }
          const here = this.offset[i];
          const neighbors = (col > 0 ? this.offset[i - 2] - here : 0) +
            (col < cols ? this.offset[i + 2] - here : 0) +
            (row > 0 ? this.offset[i - stride * 2] - here : 0) +
            (row < rows ? this.offset[i + stride * 2] - here : 0);
          const goal = this.control[axis] * weight;
          this.velocity[i] += ((goal - here) * 460 + 52 * neighbors * weight -
            this.velocity[i] * 30) * dt;
        }
      }
    }
    const sockLimit = this.restLength * (this.config.maxMult - 1);
    for (let i = 0; i < this.offset.length; i += 1) {
      this.offset[i] += this.velocity[i] * dt;
      if (this.config.side && i % 2 === 0) {
        this.offset[i] = this.config.side * clamp(this.offset[i] * this.config.side, 0, sockLimit * this.weights[i / 2]);
      }
    }
    if (this.config.kind !== 'face') this.offset.set(this.control, this.tipIndex * 2);
    this.material.uniforms.tension.value = (this.mult - 1) / (this.config.maxMult - 1);
    this.updateGeometry();
  }

  updateGeometry() {
    const [left, top, width, height] = this.rect;
    const [cols, rows] = this.config.grid;
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        const i = row * (cols + 1) + col;
        this.positions[i * 3] = left + width * col / cols + this.offset[i * 2];
        this.positions[i * 3 + 1] = -(top + height * row / rows + this.offset[i * 2 + 1]);
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  reset() {
    for (const vector of [this.control, this.controlVelocity, this.goal, this.offset, this.velocity]) vector.fill(0);
    this.mult = 1;
    this.peak = 1;
    this.speed = 0;
    this.dragging = false;
    this.material.uniforms.tension.value = 0;
    this.updateGeometry();
  }
}
