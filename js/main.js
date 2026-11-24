import { QUIPS, CHALLENGES, PARTS } from './config.js';
import { Round, drawRounds, ratingFor, roundScore } from './challenge.js';
import { createStage } from './stage.js';
import { wireInput } from './input.js';
import { exportCard, makeUI } from './ui.js';
import { Sound } from './audio.js';

const el = (id) => document.getElementById(id);
const game = el('game');
const ui = makeUI(game);
const sound = new Sound();
const debug = new URLSearchParams(location.search).get('debug') === '1';

async function run() {
  const stage = await createStage(el('stage'));
  let mode = 'cover';
  let book = [];
  let choices = [];
  let round = null;
  let active = null;
  let average = 0;
  let grade = null;
  let finalComment = '';
  let phaseEnd = 0;
  let releaseAt = 0;
  let lastFrame = performance.now();
  let lastLine = '';
  let clock = 0;

  function quip(kind) {
    const available = QUIPS[kind].filter((line) => line !== lastLine);
    lastLine = available[Math.floor(Math.random() * available.length)];
    return lastLine;
  }

  function setMode(next) {
    cancelInput();
    active = null;
    mode = next;
    phaseEnd = 0;
    releaseAt = 0;
    ui.mode(next);
    stage.setMode(next === 'free' ? 'play' : next);
    stage.face(next === 'cover' ? 'wink' : 'idle');
  }

  function resetMeter() {
    if (mode === 'play') {
      const target = Object.values(PARTS).find((part) => part.kind === round.spec.part);
      ui.meter(1, target.maxMult);
    } else {
      ui.hideMeter();
    }
  }

  function nextRound() {
    setMode('play');
    round = new Round(choices[book.length]);
    ui.round(round.spec, book.length + 1);
    resetMeter();
    ui.score(book.length ? roundScore(book.reduce((sum, item) => sum + item.score, 0) / book.length) : null);
  }

  function startRun(specs = drawRounds()) {
    sound.unlock();
    sound.play('start');
    book = [];
    choices = specs;
    nextRound();
  }

  function showResult() {
    average = roundScore(book.reduce((sum, item) => sum + item.score, 0) / book.length);
    grade = ratingFor(average);
    finalComment = quip(average >= 7.5 ? 'high' : 'low');
    setMode('results');
    stage.face(grade.face);
    ui.results(book, average, grade, finalComment);
    sound.play('result');
  }

  function complete(entry) {
    if (!entry) return;
    book.push(entry);
    phaseEnd = clock + 1.5;
    cancelInput();
    active = null;
    releaseAt = 0;
    const success = entry.score >= 6;
    const comment = quip(success ? 'high' : 'low');
    ui.feedback(entry, comment);
    ui.score(roundScore(book.reduce((sum, item) => sum + item.score, 0) / book.length));
    stage.face(success ? 'smug' : 'annoyed');
    sound.play(success ? 'success' : 'fail');
  }

  const cancelInput = wireInput(stage.canvas, stage, {
    enabled: () => mode === 'free' || (mode === 'play' && !phaseEnd),
    grab(part) {
      active = part;
      releaseAt = 0;
      if (mode === 'play') round.grab(part);
      stage.face('surprised');
      ui.meter(1, part.config.maxMult);
    },
    release(part, peak, cancelled) {
      active = null;
      releaseAt = clock + 1.5;
      if (cancelled) return;
      if (peak > 1.015) {
        sound.play('release', peak);
        if (Math.random() < .4) ui.quip(quip(part.config.kind));
      }
      if (mode === 'play' && !phaseEnd) complete(round.release(part, peak, part.mult));
    },
  });

  el('start').addEventListener('click', () => startRun());
  el('retry').addEventListener('click', () => startRun());
  el('restart').addEventListener('click', () => startRun());
  el('free').addEventListener('click', () => {
    setMode('free');
    ui.free();
    sound.play('start');
  });
  el('save-card').addEventListener('click', () => exportCard(stage, book, average, grade, finalComment));
  el('mute').addEventListener('click', (event) => {
    sound.muted = !sound.muted;
    event.currentTarget.textContent = sound.muted ? '开声音' : '静音';
    event.currentTarget.setAttribute('aria-pressed', String(sound.muted));
    if (!sound.muted) sound.unlock();
  });

  if (debug) {
    ui.debug((id) => {
      const chosen = CHALLENGES.find((spec) => spec.id === id);
      startRun([chosen, ...drawRounds().filter((spec) => spec !== chosen).slice(0, 2)]);
    }, (hidden) => {
      stage.selection.legwear_L.mesh.visible = !hidden;
      stage.selection.legwear_R.mesh.visible = !hidden;
    });
    window.momoDebug = {
      point: (x, y) => stage.screenPoint(x, y),
      hit: (x, y) => stage.hit(x, y, false)?.name,
      state: () => ({ mode, active: active?.name, spec: round?.spec.id, book: [...book], phaseEnd }),
    };
  }

  function frame(now) {
    const elapsed = Math.min(.13, (now - lastFrame) / 1000);
    lastFrame = now;
    clock += elapsed;
    stage.update(elapsed, clock);
    if (active) {
      const ratio = (active.mult - 1) / (active.config.maxMult - 1);
      stage.face(ratio >= .93 ? 'panic' : ratio >= .7 ? 'annoyed' : 'surprised');
      ui.meter(active.mult, active.config.maxMult);
    }
    if (releaseAt && clock >= releaseAt) {
      releaseAt = 0;
      stage.face('idle');
      resetMeter();
    }
    if (mode === 'play') {
      if (!phaseEnd) {
        const entry = round.tick(elapsed, active, stage.selection.charm_peach);
        const id = round.spec.id;
        const detail = id === 'C2' ? round.bounces + ' / 3 次' :
          id === 'C3' ? round.motion.toFixed(1) + ' / 3 秒' :
          id === 'C5' ? round.hold.toFixed(1) + ' / 1 秒' : '';
        ui.time(round.remaining, round.limit, detail);
        complete(entry);
      } else if (clock >= phaseEnd) {
        if (book.length < choices.length) nextRound();
        else showResult();
      }
    }
    if (debug) {
      el('debug-state').textContent = (round?.spec.id || mode) + ' · ' +
        (active ? active.name + ' ×' + active.mult.toFixed(3) : '待机');
    }
    requestAnimationFrame(frame);
  }
  stage.face('wink');
  requestAnimationFrame(frame);
  el('start').disabled = false;
  el('start').textContent = '开始';
}

run().catch((error) => {
  el('cover-status').textContent = '加载场景失败。请刷新，或用支持 WebGL 2 的浏览器打开。';
  el('start').textContent = '场景加载失败';
  console.error(error);
});
