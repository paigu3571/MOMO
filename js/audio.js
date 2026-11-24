export class Sound {
  constructor() { this.muted = false; }
  unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      this.context ||= new Audio();
      this.context.resume().catch(() => {});
    } catch {
      this.context = null;
    }
  }
  play(name, energy = 1) {
    if (this.muted || this.context?.state !== 'running') return;
    const cues = {
      start: [[392, 523, .09], [523, 659, .13]],
      success: [[587, 784, .09], [784, 988, .14]],
      fail: [[360, 269, .12], [269, 202, .13]],
      result: [[392, 523, .11], [523, 659, .11], [659, 784, .24]],
      release: [[270 + 110 * energy, 94, .29]],
    };
    let at = this.context.currentTime;
    for (const [from, to, duration] of cues[name]) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = name === 'release' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(from, at);
      osc.frequency.exponentialRampToValueAtTime(to, at + duration);
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(.115, at + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      osc.connect(gain).connect(this.context.destination);
      osc.start(at);
      osc.stop(at + duration + .01);
      at += duration * .68;
    }
  }
}
